import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = request.nextUrl

  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
  const sections = searchParams.get('sections')?.split(',') ?? []

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
    const result: Record<string, unknown> = {}

    // 1. 재고 현황 요약 (Stock Summary)
    if (sections.includes('stock_summary')) {
      const { data: products } = await supabase
        .from('products')
        .select('id, is_active')

      const { data: stockSummary } = await supabase
        .from('product_stock_summary')
        .select('product_id, safety_stock, total_normal_stock, total_pending_shortage_stock')

      const totalProducts = products?.filter((p) => p.is_active).length ?? 0
      const lowStockCount =
        stockSummary?.filter(
          (item) =>
            (item.total_normal_stock ?? 0) < (item.safety_stock ?? 0)
        ).length ?? 0

      const totalStockValue = stockSummary?.reduce(
        (sum, item) =>
          sum +
          (item.total_normal_stock ?? 0) +
          (item.total_pending_shortage_stock ?? 0),
        0
      ) ?? 0

      result.stockSummary = {
        totalProducts,
        lowStockCount,
        totalStockQuantity: totalStockValue,
      }
    }

    // 2. 입출고 내역 (Transaction History)
    if (sections.includes('transactions')) {
      let txQuery = supabase
        .from('inventory_transactions')
        .select(
          'type, quantity, total_price, transaction_date, product:products(name, product_code), partner:partners(name)'
        )
        .order('transaction_date', { ascending: false })

      if (dateFrom) txQuery = txQuery.gte('transaction_date', dateFrom)
      if (dateTo) txQuery = txQuery.lte('transaction_date', dateTo)

      const { data: transactions } = await txQuery

      let totalIn = 0
      let totalOut = 0
      let totalInAmount = 0
      let totalOutAmount = 0

      for (const tx of transactions ?? []) {
        if (tx.type === 'in') {
          totalIn += tx.quantity ?? 0
          totalInAmount += tx.total_price ?? 0
        } else {
          totalOut += tx.quantity ?? 0
          totalOutAmount += tx.total_price ?? 0
        }
      }

      result.transactions = {
        totalIn,
        totalOut,
        totalInAmount,
        totalOutAmount,
        count: transactions?.length ?? 0,
        items: (transactions ?? []).slice(0, 50).map((tx) => {
          const product = Array.isArray(tx.product)
            ? tx.product[0]
            : tx.product
          const partner = Array.isArray(tx.partner)
            ? tx.partner[0]
            : tx.partner
          return {
            type: tx.type,
            quantity: tx.quantity,
            total_price: tx.total_price,
            transaction_date: tx.transaction_date,
            product_name: product?.name ?? '',
            product_code: product?.product_code ?? '',
            partner_name: partner?.name ?? '',
          }
        }),
      }
    }

    // 3. 매입/매출 현황 (Purchase/Sales)
    if (sections.includes('finance')) {
      let summaryQuery = supabase
        .from('daily_finance_summary')
        .select('*')
        .order('transaction_date', { ascending: false })

      if (dateFrom) summaryQuery = summaryQuery.gte('transaction_date', dateFrom)
      if (dateTo) summaryQuery = summaryQuery.lte('transaction_date', dateTo)

      const { data: dailySummary } = await summaryQuery

      const totalPurchase =
        dailySummary?.reduce((sum, d) => sum + (d.purchase_total ?? 0), 0) ?? 0
      const totalSales =
        dailySummary?.reduce((sum, d) => sum + (d.sales_total ?? 0), 0) ?? 0

      result.finance = {
        totalPurchase,
        totalSales,
        margin: totalSales - totalPurchase,
        items: dailySummary ?? [],
      }
    }

    // 4. 거래처 현황 (Partner Summary)
    if (sections.includes('partners')) {
      const { data: partners } = await supabase
        .from('partners')
        .select('id, type, is_active')

      const activePartners = partners?.filter((p) => p.is_active) ?? []
      const supplierCount = activePartners.filter(
        (p) => p.type === 'supplier'
      ).length
      const customerCount = activePartners.filter(
        (p) => p.type === 'customer'
      ).length
      const bothCount = activePartners.filter((p) => p.type === 'both').length

      result.partners = {
        total: activePartners.length,
        supplierCount,
        customerCount,
        bothCount,
      }
    }

    // 5. 재고 부족 상품 (Low Stock Items)
    if (sections.includes('low_stock')) {
      const { data: stockSummary } = await supabase
        .from('product_stock_summary')
        .select('product_id, product_code, name, safety_stock, total_normal_stock')

      const lowStockItems =
        stockSummary
          ?.filter(
            (item) =>
              (item.total_normal_stock ?? 0) < (item.safety_stock ?? 0)
          )
          .map((item) => ({
            product_id: item.product_id,
            product_code: item.product_code,
            name: item.name,
            safety_stock: item.safety_stock,
            current_stock: item.total_normal_stock,
            shortage:
              (item.safety_stock ?? 0) - (item.total_normal_stock ?? 0),
          })) ?? []

      result.lowStock = {
        count: lowStockItems.length,
        items: lowStockItems,
      }
    }

    return Response.json(result)
  } catch (err) {
    console.error('Reports GET error:', err)
    return Response.json(
      { error: '보고서 데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
