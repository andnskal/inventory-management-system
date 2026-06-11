import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, isAuthError } from '@/lib/api/auth'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const auth = await requireRole(supabase, ['admin'])
  if (isAuthError(auth)) return auth

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
