import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FinancePageClient } from '@/components/finance/finance-page-client'
import type { DailyFinanceSummary } from '@/types'

export default async function FinancePage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    redirect('/')
  }

  // Fetch initial data (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const dateFrom = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: dailySummary } = await supabase
    .from('daily_finance_summary')
    .select('*')
    .gte('transaction_date', dateFrom)
    .order('transaction_date', { ascending: false })

  // Fetch per-product aggregated data
  const { data: transactions } = await supabase
    .from('inventory_transactions')
    .select(
      'type, product_id, quantity, unit_price, total_price, transaction_date, product:products(id, name, product_code)'
    )
    .gte('transaction_date', dateFrom)

  // Aggregate per-product data
  const productMap = new Map<
    string,
    {
      product_id: string
      product_name: string
      product_code: string
      total_purchase: number
      total_sales: number
    }
  >()

  for (const tx of transactions ?? []) {
    const rawProduct = tx.product
    const product = Array.isArray(rawProduct) ? rawProduct[0] : rawProduct
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
    margin_rate:
      p.total_sales > 0
        ? ((p.total_sales - p.total_purchase) / p.total_sales) * 100
        : 0,
  }))

  return (
    <FinancePageClient
      initialDailySummary={(dailySummary ?? []) as DailyFinanceSummary[]}
      initialProductAggregates={productAggregates}
    />
  )
}
