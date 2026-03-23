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

interface MarginAnalysisProps {
  data: ProductAggregate[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}

export function MarginAnalysis({ data }: MarginAnalysisProps) {
  const sorted = [...data].sort((a, b) => b.margin_rate - a.margin_rate)

  if (sorted.length === 0) {
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
        <CardTitle>마진율 분석</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>상품명</TableHead>
              <TableHead className="text-right">총매입</TableHead>
              <TableHead className="text-right">총매출</TableHead>
              <TableHead className="text-right">마진</TableHead>
              <TableHead className="text-right">마진율(%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((item) => {
              const isNegative = item.margin < 0
              return (
                <TableRow key={item.product_id}>
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
                  <TableCell className="text-right">
                    {formatCurrency(item.total_sales)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${isNegative ? 'text-red-600' : ''}`}
                  >
                    {formatCurrency(item.margin)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${isNegative ? 'text-red-600' : ''}`}
                  >
                    {item.margin_rate.toFixed(1)}%
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
