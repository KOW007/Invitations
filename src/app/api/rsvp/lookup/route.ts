import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public: event info for the shared RSVP link
export async function GET(req: NextRequest) {
  const event_id = new URL(req.url).searchParams.get('event_id')
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: event } = await supabase.from('events')
    .select('title, subtitle, image_path')
    .eq('id', event_id).single()
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  return NextResponse.json({ event })
}

// Public: find the invitee(s) for an email so the shared link can forward to their personal RSVP page
export async function POST(req: NextRequest) {
  const { event_id, email } = await req.json()
  const clean = typeof email === 'string' ? email.trim() : ''
  if (!event_id || !clean) return NextResponse.json({ error: 'event_id and email required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: matches } = await supabase.from('invitees')
    .select('first_name, last_name, token')
    .eq('event_id', event_id)
    .ilike('email', clean.replace(/[\\%_]/g, '\\$&'))
    .order('first_name', { ascending: true })

  return NextResponse.json({ matches: matches ?? [] })
}
