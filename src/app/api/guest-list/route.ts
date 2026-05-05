import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const event_id = new URL(req.url).searchParams.get('event_id')
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const supabase = createServiceClient()

  const [{ data: event }, { data: guests }] = await Promise.all([
    supabase.from('events').select('title').eq('id', event_id).single(),
    supabase.from('invitees')
      .select('first_name, last_name, response')
      .eq('event_id', event_id)
      .or('response.eq.yes,response.is.null')
      .order('last_name', { ascending: true, nullsFirst: false })
      .order('first_name', { ascending: true }),
  ])

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const attending = (guests || []).filter(g => g.response === 'yes')
  const pending   = (guests || []).filter(g => !g.response)

  return NextResponse.json({ event, attending, pending })
}
