import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = request.nextUrl

  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''

  // Check auth
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
    // Fetch daily finance summary
    let summaryQuery = supabase
      .from('daily_finance_summary')
      .select('*')
      .order('transaction_date', { ascending: false })

    if (dateFrom) {
      summaryQuery = summaryQuery.gte('transaction_date', dateFrom)
    }
    if (dateTo) {
      summaryQuery = summaryQuery.lte('transaction_date', dateTo)
    }

    const { data: dailySummary, error: summaryError } = await summaryQuery

    if (summaryError) {
      console.error('Daily summary error:', summaryError)
    }

    // Fetch per-product aggregated data for ranking and margin
    let txQuery = supabase
      .from('inventory_transactions')
      .select('type, product_id, quantity, unit_price, total_price, transaction_date, product:products(id, name, product_code)')

    if (dateFrom) {
      txQuery = txQuery.gte('transaction_date', dateFrom)
    }
    if (dateTo) {
      txQuery = txQuery.lte('transaction_date', dateTo)
    }

    const { data: transactions, error: txError } = await txQuery

    if (txError) {
      console.error('Transactions error:', txError)
    }

    // Aggregate per-product data
    const productMap = new Map<string, {
      product_id: string
      product_name: string
      product_code: string
      total_purchase: number
      total_sales: number
    }>()

    for (const tx of (transactions ?? [])) {
      const rawProduct = tx.product
      const product = (Array.isArray(rawProduct) ? rawProduct[0] : rawProduct) as { id: string; name: string; product_code: string } | null
      if (!product) continue

      const existing = productMap.get(product.id) ?? {
        product_id: product.id,
        product_name: product.name,
        product_code: product.product_code,
        total_purchase: 0,
        total_sales: 0,
      }

      if (tx.type === 'in') {
        existing.total_purchase += tx.total_price ?? 0
      } else {
        existing.total_sales += tx.total_price ?? 0
      }

      productMap.set(product.id, existing)
    }

    const productAggregates = Array.from(productMap.values()).map((p) => ({
      ...p,
      margin: p.total_sales - p.total_purchase,
      margin_rate: p.total_sales > 0
        ? ((p.total_sales - p.total_purchase) / p.total_sales) * 100
        : 0,
    }))

    return Response.json({
      dailySummary: dailySummary ?? [],
      productAggregates,
    })
  } catch (err) {
    console.error('Finance GET error:', err)
    return Response.json({ error: '매입/매출 데이터를 불러오는데 실패했습니다.' }, { status: 500 })
  }
}
