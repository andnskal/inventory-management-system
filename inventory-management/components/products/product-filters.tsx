'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, RotateCcw } from 'lucide-react'
import type { Category } from '@/types'

interface ProductFiltersProps {
  categories: Category[]
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const search = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('category_id') ?? ''
  const status = searchParams.get('status') ?? ''

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page') // reset page on filter change
      startTransition(() => {
        router.push(`/products?${params.toString()}`)
      })
    },
    [router, searchParams, startTransition]
  )

  const handleReset = useCallback(() => {
    startTransition(() => {
      router.push('/products')
    })
  }, [router, startTransition])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="상품코드 또는 상품명 검색..."
          defaultValue={search}
          className="pl-8"
          onChange={(e) => {
            const value = (e.target as HTMLInputElement).value
            // Debounce search
            const timeout = setTimeout(() => updateParams('search', value), 400)
            return () => clearTimeout(timeout)
          }}
        />
      </div>

      <Select
        value={categoryId}
        onValueChange={(val) => updateParams('category_id', val === '__all__' ? '' : (val ?? ''))}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="카테고리 전체" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">카테고리 전체</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status || '__all__'}
        onValueChange={(val) => updateParams('status', val === '__all__' ? '' : (val ?? ''))}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="상태 전체" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">전체</SelectItem>
          <SelectItem value="normal">정상</SelectItem>
          <SelectItem value="low">재고부족</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={handleReset}
        disabled={isPending}
      >
        <RotateCcw className="size-3.5" />
        초기화
      </Button>
    </div>
  )
}
