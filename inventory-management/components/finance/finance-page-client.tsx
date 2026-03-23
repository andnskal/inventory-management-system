'use client'

import { useState, useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { DailySummaryTable } from './daily-summary-table'
import { PurchaseRanking } from './purchase-ranking'
import { MarginAnalysis } from './margin-analysis'
import type { DailyFinanceSummary } from '@/types'

interface ProductAggregate {
  product_id: string
  product_name: string
  product_code: string
  total_purchase: number
  total_sales: number
  margin: number
  margin_rate: number
}

interface FinancePageClientProps {
  initialDailySummary: DailyFinanceSummary[]
  initialProductAggregates: ProductAggregate[]
}

export function FinancePageClient({
  initialDailySummary,
  initialProductAggregates,
}: FinancePageClientProps) {
  const [dailySummary, setDailySummary] = useState(initialDailySummary)
  const [productAggregates, setProductAggregates] = useState(initialProductAggregates)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const res = await fetch(`/api/finance?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '조회에 실패했습니다.')
        return
      }

      setDailySummary(data.dailySummary)
      setProductAggregates(data.productAggregates)
    } catch {
      toast.error('조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  const handleExcelDownload = useCallback(() => {
    // Build CSV content
    const headers = ['날짜', '매입합계', '매출합계', '마진', '마진율(%)']
    const rows = dailySummary.map((row) => [
      row.transaction_date,
      row.purchase_total,
      row.sales_total,
      row.margin,
      row.sales_total > 0
        ? ((row.margin / row.sales_total) * 100).toFixed(1)
        : '0',
    ])

    const BOM = '\uFEFF'
    const csvContent =
      BOM +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `매입매출_집계_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Excel(CSV) 파일이 다운로드되었습니다.')
  }, [dailySummary])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">매입/매출</h1>
          <p className="mt-1 text-muted-foreground">
            매입/매출 내역을 집계하고 분석합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExcelDownload}>
            <Download className="size-4" />
            Excel 다운로드
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled
            title="준비 중입니다."
          >
            <Download className="size-4" />
            PDF 다운로드
          </Button>
        </div>
      </div>

      {/* Date range filter */}
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="date_from">시작일</Label>
          <Input
            id="date_from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="date_to">종료일</Label>
          <Input
            id="date_to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-44"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? '조회 중...' : '조회'}
        </Button>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">일별 집계</TabsTrigger>
          <TabsTrigger value="ranking">매입 누계 순위</TabsTrigger>
          <TabsTrigger value="margin">마진율 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <DailySummaryTable data={dailySummary} />
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <PurchaseRanking data={productAggregates} />
        </TabsContent>

        <TabsContent value="margin" className="mt-4">
          <MarginAnalysis data={productAggregates} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
