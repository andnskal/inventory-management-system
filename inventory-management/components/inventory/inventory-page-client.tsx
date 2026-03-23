'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { TransactionTable } from './transaction-table'
import { TransactionFilters } from './transaction-filters'
import { TransactionFormDialog } from './transaction-form-dialog'
import type { InventoryTransaction, Partner, StorageLocation } from '@/types'

interface ProductWithOptions {
  id: string
  name: string
  product_code: string
  options: { id: string; option_name: string; is_active: boolean }[]
}

interface InventoryPageClientProps {
  transactions: InventoryTransaction[]
  total: number
  page: number
  pageSize: number
  products: ProductWithOptions[]
  partners: (Partner & { type: string })[]
  locations: StorageLocation[]
}

export function InventoryPageClient({
  transactions,
  total,
  page,
  pageSize,
  products,
  partners,
  locations,
}: InventoryPageClientProps) {
  const router = useRouter()
  const [inFormOpen, setInFormOpen] = useState(false)
  const [outFormOpen, setOutFormOpen] = useState(false)

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  const handleDelete = async (id: string) => {
    if (!confirm('이 입출고 내역을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '삭제에 실패했습니다.')
        return
      }
      toast.success('입출고 내역이 삭제되었습니다.')
      handleRefresh()
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">입출고 관리</h1>
          <p className="mt-1 text-muted-foreground">
            입출고 내역을 조회하고 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setInFormOpen(true)}
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            <Plus className="size-4" />
            입고 등록
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOutFormOpen(true)}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Plus className="size-4" />
            출고 등록
          </Button>
        </div>
      </div>

      <TransactionFilters partners={partners} />

      <TransactionTable
        transactions={transactions}
        total={total}
        page={page}
        pageSize={pageSize}
        onDelete={handleDelete}
      />

      <TransactionFormDialog
        open={inFormOpen}
        onOpenChange={setInFormOpen}
        type="in"
        products={products}
        partners={partners}
        locations={locations}
        onSuccess={handleRefresh}
      />

      <TransactionFormDialog
        open={outFormOpen}
        onOpenChange={setOutFormOpen}
        type="out"
        products={products}
        partners={partners}
        locations={locations}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
