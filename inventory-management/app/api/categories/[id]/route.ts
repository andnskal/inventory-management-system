import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, isAuthError } from '@/lib/api/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const auth = await requireRole(supabase, ['admin'])
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const { name, parent_id, depth, sort_order } = body

    const { data: category, error } = await supabase
      .from('categories')
      .update({
        name,
        parent_id: parent_id || null,
        depth: depth ?? 0,
        sort_order: sort_order ?? 0,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ category })
  } catch (err) {
    console.error('Categories PUT error:', err)
    return Response.json({ error: '카테고리 수정에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const auth = await requireRole(supabase, ['admin'])
  if (isAuthError(auth)) return auth

  try {
    // Check for child categories
    const { data: children } = await supabase
      .from('categories')
      .select('id')
      .eq('parent_id', id)

    if (children && children.length > 0) {
      return Response.json(
        { error: '하위 카테고리가 있어 삭제할 수 없습니다.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Categories DELETE error:', err)
    return Response.json({ error: '카테고리 삭제에 실패했습니다.' }, { status: 500 })
  }
}
