'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, Download, Upload, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { ProductFilters } from './product-filters'
import { ProductTable } from './product-table'
import { ProductFormDialog } from './product-form-dialog'
import { ExcelUploadDialog } from './excel-upload-dialog'
import { exportToExcel } from '@/lib/excel'
import type { Product, Category, CustomField } from '@/types'

interface ProductsPageClientProps {
  products: Product[]
  total: number
  page: number
  pageSize: number
  categories: Category[]
  customFields: CustomField[]
}

export function ProductsPageClient({
  products,
  total,
  page,
  pageSize,
  categories,
  customFields,
}: ProductsPageClientProps) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  const handleCreate = () => {
    setFormMode('create')
    setEditProduct(null)
    setFormOpen(true)
  }

  const handleEdit = (product: Product) => {
    setFormMode('edit')
    setEditProduct(product)
    setFormOpen(true)
  }

  const handleDelete = async (product: Product) => {
    if (!confirm(`"${product.name}" 상품을 삭제하시겠습니까?`)) return

    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '삭제에 실패했습니다.')
        return
      }
      toast.success('상품이 삭제되었습니다.')
      handleRefresh()
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleExcelDownload = () => {
    if (products.length === 0) {
      toast.error('다운로드할 데이터가 없습니다.')
      return
    }

    const rows = products.flatMap((product) => {
      const options = (product.options ?? []).filter((o) => o.is_active)
      const stocks = product.stock ?? []

      if (options.length > 0) {
        return options.map((opt) => {
          const optStocks = stocks.filter((s) => s.option_id === opt.id)
          const normal = optStocks.reduce((sum, s) => sum + (s.normal_stock ?? 0), 0)
          const pending = optStocks.reduce(
            (sum, s) => sum + (s.pending_shortage_stock ?? 0),
            0
          )
          return {
            '상품코드': product.product_code,
            '상품명': product.name,
            '옵션명': opt.option_name,
            '정상재고': normal,
            '작업대기부속부족': pending,
          }
        })
      }

      const normal = stocks.reduce((sum, s) => sum + (s.normal_stock ?? 0), 0)
      const pending = stocks.reduce(
        (sum, s) => sum + (s.pending_shortage_stock ?? 0),
        0
      )
      return [
        {
          '상품코드': product.product_code,
          '상품명': product.name,
          '옵션명': '',
          '정상재고': normal,
          '작업대기부속부족': pending,
        },
      ]
    })

    exportToExcel(rows, `상품목록_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('엑셀 파일이 다운로드되었습니다.')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">상품 관리</h1>
          <p className="mt-1 text-muted-foreground">
            상품 목록을 조회하고 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" />
            엑셀 업로드
          </Button>
          <Button variant="outline" size="sm" onClick={handleExcelDownload}>
            <Download className="size-4" />
            엑셀 다운로드
          </Button>
          <Button variant="outline" size="sm" disabled>
            <FileText className="size-4" />
            PDF 다운로드
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={deleteLoading}>
            <Plus className="size-4" />
            상품 등록
          </Button>
        </div>
      </div>

      <ProductFilters categories={categories} />

      <ProductTable
        products={products}
        total={total}
        page={page}
        pageSize={pageSize}
        customFields={customFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        product={editProduct}
        categories={categories}
        customFields={customFields}
        onSuccess={handleRefresh}
      />

      <ExcelUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
