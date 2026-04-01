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
import { Clock } from 'lucide-react'

export interface StaleStockItem {
  product_id: string
  product_code: string
  name: string
  total_normal_stock: number
  last_out_date: string | null
  days_since: number
}

interface StaleStockTableProps {
  data: StaleStockItem[]
}

export function StaleStockTable({ data }: StaleStockTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          장기 미출고 상품
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
                <TableHead className="text-right">보유수량</TableHead>
                <TableHead>마지막출고</TableHead>
                <TableHead className="text-right">경과일수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.product_id}>
                  <TableCell className="font-mono text-sm">
                    {item.product_code}
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">
                    {item.total_normal_stock.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {item.last_out_date
                      ? new Date(item.last_out_date).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })
                      : '출고 이력 없음'}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-orange-600">
                    {item.days_since}일
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
