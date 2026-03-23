import { createClient } from '@/lib/supabase/server'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { InventoryTrendChart } from '@/components/dashboard/inventory-trend-chart'
import type { InventoryTrendData } from '@/components/dashboard/inventory-trend-chart'
import { FinanceTrendChart } from '@/components/dashboard/finance-trend-chart'
import type { FinanceTrendData } from '@/components/dashboard/finance-trend-chart'
import { LowStockTable } from '@/components/dashboard/low-stock-table'
import { StaleStockTable } from '@/components/dashboard/stale-stock-table'
import type { StaleStockItem } from '@/components/dashboard/stale-stock-table'
import type { ProductStockSummary, DailyFinanceSummary } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. 전체 상품 수
  const { count: totalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // 2. 재고 요약 (product_stock_summary 뷰)
  let stockSummary: ProductStockSummary[] = []
  try {
    const { data } = await supabase
      .from('product_stock_summary')
      .select('*')
    stockSummary = (data ?? []) as ProductStockSummary[]
  } catch {
    // 뷰가 없을 수 있음
  }

  // 재고 부족 상품 필터
  const lowStockItems = stockSummary.filter(
    (item) => item.total_normal_stock < item.safety_stock
  )

  // 3. 매입/매출 요약 (daily_finance_summary 뷰)
  let financeSummary: DailyFinanceSummary[] = []
  try {
    const { data } = await supabase
      .from('daily_finance_summary')
      .select('*')
      .order('transaction_date', { ascending: true })
    financeSummary = (data ?? []) as DailyFinanceSummary[]
  } catch {
    // 뷰가 없을 수 있음
  }

  // 총 매입액, 총 매출액 계산
  const totalPurchase = financeSummary.reduce(
    (sum, item) => sum + (item.purchase_total ?? 0),
    0
  )
  const totalSales = financeSummary.reduce(
    (sum, item) => sum + (item.sales_total ?? 0),
    0
  )

  // 4. 입출고 수량 추이 (주별 집계)
  let inventoryTrendData: InventoryTrendData[] = []
  try {
    const { data: transactions } = await supabase
      .from('inventory_transactions')
      .select('transaction_date, type, quantity')
      .order('transaction_date', { ascending: true })

    if (transactions && transactions.length > 0) {
      // 주별로 집계
      const weeklyMap = new Map<string, { in_qty: number; out_qty: number }>()

      for (const tx of transactions) {
        const d = new Date(tx.transaction_date)
        // 주의 시작일 (월요일 기준)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        const weekStart = new Date(d.setDate(diff))
        const key = `${(weekStart.getMonth() + 1).toString().padStart(2, '0')}.${weekStart.getDate().toString().padStart(2, '0')}`

        if (!weeklyMap.has(key)) {
          weeklyMap.set(key, { in_qty: 0, out_qty: 0 })
        }
        const entry = weeklyMap.get(key)!
        if (tx.type === 'in') {
          entry.in_qty += tx.quantity
        } else {
          entry.out_qty += tx.quantity
        }
      }

      inventoryTrendData = Array.from(weeklyMap.entries()).map(
        ([date, vals]) => ({
          date,
          in_qty: vals.in_qty,
          out_qty: vals.out_qty,
        })
      )
    }
  } catch {
    // 테이블이 없을 수 있음
  }

  // 5. 매입/매출 추이 차트 데이터 (주별 집계)
  const financeTrendData: FinanceTrendData[] = []
  if (financeSummary.length > 0) {
    const weeklyFinanceMap = new Map<
      string,
      { purchase: number; sales: number }
    >()

    for (const item of financeSummary) {
      const d = new Date(item.transaction_date)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const weekStart = new Date(d.setDate(diff))
      const key = `${(weekStart.getMonth() + 1).toString().padStart(2, '0')}.${weekStart.getDate().toString().padStart(2, '0')}`

      if (!weeklyFinanceMap.has(key)) {
        weeklyFinanceMap.set(key, { purchase: 0, sales: 0 })
      }
      const entry = weeklyFinanceMap.get(key)!
      entry.purchase += item.purchase_total ?? 0
      entry.sales += item.sales_total ?? 0
    }

    for (const [date, vals] of weeklyFinanceMap) {
      financeTrendData.push({
        date,
        purchase: vals.purchase,
        sales: vals.sales,
      })
    }
  }

  // 6. 장기 미출고 상품 (30일 이상 출고 없는 상품)
  const STALE_DAYS_THRESHOLD = 30
  let staleStockData: StaleStockItem[] = []
  try {
    // 재고가 있는 상품의 마지막 출고일 조회
    const { data: productsWithStock } = await supabase
      .from('product_stock_summary')
      .select('product_id, product_code, name, total_normal_stock')
      .gt('total_normal_stock', 0)

    if (productsWithStock && productsWithStock.length > 0) {
      const now = new Date()

      for (const product of productsWithStock) {
        const { data: lastOut } = await supabase
          .from('inventory_transactions')
          .select('transaction_date')
          .eq('product_id', product.product_id)
          .eq('type', 'out')
          .order('transaction_date', { ascending: false })
          .limit(1)

        const lastOutDate =
          lastOut && lastOut.length > 0 ? lastOut[0].transaction_date : null
        const daysSince = lastOutDate
          ? Math.floor(
              (now.getTime() - new Date(lastOutDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 999 // 출고 이력이 없으면 큰 값

        if (daysSince >= STALE_DAYS_THRESHOLD) {
          staleStockData.push({
            product_id: product.product_id,
            product_code: product.product_code,
            name: product.name,
            total_normal_stock: product.total_normal_stock,
            last_out_date: lastOutDate,
            days_since: daysSince,
          })
        }
      }

      // 경과일수 기준 내림차순 정렬
      staleStockData.sort((a, b) => b.days_since - a.days_since)
    }
  } catch {
    // 테이블/뷰가 없을 수 있음
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="mt-1 text-muted-foreground">
          재고 현황을 한눈에 확인하세요.
        </p>
      </div>

      {/* 요약 카드 */}
      <SummaryCards
        totalProducts={totalProducts ?? 0}
        lowStockCount={lowStockItems.length}
        totalPurchase={totalPurchase}
        totalSales={totalSales}
      />

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InventoryTrendChart data={inventoryTrendData} />
        <FinanceTrendChart data={financeTrendData} />
      </div>

      {/* 테이블 영역 */}
      <LowStockTable data={lowStockItems} />
      <StaleStockTable data={staleStockData} />
    </div>
  )
}
