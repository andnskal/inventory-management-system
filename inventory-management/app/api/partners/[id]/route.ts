import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, isAuthError } from '@/lib/api/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const auth = await requireRole(supabase, ['admin', 'manager'])
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const { name, type, contact_name, phone, email, address, notes } = body

    if (!name?.trim()) {
      return Response.json(
        { error: '거래처명을 입력해주세요.' },
        { status: 400 }
      )
    }

    const { data: partner, error } = await supabase
      .from('partners')
      .update({
        name: name.trim(),
        type,
        contact_name: contact_name || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ partner })
  } catch (err) {
    console.error('Partners PUT error:', err)
    return Response.json(
      { error: '거래처 수정에 실패했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const auth = await requireRole(supabase, ['admin', 'manager'])
  if (isAuthError(auth)) return auth

  try {
    const { error } = await supabase
      .from('partners')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Partners DELETE error:', err)
    return Response.json(
      { error: '거래처 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}
