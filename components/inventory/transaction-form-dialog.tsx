'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Partner, StorageLocation } from '@/types'

interface ProductWithOptions {
  id: string
  name: string
  product_code: string
  options: { id: string; option_name: string; is_active: boolean }[]
}

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'in' | 'out'
  products: ProductWithOptions[]
  partners: (Partner & { type: string })[]
  locations: StorageLocation[]
  onSuccess: () => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  type,
  products,
  partners,
  locations,
  onSuccess,
}: TransactionFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [transactionDate, setTransactionDate] = useState('')
  const [productId, setProductId] = useState('')
  const [optionId, setOptionId] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [stockType, setStockType] = useState<string>('normal')
  const [quantity, setQuantity] = useState<number>(0)
  const [unitPrice, setUnitPrice] = useState<number>(0)
  const [notes, setNotes] = useState('')

  // Filter options based on selected product
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  )

  const activeOptions = useMemo(
    () => (selectedProduct?.options ?? []).filter((o) => o.is_active),
    [selectedProduct]
  )

  // Filter partners based on transaction type
  const filteredPartners = useMemo(() => {
    if (type === 'in') {
      return partners.filter((p) => p.type === 'supplier' || p.type === 'both')
    }
    return partners.filter((p) => p.type === 'customer' || p.type === 'both')
  }, [partners, type])

  const totalPrice = quantity * unitPrice

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10)
      setTransactionDate(today)
      setProductId('')
      setOptionId('')
      setPartnerId('')
      setLocationId('')
      setStockType('normal')
      setQuantity(0)
      setUnitPrice(0)
      setNotes('')
    }
  }, [open])

  // Reset option when product changes
  useEffect(() => {
    setOptionId('')
  }, [productId])

  const handleSubmit = async () => {
    if (!transactionDate) {
      toast.error('일자를 입력해주세요.')
      return
    }
    if (!productId) {
      toast.error('상품을 선택해주세요.')
      return
    }
    if (!partnerId) {
      toast.error('거래처를 선택해주세요.')
      return
    }
    if (!locationId) {
      toast.error('보관위치를 선택해주세요.')
      return
    }
    if (!quantity || quantity <= 0) {
      toast.error('수량은 1 이상이어야 합니다.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        transaction_date: transactionDate,
        type,
        product_id: productId,
        option_id: optionId || null,
        partner_id: partnerId,
        location_id: locationId,
        stock_type: stockType,
        quantity,
        unit_price: unitPrice,
        notes: notes.trim() || null,
      }

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '등록에 실패했습니다.')
        return
      }

      toast.success(type === 'in' ? '입고가 등록되었습니다.' : '출고가 등록되었습니다.')
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('등록 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === 'in' ? '입고 등록' : '출고 등록'}
          </DialogTitle>
          <DialogDescription>
            {type === 'in'
              ? '입고 정보를 입력하세요.'
              : '출고 정보를 입력하세요.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="transaction_date">일자 *</Label>
            <Input
              id="transaction_date"
              type="date"
              value={transactionDate}
              onChange={(e) =>
                setTransactionDate((e.target as HTMLInputElement).value)
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>상품 *</Label>
              <Select value={productId || '__none__'} onValueChange={(val) => setProductId(val === '__none__' ? '' : (val ?? ''))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="상품 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">상품 선택</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      [{p.product_code}] {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>옵션</Label>
              <Select
                value={optionId || '__none__'}
                onValueChange={(val) => setOptionId(val === '__none__' ? '' : (val ?? ''))}
                disabled={activeOptions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={activeOptions.length === 0 ? '옵션 없음' : '옵션 선택'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">선택 안함</SelectItem>
                  {activeOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.option_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>거래처 *</Label>
              <Select value={partnerId || '__none__'} onValueChange={(val) => setPartnerId(val === '__none__' ? '' : (val ?? ''))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="거래처 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">거래처 선택</SelectItem>
                  {filteredPartners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>보관위치 *</Label>
              <Select value={locationId || '__none__'} onValueChange={(val) => setLocationId(val === '__none__' ? '' : (val ?? ''))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="보관위치 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">보관위치 선택</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>재고유형</Label>
            <Select value={stockType} onValueChange={(val) => setStockType(val ?? 'normal')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">정상재고</SelectItem>
                <SelectItem value="pending_shortage">작업대기부속부족</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">수량 *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity || ''}
                onChange={(e) =>
                  setQuantity(
                    parseInt((e.target as HTMLInputElement).value) || 0
                  )
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit_price">단가</Label>
              <Input
                id="unit_price"
                type="number"
                min={0}
                value={unitPrice || ''}
                onChange={(e) =>
                  setUnitPrice(
                    parseInt((e.target as HTMLInputElement).value) || 0
                  )
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>합계</Label>
              <Input
                value={formatCurrency(totalPrice)}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">비고</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
              placeholder="비고 입력"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '등록 중...' : '등록'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
