import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createServiceClient } from '@/lib/supabase/server'
import { sendInvitation, sendReminder, sendDayOfReminder } from '@/lib/email'
import type { Event, Invitee } from '@/lib/types'

export async function POST(req: NextRequest) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event_id, email, type } = await req.json()
  if (!event_id || !email || !type)
    return NextResponse.json({ error: 'event_id, email, and type required' }, { status: 400 })

  const db = createServiceClient()

  const { data: event } = await db.from('events').select('*').eq('id', event_id).single()
  if (!event) return NextResponse.json({ error: 'event not found' }, { status: 404 })
  if (event.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Remove any leftover test records for this event before creating a fresh one
  await db.from('invitees')
    .delete()
    .eq('event_id', event_id)
    .eq('first_name', 'Test')
    .eq('last_name', 'Guest')

  // Insert a temporary invitee so the RSVP link works — no invited_at so it
  // doesn't appear in the "Remind Non-Responders" count
  const { data: tempInvitee, error: insertErr } = await db
    .from('invitees')
    .insert({
      event_id,
      first_name: 'Test',
      last_name: 'Guest',
      email,
      response: type === 'day-of' ? 'yes' : null,
    })
    .select()
    .single()

  if (insertErr || !tempInvitee)
    return NextResponse.json({ error: insertErr?.message ?? 'Could not create test record' }, { status: 500 })

  try {
    if (type === 'invitation')    await sendInvitation(event as Event, tempInvitee as Invitee)
    else if (type === 'reminder') await sendReminder(event as Event, tempInvitee as Invitee)
    else if (type === 'day-of')   await sendDayOfReminder(event as Event, tempInvitee as Invitee)
    else {
      await db.from('invitees').delete().eq('id', tempInvitee.id)
      return NextResponse.json({ error: 'type must be invitation, reminder, or day-of' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  } finally {
    // Clean up the temporary record after a delay so the link stays usable for a few minutes
    setTimeout(() => {
      db.from('invitees').delete().eq('id', tempInvitee.id).then(() => {})
    }, 10 * 60 * 1000) // 10 minutes
  }
}
