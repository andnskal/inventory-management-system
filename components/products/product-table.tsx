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
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Product, CustomField } from '@/types'

interface ProductTableProps {
  products: Product[]
  total: number
  page: number
  pageSize: number
  customFields: CustomField[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ProductTable({
  products,
  total,
  page,
  pageSize,
  customFields,
  onEdit,
  onDelete,
}: ProductTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.ceil(total / pageSize)

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    startTransition(() => {
      router.push(`/products?${params.toString()}`)
    })
  }

  const getStockTotals = (product: Product) => {
    const stocks = product.stock ?? []
    const normalStock = stocks.reduce((sum, s) => sum + (s.normal_stock ?? 0), 0)
    const pendingShortage = stocks.reduce(
      (sum, s) => sum + (s.pending_shortage_stock ?? 0),
      0
    )
    return { normalStock, pendingShortage }
  }

  const getCustomFieldValue = (product: Product, fieldId: string) => {
    const cfv = (product.custom_field_values ?? []).find(
      (v) => v.field_id === fieldId
    )
    return cfv?.value ?? '-'
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>상품코드</TableHead>
              <TableHead>상품명</TableHead>
              <TableHead>옵션명</TableHead>
              <TableHead className="text-right">정상재고</TableHead>
              <TableHead className="text-right">작업대기부속부족</TableHead>
              {customFields.map((cf) => (
                <TableHead key={cf.id}>{cf.field_name}</TableHead>
              ))}
              <TableHead className="text-center">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5 + customFields.length + 1}
                  className="h-24 text-center text-muted-foreground"
                >
                  등록된 상품이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const options = (product.options ?? []).filter((o) => o.is_active)
                const { normalStock, pendingShortage } = getStockTotals(product)
                const isLowStock = normalStock < (product.safety_stock ?? 0)

                // If product has options, render a row per option; otherwise one row
                if (options.length > 0) {
                  return options.map((option, idx) => {
                    const optStocks = (product.stock ?? []).filter(
                      (s) => s.option_id === option.id
                    )
                    const optNormal = optStocks.reduce(
                      (sum, s) => sum + (s.normal_stock ?? 0),
                      0
                    )
                    const optPending = optStocks.reduce(
                      (sum, s) => sum + (s.pending_shortage_stock ?? 0),
                      0
                    )
                    const optSafetyStock = option.safety_stock ?? product.safety_stock ?? 0
                    const optIsLow = optNormal < optSafetyStock

                    return (
                      <TableRow key={`${product.id}-${option.id}`}>
                        {idx === 0 && (
                          <>
                            <TableCell rowSpan={options.length}>
                              <Badge variant="outline">{product.product_code}</Badge>
                            </TableCell>
                            <TableCell rowSpan={options.length}>
                              {product.name}
                            </TableCell>
                          </>
                        )}
                        <TableCell>{option.option_name}</TableCell>
                        <TableCell
                          className={`text-right ${
                            optIsLow ? 'text-red-600 font-bold' : ''
                          }`}
                        >
                          {optNormal.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {optPending.toLocaleString()}
                        </TableCell>
                        {idx === 0 &&
                          customFields.map((cf) => (
                            <TableCell key={cf.id} rowSpan={options.length}>
                              {getCustomFieldValue(product, cf.id)}
                            </TableCell>
                          ))}
                        {idx === 0 && (
                          <TableCell
                            rowSpan={options.length}
                            className="text-center"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => onEdit(product)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => onDelete(product)}
                              >
                                <Trash2 className="size-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })
                }

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Badge variant="outline">{product.product_code}</Badge>
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell
                      className={`text-right ${
                        isLowStock ? 'text-red-600 font-bold' : ''
                      }`}
                    >
                      {normalStock.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {pendingShortage.toLocaleString()}
                    </TableCell>
                    {customFields.map((cf) => (
                      <TableCell key={cf.id}>
                        {getCustomFieldValue(product, cf.id)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onEdit(product)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onDelete(product)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
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
