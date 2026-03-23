'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { PartnerTable } from './partner-table'
import { PartnerFormDialog } from './partner-form-dialog'
import type { Partner } from '@/types'

interface PartnersPageClientProps {
  partners: Partner[]
}

export function PartnersPageClient({ partners }: PartnersPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editPartner, setEditPartner] = useState<Partner | null>(null)
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') ?? 'all')

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  const handleCreate = () => {
    setFormMode('create')
    setEditPartner(null)
    setFormOpen(true)
  }

  const handleEdit = (partner: Partner) => {
    setFormMode('edit')
    setEditPartner(partner)
    setFormOpen(true)
  }

  const handleDelete = async (partner: Partner) => {
    if (!confirm(`"${partner.name}" 거래처를 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/partners/${partner.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '삭제에 실패했습니다.')
        return
      }
      toast.success('거래처가 삭제되었습니다.')
      handleRefresh()
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchValue) params.set('search', searchValue)
    if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter)
    router.push(`/partners?${params.toString()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleTypeChange = (value: string | null) => {
    const v = value ?? 'all'
    setTypeFilter(v)
    const params = new URLSearchParams()
    if (searchValue) params.set('search', searchValue)
    if (v && v !== 'all') params.set('type', v)
    router.push(`/partners?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">거래처 관리</h1>
          <p className="mt-1 text-muted-foreground">
            거래처 목록을 조회하고 관리합니다.
          </p>
        </div>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="size-4" />
          거래처 등록
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="거래처명, 담당자, 연락처 검색"
            value={searchValue}
            onChange={(e) => setSearchValue((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="유형 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="supplier">매입처</SelectItem>
            <SelectItem value="customer">매출처</SelectItem>
            <SelectItem value="both">양쪽</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          검색
        </Button>
      </div>

      <PartnerTable
        partners={partners}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <PartnerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        partner={editPartner}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
