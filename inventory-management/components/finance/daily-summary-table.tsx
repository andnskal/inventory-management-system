'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DailyFinanceSummary } from '@/types'

interface DailySummaryTableProps {
  data: DailyFinanceSummary[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}

export function DailySummaryTable({ data }: DailySummaryTableProps) {
  const totals = data.reduce(
    (acc, row) => ({
      purchase_total: acc.purchase_total + (row.purchase_total ?? 0),
      sales_total: acc.sales_total + (row.sales_total ?? 0),
      margin: acc.margin + (row.margin ?? 0),
    }),
    { purchase_total: 0, sales_total: 0, margin: 0 }
  )

  const totalMarginRate =
    totals.sales_total > 0
      ? ((totals.margin / totals.sales_total) * 100).toFixed(1)
      : '0.0'

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          조회된 데이터가 없습니다.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>일별 매입/매출 집계</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead className="text-right">매입합계</TableHead>
              <TableHead className="text-right">매출합계</TableHead>
              <TableHead className="text-right">마진</TableHead>
              <TableHead className="text-right">마진율(%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const marginRate =
                row.sales_total > 0
                  ? ((row.margin / row.sales_total) * 100).toFixed(1)
                  : '0.0'
              return (
                <TableRow key={row.transaction_date}>
                  <TableCell>{row.transaction_date}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.purchase_total ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.sales_total ?? 0)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${(row.margin ?? 0) < 0 ? 'text-red-600' : ''}`}
                  >
                    {formatCurrency(row.margin ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">{marginRate}%</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="font-bold">
              <TableCell>합계</TableCell>
              <TableCell className="text-right">
                {formatCurrency(totals.purchase_total)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(totals.sales_total)}
              </TableCell>
              <TableCell
                className={`text-right ${totals.margin < 0 ? 'text-red-600' : ''}`}
              >
                {formatCurrency(totals.margin)}
              </TableCell>
              <TableCell className="text-right">{totalMarginRate}%</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  )
}
