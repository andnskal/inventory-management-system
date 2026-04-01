'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Product, Category, CustomField } from '@/types'

interface OptionRow {
  option_name: string
  sku: string
}

interface CustomFieldValueRow {
  field_id: string
  value: string
}

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  product?: Product | null
  categories: Category[]
  customFields: CustomField[]
  onSuccess: () => void
}

const UNIT_OPTIONS = ['개', 'EA', 'SET', 'BOX', 'KG', 'M', 'L', 'ROLL']

export function ProductFormDialog({
  open,
  onOpenChange,
  mode,
  product,
  categories,
  customFields,
  onSuccess,
}: ProductFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [productCode, setProductCode] = useState('')
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [unit, setUnit] = useState('개')
  const [safetyStock, setSafetyStock] = useState(0)
  const [purchasePrice, setPurchasePrice] = useState(0)
  const [sellingPrice, setSellingPrice] = useState(0)
  const [options, setOptions] = useState<OptionRow[]>([])
  const [cfValues, setCfValues] = useState<CustomFieldValueRow[]>([])

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && product) {
        setProductCode(product.product_code)
        setName(product.name)
        setCategoryId(product.category_id ?? '')
        setUnit(product.unit || '개')
        setSafetyStock(product.safety_stock ?? 0)
        setPurchasePrice(product.purchase_price ?? 0)
        setSellingPrice(product.selling_price ?? 0)
        setOptions(
          (product.options ?? [])
            .filter((o) => o.is_active)
            .map((o) => ({
              option_name: o.option_name,
              sku: o.sku ?? '',
            }))
        )
        setCfValues(
          customFields.map((cf) => {
            const existing = (product.custom_field_values ?? []).find(
              (v) => v.field_id === cf.id
            )
            return {
              field_id: cf.id,
              value: existing?.value ?? '',
            }
          })
        )
      } else {
        setProductCode('')
        setName('')
        setCategoryId('')
        setUnit('개')
        setSafetyStock(0)
        setPurchasePrice(0)
        setSellingPrice(0)
        setOptions([])
        setCfValues(
          customFields.map((cf) => ({
            field_id: cf.id,
            value: '',
          }))
        )
      }
    }
  }, [open, mode, product, customFields])

  const addOption = () => {
    setOptions([...options, { option_name: '', sku: '' }])
  }

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const updateOption = (index: number, field: keyof OptionRow, value: string) => {
    const updated = [...options]
    updated[index] = { ...updated[index], [field]: value }
    setOptions(updated)
  }

  const updateCfValue = (fieldId: string, value: string) => {
    setCfValues((prev) =>
      prev.map((v) => (v.field_id === fieldId ? { ...v, value } : v))
    )
  }

  const handleSubmit = async () => {
    if (!productCode.trim()) {
      toast.error('상품코드를 입력해주세요.')
      return
    }
    if (!name.trim()) {
      toast.error('상품명을 입력해주세요.')
      return
    }

    // Validate required custom fields
    for (const cf of customFields) {
      if (cf.is_required) {
        const val = cfValues.find((v) => v.field_id === cf.id)
        if (!val?.value) {
          toast.error(`${cf.field_name}을(를) 입력해주세요.`)
          return
        }
      }
    }

    setLoading(true)
    try {
      const payload = {
        product_code: productCode.trim(),
        name: name.trim(),
        category_id: categoryId || null,
        unit,
        safety_stock: safetyStock,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        options: options.filter((o) => o.option_name.trim()),
        custom_field_values: cfValues,
      }

      const url =
        mode === 'edit' && product
          ? `/api/products/${product.id}`
          : '/api/products'
      const method = mode === 'edit' ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '저장에 실패했습니다.')
        return
      }

      toast.success(mode === 'create' ? '상품이 등록되었습니다.' : '상품이 수정되었습니다.')
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '상품 등록' : '상품 수정'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? '새로운 상품 정보를 입력하세요.'
              : '상품 정보를 수정하세요.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="product_code">상품코드 *</Label>
              <Input
                id="product_code"
                value={productCode}
                onChange={(e) =>
                  setProductCode((e.target as HTMLInputElement).value)
                }
                placeholder="예: PRD-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">상품명 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) =>
                  setName((e.target as HTMLInputElement).value)
                }
                placeholder="상품명 입력"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>카테고리</Label>
              <Select
                value={categoryId || '__none__'}
                onValueChange={(val) =>
                  setCategoryId(val === '__none__' ? '' : (val ?? ''))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">선택 안함</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>단위</Label>
              <Select value={unit} onValueChange={(val) => setUnit(val ?? '개')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="safety_stock">안전재고</Label>
              <Input
                id="safety_stock"
                type="number"
                min={0}
                value={safetyStock}
                onChange={(e) =>
                  setSafetyStock(
                    parseInt((e.target as HTMLInputElement).value) || 0
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purchase_price">매입단가</Label>
              <Input
                id="purchase_price"
                type="number"
                min={0}
                value={purchasePrice}
                onChange={(e) =>
                  setPurchasePrice(
                    parseInt((e.target as HTMLInputElement).value) || 0
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="selling_price">매출단가</Label>
              <Input
                id="selling_price"
                type="number"
                min={0}
                value={sellingPrice}
                onChange={(e) =>
                  setSellingPrice(
                    parseInt((e.target as HTMLInputElement).value) || 0
                  )
                }
              />
            </div>
          </div>

          {/* Options section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>옵션</Label>
              <Button variant="outline" size="xs" onClick={addOption}>
                <Plus className="size-3" />
                옵션 추가
              </Button>
            </div>
            {options.length > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="옵션명"
                      value={opt.option_name}
                      onChange={(e) =>
                        updateOption(
                          idx,
                          'option_name',
                          (e.target as HTMLInputElement).value
                        )
                      }
                      className="flex-1"
                    />
                    <Input
                      placeholder="SKU"
                      value={opt.sku}
                      onChange={(e) =>
                        updateOption(
                          idx,
                          'sku',
                          (e.target as HTMLInputElement).value
                        )
                      }
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeOption(idx)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom fields section */}
          {customFields.length > 0 && (
            <div className="space-y-2">
              <Label>추가 필드</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {customFields.map((cf) => {
                  const cfv = cfValues.find((v) => v.field_id === cf.id)
                  return (
                    <div key={cf.id} className="space-y-1">
                      <Label className="text-xs">
                        {cf.field_name}
                        {cf.is_required && ' *'}
                      </Label>
                      {cf.field_type === 'select' && cf.select_options ? (
                        <Select
                          value={cfv?.value || '__empty__'}
                          onValueChange={(val) =>
                            updateCfValue(cf.id, val === '__empty__' ? '' : (val ?? ''))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__empty__">선택 안함</SelectItem>
                            {cf.select_options.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={cf.field_type === 'number' ? 'number' : cf.field_type === 'date' ? 'date' : 'text'}
                          value={cfv?.value ?? ''}
                          onChange={(e) =>
                            updateCfValue(
                              cf.id,
                              (e.target as HTMLInputElement).value
                            )
                          }
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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
            {loading
              ? '저장 중...'
              : mode === 'create'
                ? '등록'
                : '수정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
