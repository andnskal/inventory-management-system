import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    return Response.json({ error: '관리자만 삭제할 수 있습니다.' }, { status: 403 })
  }

  try {
    const { error } = await supabase
      .from('inventory_transactions')
      .delete()
      .eq('id', id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Inventory DELETE error:', err)
    return Response.json(
      { error: '입출고 내역 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}
