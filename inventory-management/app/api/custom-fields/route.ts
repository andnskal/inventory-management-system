import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  try {
    const { data: customFields, error } = await supabase
      .from('custom_fields')
      .select('*')
      .order('sort_order')

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ customFields: customFields ?? [] })
  } catch (err) {
    console.error('Custom fields GET error:', err)
    return Response.json({ error: '커스텀 필드를 불러오는데 실패했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
      .insert({
        field_name,
        field_type,
        target_table,
        is_required: is_required ?? false,
        select_options: select_options || null,
        sort_order: sort_order ?? 0,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ field }, { status: 201 })
  } catch (err) {
    console.error('Custom fields POST error:', err)
    return Response.json({ error: '커스텀 필드 등록에 실패했습니다.' }, { status: 500 })
  }
}
