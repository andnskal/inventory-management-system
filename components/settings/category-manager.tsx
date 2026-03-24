'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import type { Category } from '@/types'

interface CategoryManagerProps {
  categories: Category[]
  onCategoriesChange: (categories: Category[]) => void
}

export function CategoryManager({
  categories,
  onCategoriesChange,
}: CategoryManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setName('')
    setParentId('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('카테고리명을 입력하세요.')
      return
    }

    setLoading(true)
    try {
      const parentCategory = parentId
        ? categories.find((c) => c.id === parentId)
        : null
      const depth = parentCategory ? parentCategory.depth + 1 : 0

      const body = {
        name: name.trim(),
        parent_id: parentId || null,
        depth,
        sort_order: categories.length,
      }

      if (editingId) {
        const res = await fetch(`/api/categories/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || '수정에 실패했습니다.')
          return
        }
        onCategoriesChange(
          categories.map((c) => (c.id === editingId ? data.category : c))
        )
        toast.success('카테고리가 수정되었습니다.')
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || '등록에 실패했습니다.')
          return
        }
        onCategoriesChange([...categories, data.category])
        toast.success('카테고리가 등록되었습니다.')
      }
      resetForm()
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id)
    setName(cat.name)
    setParentId(cat.parent_id ?? '')
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '삭제에 실패했습니다.')
        return
      }
      onCategoriesChange(categories.filter((c) => c.id !== id))
      toast.success('카테고리가 삭제되었습니다.')
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  // Build tree structure for display
  const rootCategories = categories.filter((c) => !c.parent_id)

  const renderCategory = (cat: Category, level: number = 0) => {
    const children = categories.filter((c) => c.parent_id === cat.id)
    return (
      <div key={cat.id}>
        <div
          className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <div className="flex items-center gap-1">
            {children.length > 0 && (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
            <span className="text-sm">{cat.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              (depth: {cat.depth})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEdit(cat)}
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700"
              onClick={() => handleDelete(cat.id)}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>
        {children.map((child) => renderCategory(child, level + 1))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>카테고리 관리</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
        >
          <Plus className="size-4" />
          카테고리 추가
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-3 rounded-md border p-4">
            <div className="space-y-1">
              <Label>카테고리명</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="카테고리명을 입력하세요"
              />
            </div>
            <div className="space-y-1">
              <Label>상위 카테고리</Label>
              <Select value={parentId} onValueChange={(v) => setParentId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="없음 (최상위)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음 (최상위)</SelectItem>
                  {categories
                    .filter((c) => c.id !== editingId)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {'─'.repeat(c.depth)} {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={loading} size="sm">
                {editingId ? '수정' : '등록'}
              </Button>
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={loading}
                size="sm"
              >
                취소
              </Button>
            </div>
          </div>
        )}

        {categories.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            등록된 카테고리가 없습니다.
          </div>
        ) : (
          <div className="rounded-md border">
            {rootCategories.map((cat) => renderCategory(cat))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
