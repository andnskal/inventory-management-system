'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CustomField, CustomFieldType, CustomFieldTarget } from '@/types'

interface CustomFieldManagerProps {
  customFields: CustomField[]
  onCustomFieldsChange: (fields: CustomField[]) => void
}

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: '텍스트',
  number: '숫자',
  date: '날짜',
  select: '선택',
}

const TARGET_LABELS: Record<CustomFieldTarget, string> = {
  products: '상품',
  partners: '거래처',
}

export function CustomFieldManager({
  customFields,
  onCustomFieldsChange,
}: CustomFieldManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState<CustomFieldType>('text')
  const [targetTable, setTargetTable] = useState<CustomFieldTarget>('products')
  const [isRequired, setIsRequired] = useState(false)
  const [selectOptions, setSelectOptions] = useState('')
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setFieldName('')
    setFieldType('text')
    setTargetTable('products')
    setIsRequired(false)
    setSelectOptions('')
    setEditingId(null)
  }

  const openAdd = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (field: CustomField) => {
    setEditingId(field.id)
    setFieldName(field.field_name)
    setFieldType(field.field_type)
    setTargetTable(field.target_table)
    setIsRequired(field.is_required)
    setSelectOptions(field.select_options?.join(', ') ?? '')
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!fieldName.trim()) {
      toast.error('필드명을 입력하세요.')
      return
    }

    setLoading(true)
    try {
      const body = {
        field_name: fieldName.trim(),
        field_type: fieldType,
        target_table: targetTable,
        is_required: isRequired,
        select_options:
          fieldType === 'select' && selectOptions.trim()
            ? selectOptions
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : null,
        sort_order: customFields.length,
      }

      if (editingId) {
        const res = await fetch(`/api/custom-fields/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || '수정에 실패했습니다.')
          return
        }
        onCustomFieldsChange(
          customFields.map((f) => (f.id === editingId ? data.field : f))
        )
        toast.success('커스텀 필드가 수정되었습니다.')
      } else {
        const res = await fetch('/api/custom-fields', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || '등록에 실패했습니다.')
          return
        }
        onCustomFieldsChange([...customFields, data.field])
        toast.success('커스텀 필드가 등록되었습니다.')
      }
      setDialogOpen(false)
      resetForm()
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 커스텀 필드를 삭제하시겠습니까? 관련 값도 함께 삭제됩니다.'))
      return

    try {
      const res = await fetch(`/api/custom-fields/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '삭제에 실패했습니다.')
        return
      }
      onCustomFieldsChange(customFields.filter((f) => f.id !== id))
      toast.success('커스텀 필드가 삭제되었습니다.')
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>커스텀 필드 관리</CardTitle>
        <Button size="sm" onClick={openAdd}>
          <Plus className="size-4" />
          필드 추가
        </Button>
      </CardHeader>
      <CardContent>
        {customFields.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            등록된 커스텀 필드가 없습니다.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>필드명</TableHead>
                <TableHead>타입</TableHead>
                <TableHead>대상</TableHead>
                <TableHead>필수여부</TableHead>
                <TableHead className="w-24">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customFields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell className="font-medium">
                    {field.field_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {FIELD_TYPE_LABELS[field.field_type]}
                    </Badge>
                    {field.field_type === 'select' && field.select_options && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({field.select_options.join(', ')})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{TARGET_LABELS[field.target_table]}</TableCell>
                  <TableCell>
                    {field.is_required ? (
                      <Badge variant="default">필수</Badge>
                    ) : (
                      <span className="text-muted-foreground">선택</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(field)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(field.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? '커스텀 필드 수정' : '커스텀 필드 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>필드명</Label>
              <Input
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="필드명을 입력하세요"
              />
            </div>

            <div className="space-y-1">
              <Label>타입</Label>
              <Select
                value={fieldType}
                onValueChange={(v) => setFieldType(v as CustomFieldType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">텍스트</SelectItem>
                  <SelectItem value="number">숫자</SelectItem>
                  <SelectItem value="date">날짜</SelectItem>
                  <SelectItem value="select">선택</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>대상 테이블</Label>
              <Select
                value={targetTable}
                onValueChange={(v) =>
                  setTargetTable(v as CustomFieldTarget)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="products">상품</SelectItem>
                  <SelectItem value="partners">거래처</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_required"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded border"
              />
              <Label htmlFor="is_required">필수 여부</Label>
            </div>

            {fieldType === 'select' && (
              <div className="space-y-1">
                <Label>선택 옵션 (쉼표로 구분)</Label>
                <Input
                  value={selectOptions}
                  onChange={(e) => setSelectOptions(e.target.value)}
                  placeholder="옵션1, 옵션2, 옵션3"
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={loading}
              >
                취소
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? '저장 중...' : editingId ? '수정' : '등록'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
