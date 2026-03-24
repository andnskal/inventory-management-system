'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProductAggregate {
  product_id: string
  product_name: string
  product_code: string
  total_purchase: number
  total_sales: number
  margin: number
  margin_rate: number
}

interface PurchaseRankingProps {
  data: ProductAggregate[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}

export function PurchaseRanking({ data }: PurchaseRankingProps) {
  const sorted = [...data]
    .filter((p) => p.total_purchase > 0)
    .sort((a, b) => b.total_purchase - a.total_purchase)

  const grandTotal = sorted.reduce((sum, p) => sum + p.total_purchase, 0)

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          조회된 데이터가 없습니다.
        </CardContent>
      </Card>
    )
  }

  const maxPurchase = sorted[0]?.total_purchase ?? 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>매입 누계 순위</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">순위</TableHead>
              <TableHead>상품명</TableHead>
              <TableHead className="text-right">매입누계</TableHead>
              <TableHead className="text-right w-24">비중(%)</TableHead>
              <TableHead className="w-48"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((item, index) => {
              const weight =
                grandTotal > 0
                  ? ((item.total_purchase / grandTotal) * 100).toFixed(1)
                  : '0.0'
              const barWidth =
                maxPurchase > 0
                  ? (item.total_purchase / maxPurchase) * 100
                  : 0

              return (
                <TableRow key={item.product_id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{item.product_name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({item.product_code})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.total_purchase)}
                  </TableCell>
                  <TableCell className="text-right">{weight}%</TableCell>
                  <TableCell>
                    <div className="h-4 w-full rounded-full bg-muted">
                      <div
                        className="h-4 rounded-full bg-blue-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
