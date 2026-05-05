import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createServiceClient } from '@/lib/supabase/server'
import { sendReminder } from '@/lib/email'
import type { Event, Invitee } from '@/lib/types'

export async function POST(req: NextRequest) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event_id } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const db = createServiceClient()

  const { data: event } = await db.from('events').select('*').eq('id', event_id).single()
  if (!event) return NextResponse.json({ error: 'event not found' }, { status: 404 })
  if (event.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: invitees } = await db.from('invitees').select('*')
    .eq('event_id', event_id)
    .not('email', 'is', null)
    .not('invited_at', 'is', null)
    .is('response', null)
    .is('reminder1_sent_at', null)

  const results = { sent: 0, failed: [] as string[] }

  for (const invitee of (invitees ?? []) as Invitee[]) {
    try {
      await sendReminder(event as Event, invitee)
      await db.from('invitees').update({ reminder1_sent_at: new Date().toISOString() }).eq('id', invitee.id)
      results.sent++
      await new Promise(r => setTimeout(r, 150))
    } catch {
      results.failed.push(`${invitee.first_name} ${invitee.last_name || ''}`.trim())
    }
  }

  return NextResponse.json(results)
}
