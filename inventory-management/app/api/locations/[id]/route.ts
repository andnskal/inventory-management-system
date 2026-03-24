import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return Response.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description, sort_order } = body

    const { data: location, error } = await supabase
      .from('storage_locations')
      .update({
        name,
        description: description || null,
        sort_order: sort_order ?? 0,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ location })
  } catch (err) {
    console.error('Locations PUT error:', err)
    return Response.json({ error: '보관 위치 수정에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return Response.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  try {
    const { error } = await supabase
      .from('storage_locations')
      .delete()
      .eq('id', id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Locations DELETE error:', err)
    return Response.json({ error: '보관 위치 삭제에 실패했습니다.' }, { status: 500 })
  }
}
