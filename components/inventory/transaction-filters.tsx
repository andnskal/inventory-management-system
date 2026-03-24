'use client'

import { useState } from 'react'
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
import { Search } from 'lucide-react'
import type { Partner } from '@/types'

interface TransactionFiltersProps {
  partners: (Partner & { type: string })[]
}

export function TransactionFilters({ partners }: TransactionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') ?? '')
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') ?? '')
  const [type, setType] = useState(searchParams.get('type') ?? 'all')
  const [productSearch, setProductSearch] = useState(
    searchParams.get('product') ?? ''
  )
  const [partnerId, setPartnerId] = useState(
    searchParams.get('partner_id') ?? 'all'
  )

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    if (type && type !== 'all') params.set('type', type)
    if (productSearch) params.set('product', productSearch)
    if (partnerId && partnerId !== 'all') params.set('partner_id', partnerId)
    router.push(`/inventory?${params.toString()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyFilters()
  }

  const handleReset = () => {
    setDateFrom('')
    setDateTo('')
    setType('all')
    setProductSearch('')
    setPartnerId('all')
    router.push('/inventory')
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          시작일
        </label>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom((e.target as HTMLInputElement).value)}
          className="w-[150px]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          종료일
        </label>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo((e.target as HTMLInputElement).value)}
          className="w-[150px]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          유형
        </label>
        <Select value={type} onValueChange={(val) => setType(val ?? 'all')}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="in">입고</SelectItem>
            <SelectItem value="out">출고</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          상품 검색
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="상품명/코드"
            value={productSearch}
            onChange={(e) =>
              setProductSearch((e.target as HTMLInputElement).value)
            }
            onKeyDown={handleKeyDown}
            className="w-[180px] pl-9"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          거래처
        </label>
        <Select value={partnerId} onValueChange={(val) => setPartnerId(val ?? 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {partners.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" size="sm" onClick={applyFilters}>
        검색
      </Button>
      <Button variant="ghost" size="sm" onClick={handleReset}>
        초기화
      </Button>
    </div>
  )
}
