import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function parseCSV(text: string): { first_name: string; last_name: string; email: string }[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const rawHeaders = lines[0]
    .split(',')
    .map(h => h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_'))

  const col = (...candidates: string[]) => rawHeaders.find(h => candidates.includes(h)) ?? null

  const firstCol = col('first_name', 'firstname', 'first', 'name')
  const lastCol  = col('last_name', 'lastname', 'last', 'surname')
  const emailCol = col('email', 'email_address', 'emailaddress')

  if (!firstCol) return []

  const clean = (v?: string) => (v ?? '').trim().replace(/^"|"$/g, '').trim()

  return lines.slice(1).map(line => {
    const fields = line.split(',')
    const get = (c: string | null) => c ? clean(fields[rawHeaders.indexOf(c)]) : ''
    return { first_name: get(firstCol), last_name: get(lastCol), email: get(emailCol) }
  }).filter(r => r.first_name)
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file     = form.get('file') as File | null
  const event_id = form.get('event_id') as string | null
  const replace  = form.get('replace') === 'true'

  if (!file || !event_id)
    return NextResponse.json({ error: 'file and event_id required' }, { status: 400 })

  const rows = parseCSV(await file.text())
  if (!rows.length)
    return NextResponse.json({ error: 'No valid rows. Ensure CSV has a first_name (or name) column.' }, { status: 400 })

  if (replace) {
    await supabase.from('invitees').delete().eq('event_id', event_id)
  }

  const { error } = await supabase.from('invitees').insert(
    rows.map(r => ({
      event_id,
      first_name: r.first_name,
      last_name: r.last_name || null,
      email: r.email || null,
    }))
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: rows.length })
}
