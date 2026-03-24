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
    const { field_name, field_type, target_table, is_required, select_options, sort_order } = body

    const { data: field, error } = await supabase
      .from('custom_fields')
      .update({
        field_name,
        field_type,
        target_table,
        is_required: is_required ?? false,
        select_options: select_options || null,
        sort_order: sort_order ?? 0,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ field })
  } catch (err) {
    console.error('Custom fields PUT error:', err)
    return Response.json({ error: '커스텀 필드 수정에 실패했습니다.' }, { status: 500 })
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
    // Delete associated field values first
    await supabase
      .from('custom_field_values')
      .delete()
      .eq('field_id', id)

    const { error } = await supabase
      .from('custom_fields')
      .delete()
      .eq('id', id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Custom fields DELETE error:', err)
    return Response.json({ error: '커스텀 필드 삭제에 실패했습니다.' }, { status: 500 })
  }
}
