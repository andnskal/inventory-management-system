import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle } from 'lucide-react'
import type { ProductStockSummary } from '@/types'

interface LowStockTableProps {
  data: ProductStockSummary[]
}

export function LowStockTable({ data }: LowStockTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          재고 부족 알림
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            데이터가 없습니다
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품코드</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead className="text-right">현재재고</TableHead>
                <TableHead className="text-right">안전재고</TableHead>
                <TableHead className="text-right">부족수량</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const shortage = item.safety_stock - item.total_normal_stock
                return (
                  <TableRow key={item.product_id}>
                    <TableCell className="font-mono text-sm">
                      {item.product_code}
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.total_normal_stock.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.safety_stock.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {shortage > 0 ? `-${shortage.toLocaleString()}` : '0'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
