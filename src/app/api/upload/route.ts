import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })

  const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = await file.arrayBuffer()

  const supabase = createServiceClient()
  const { error } = await supabase.storage
    .from('event-images')
    .upload(filename, Buffer.from(bytes), {
      contentType: file.type || `image/${ext}`,
      upsert: false,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('event-images')
    .getPublicUrl(filename)

  return NextResponse.json({ path: publicUrl })
}
