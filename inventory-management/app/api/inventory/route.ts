import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePagination, sanitizeSearchTerm } from '@/lib/api/validation'
import { requireRole, isAuthError } from '@/lib/api/auth'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = request.nextUrl

  const type = searchParams.get('type') ?? ''
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
  const productSearch = searchParams.get('product') ?? ''
  const partnerId = searchParams.get('partner_id') ?? ''
  const { page, pageSize } = parsePagination(
    searchParams.get('page'),
    searchParams.get('pageSize')
  )

  try {
    // 상품명/코드 검색은 DB 레벨에서 적용해야 페이지네이션·total이 정확하다(리뷰 #21).
    // 매칭 상품 ID를 먼저 구해 .in()으로 거래를 필터한다(현재 페이지 후필터 금지).
    let productIds: string[] | null = null
    if (productSearch) {
      const safe = sanitizeSearchTerm(productSearch)
      if (safe) {
        const { data: matched, error: matchErr } = await supabase
          .from('products')
          .select('id')
          .or(`name.ilike.%${safe}%,product_code.ilike.%${safe}%`)
        if (matchErr) {
          return Response.json({ error: matchErr.message }, { status: 500 })
        }
        productIds = (matched ?? []).map((p) => p.id)
      } else {
        productIds = []
      }
    }

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

    // 상품 검색이 있으면 매칭 상품으로 한정(없으면 빈 결과)
    if (productIds !== null) {
      query = query.in('product_id', productIds)
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: transactions, error, count } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
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
      transactions: transactions ?? [],
      total: count ?? 0,
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

  const auth = await requireRole(supabase)
  if (isAuthError(auth)) return auth

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
        created_by: auth.userId,
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
