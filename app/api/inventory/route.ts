import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = request.nextUrl

  const type = searchParams.get('type') ?? ''
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
  const productSearch = searchParams.get('product') ?? ''
  const partnerId = searchParams.get('partner_id') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10)

  try {
    let query = supabase
      .from('inventory_transactions')
      .select(
        '*, product:products(id, name, product_code), option:product_options(id, option_name), location:storage_locations(id, name), partner:partners(id, name), creator:users(id, name)',
        { count: 'exact' }
      )
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('transaction_date', dateTo)
    }

    if (partnerId) {
      query = query.eq('partner_id', partnerId)
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: transactions, error, count } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Post-filter by product search (name/code) since we can't do nested ilike in select
    let filtered = transactions ?? []
    if (productSearch) {
      const lower = productSearch.toLowerCase()
      filtered = filtered.filter((t) => {
        const p = t.product as { name?: string; product_code?: string } | null
        if (!p) return false
        return (
          (p.name?.toLowerCase().includes(lower) ?? false) ||
          (p.product_code?.toLowerCase().includes(lower) ?? false)
        )
      })
    }

    // Fetch supporting data for forms
    const { data: products } = await supabase
      .from('products')
      .select('id, name, product_code, options:product_options(id, option_name, is_active)')
      .eq('is_active', true)
      .order('name')

    const { data: partners } = await supabase
      .from('partners')
      .select('id, name, type')
      .eq('is_active', true)
      .order('name')

    const { data: locations } = await supabase
      .from('storage_locations')
      .select('id, name')
      .order('sort_order')

    return Response.json({
      transactions: filtered,
      total: productSearch ? filtered.length : (count ?? 0),
      page,
      pageSize,
      products: products ?? [],
      partners: partners ?? [],
      locations: locations ?? [],
    })
  } catch (err) {
    console.error('Inventory GET error:', err)
    return Response.json(
      { error: '입출고 내역을 불러오는데 실패했습니다.' },
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

  // Any authenticated user can create transactions
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return Response.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      transaction_date,
      type,
      product_id,
      option_id,
      location_id,
      partner_id,
      stock_type,
      quantity,
      unit_price,
      notes,
    } = body

    if (!transaction_date || !type || !product_id || !location_id || !partner_id) {
      return Response.json(
        { error: '필수 항목을 모두 입력해주세요.' },
        { status: 400 }
      )
    }

    if (!quantity || quantity <= 0) {
      return Response.json(
        { error: '수량은 1 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    const total_price = (quantity ?? 0) * (unit_price ?? 0)

    const { data: transaction, error } = await supabase
      .from('inventory_transactions')
      .insert({
        transaction_date,
        type,
        product_id,
        option_id: option_id || null,
        location_id,
        partner_id,
        stock_type: stock_type || 'normal',
        quantity,
        unit_price: unit_price ?? 0,
        total_price,
        notes: notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ transaction }, { status: 201 })
  } catch (err) {
    console.error('Inventory POST error:', err)
    return Response.json(
      { error: '입출고 등록에 실패했습니다.' },
      { status: 500 }
    )
  }
}
