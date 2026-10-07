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

// Public: find the invitee(s) by email or name so the shared link can forward to their personal RSVP page
export async function POST(req: NextRequest) {
  const { event_id, email, name } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })
  const supabase = createServiceClient()

  // Name search by first name
  if (typeof name === 'string' && name.trim()) {
    const term = name.trim().toLowerCase()
    const { data: guests } = await supabase.from('invitees')
      .select('first_name, last_name, token')
      .eq('event_id', event_id)
      .order('first_name', { ascending: true })
    const matches = (guests ?? []).filter(g => g.first_name.toLowerCase().includes(term))
    return NextResponse.json({ matches })
  }

  const clean = typeof email === 'string' ? email.trim() : ''
  if (!clean) return NextResponse.json({ error: 'email or name required' }, { status: 400 })

  const { data: matches } = await supabase.from('invitees')
    .select('first_name, last_name, token')
    .eq('event_id', event_id)
    .ilike('email', clean.replace(/[\\%_]/g, '\\$&'))
    .order('first_name', { ascending: true })

  return NextResponse.json({ matches: matches ?? [] })
}
