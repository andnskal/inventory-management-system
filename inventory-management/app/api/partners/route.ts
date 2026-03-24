import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = request.nextUrl

  const search = searchParams.get('search') ?? ''
  const type = searchParams.get('type') ?? ''

  try {
    let query = supabase
      .from('partners')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,contact_name.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    if (type && type !== 'all') {
      if (type === 'supplier') {
        query = query.in('type', ['supplier', 'both'])
      } else if (type === 'customer') {
        query = query.in('type', ['customer', 'both'])
      } else {
        query = query.eq('type', type)
      }
    }

    const { data: partners, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ partners: partners ?? [] })
  } catch (err) {
    console.error('Partners GET error:', err)
    return Response.json(
      { error: '거래처 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    )
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

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return Response.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, type, contact_name, phone, email, address, notes } = body

    if (!name?.trim()) {
      return Response.json(
        { error: '거래처명을 입력해주세요.' },
        { status: 400 }
      )
    }

    if (!type) {
      return Response.json(
        { error: '거래처 유형을 선택해주세요.' },
        { status: 400 }
      )
    }

    const { data: partner, error } = await supabase
      .from('partners')
      .insert({
        name: name.trim(),
        type,
        contact_name: contact_name || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ partner }, { status: 201 })
  } catch (err) {
    console.error('Partners POST error:', err)
    return Response.json(
      { error: '거래처 등록에 실패했습니다.' },
      { status: 500 }
    )
  }
}
