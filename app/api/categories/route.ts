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
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ categories: categories ?? [] })
  } catch (err) {
    console.error('Categories GET error:', err)
    return Response.json({ error: '카테고리를 불러오는데 실패했습니다.' }, { status: 500 })
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
    const { name, parent_id, depth, sort_order } = body

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        name,
        parent_id: parent_id || null,
        depth: depth ?? 0,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ category }, { status: 201 })
  } catch (err) {
    console.error('Categories POST error:', err)
    return Response.json({ error: '카테고리 등록에 실패했습니다.' }, { status: 500 })
  }
}
