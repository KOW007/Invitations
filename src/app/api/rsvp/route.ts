import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: invitee, error: invErr } = await supabase
    .from('invitees')
    .select('*')
    .eq('token', token)
    .single()

  if (invErr || !invitee) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

  const { data: event, error: evErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', invitee.event_id)
    .single()

  if (evErr || !event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  return NextResponse.json({ invitee, event })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, response, message, rsvp_answer_1, rsvp_answer_2 } = body

  if (!token || !response)
    return NextResponse.json({ error: 'token and response required' }, { status: 400 })
  if (response !== 'yes' && response !== 'no')
    return NextResponse.json({ error: 'response must be yes or no' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: invitee, error } = await supabase
    .from('invitees')
    .update({
      response,
      message: message?.trim() || null,
      rsvp_answer_1: rsvp_answer_1?.trim() || null,
      rsvp_answer_2: rsvp_answer_2?.trim() || null,
      responded_at: new Date().toISOString(),
    })
    .eq('token', token)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invitee })
}
