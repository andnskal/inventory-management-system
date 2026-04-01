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
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { StorageLocation } from '@/types'

interface LocationManagerProps {
  locations: StorageLocation[]
  onLocationsChange: (locations: StorageLocation[]) => void
}

export function LocationManager({
  locations,
  onLocationsChange,
}: LocationManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setName('')
    setDescription('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('위치명을 입력하세요.')
      return
    }

    setLoading(true)
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        sort_order: locations.length,
      }

      if (editingId) {
        const res = await fetch(`/api/locations/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || '수정에 실패했습니다.')
          return
        }
        onLocationsChange(
          locations.map((l) => (l.id === editingId ? data.location : l))
        )
        toast.success('보관 위치가 수정되었습니다.')
      } else {
        const res = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || '등록에 실패했습니다.')
          return
        }
        onLocationsChange([...locations, data.location])
        toast.success('보관 위치가 등록되었습니다.')
      }
      resetForm()
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (loc: StorageLocation) => {
    setEditingId(loc.id)
    setName(loc.name)
    setDescription(loc.description ?? '')
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 보관 위치를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '삭제에 실패했습니다.')
        return
      }
      onLocationsChange(locations.filter((l) => l.id !== id))
      toast.success('보관 위치가 삭제되었습니다.')
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>보관 위치 관리</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
        >
          <Plus className="size-4" />
          위치 추가
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-3 rounded-md border p-4">
            <div className="space-y-1">
              <Label>위치명</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="위치명을 입력하세요"
              />
            </div>
            <div className="space-y-1">
              <Label>설명</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="설명 (선택)"
              />
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

        {locations.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            등록된 보관 위치가 없습니다.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>위치명</TableHead>
                <TableHead>설명</TableHead>
                <TableHead className="w-24">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-medium">{loc.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {loc.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(loc)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(loc.id)}
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
    </Card>
  )
}
