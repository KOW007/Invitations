import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isValidDetailsKey } from '@/lib/share'

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const event_id = params.get('event_id')
  const key = params.get('key')
  if (!event_id || !key) return NextResponse.json({ error: 'Invalid link' }, { status: 400 })
  if (!isValidDetailsKey(event_id, key)) return NextResponse.json({ error: 'Invalid link' }, { status: 403 })

  const supabase = createServiceClient()

  const [{ data: event }, { data: guests }] = await Promise.all([
    supabase.from('events').select('title, rsvp_question_1, rsvp_question_2').eq('id', event_id).single(),
    supabase.from('invitees')
      .select('first_name, last_name, response, rsvp_answer_1, rsvp_answer_2, message, responded_at')
      .eq('event_id', event_id)
      .order('first_name', { ascending: true }),
  ])

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const all = guests || []
  return NextResponse.json({
    event,
    attending: all.filter(g => g.response === 'yes'),
    declined:  all.filter(g => g.response === 'no'),
    pending:   all.filter(g => !g.response),
  })
}
