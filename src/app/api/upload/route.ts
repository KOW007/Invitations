import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
    return NextResponse.json({ error: 'Only image files allowed' }, { status: 400 })

  const userDir = path.join(process.cwd(), 'public', 'uploads', user.id)
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true })

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  fs.writeFileSync(path.join(userDir, filename), Buffer.from(await file.arrayBuffer()))

  return NextResponse.json({ path: `/uploads/${user.id}/${filename}` })
}
