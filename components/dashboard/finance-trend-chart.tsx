'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface FinanceTrendData {
  date: string
  purchase: number
  sales: number
}

interface FinanceTrendChartProps {
  data: FinanceTrendData[]
}

function formatYAxis(value: number): string {
  return `₩${(value / 10000).toFixed(0)}만`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatTooltipValue = (value: any): string => {
  return `₩${Number(value).toLocaleString()}`
}

export function FinanceTrendChart({ data }: FinanceTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>매입/매출 현황 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>매입/매출 현황 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis tickFormatter={formatYAxis} fontSize={12} />
            <Tooltip formatter={formatTooltipValue} />
            <Legend />
            <Bar dataKey="purchase" name="매입" fill="#f97316" />
            <Bar dataKey="sales" name="매출" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
