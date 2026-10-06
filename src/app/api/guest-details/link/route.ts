import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { detailsKey } from '@/lib/share'

// Returns the private RSVP details link for an event — owner only
export async function GET(req: NextRequest) {
  const event_id = new URL(req.url).searchParams.get('event_id')
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  // RLS limits this to the signed-in user's own events
  const supabase = await createSupabaseServerClient()
  const { data: event } = await supabase.from('events').select('id').eq('id', event_id).single()
  if (!event) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ url: `/guests/${event_id}/details?key=${detailsKey(event_id)}` })
}
