'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { InventoryTransaction } from '@/types'

interface TransactionTableProps {
  transactions: InventoryTransaction[]
  total: number
  page: number
  pageSize: number
  onDelete: (id: string) => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}

export function TransactionTable({
  transactions,
  total,
  page,
  pageSize,
  onDelete,
}: TransactionTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.ceil(total / pageSize)

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    startTransition(() => {
      router.push(`/inventory?${params.toString()}`)
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>일자</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>상품명</TableHead>
              <TableHead>옵션</TableHead>
              <TableHead>거래처</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead className="text-right">단가</TableHead>
              <TableHead className="text-right">합계</TableHead>
              <TableHead>등록자</TableHead>
              <TableHead className="text-center">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-muted-foreground"
                >
                  입출고 내역이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap">
                    {tx.transaction_date}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        tx.type === 'in'
                          ? 'bg-green-100 text-green-800 hover:bg-green-100'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                      }
                    >
                      {tx.type === 'in' ? '입고' : '출고'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tx.product?.name ?? '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tx.option?.option_name ?? '-'}
                  </TableCell>
                  <TableCell>{tx.partner?.name ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    {tx.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(tx.unit_price)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(tx.total_price)}
                  </TableCell>
                  <TableCell>{tx.creator?.name ?? '-'}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onDelete(tx.id)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            전체 {total}건 중 {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, total)}건
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1 || isPending}
              onClick={() => goToPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="sm"
                  disabled={isPending}
                  onClick={() => goToPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages || isPending}
              onClick={() => goToPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
