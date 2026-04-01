'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import type { Setting } from '@/types'

interface StockSettingsProps {
  settings: Setting[]
  onSettingsChange: (settings: Setting[]) => void
}

export function StockSettings({
  settings,
  onSettingsChange,
}: StockSettingsProps) {
  const safetyStockSetting = settings.find(
    (s) => s.key === 'default_safety_stock'
  )
  const staleDaysSetting = settings.find(
    (s) => s.key === 'stale_stock_days'
  )

  const [safetyStock, setSafetyStock] = useState<string>(
    String(safetyStockSetting?.value ?? '10')
  )
  const [staleDays, setStaleDays] = useState<string>(
    String(staleDaysSetting?.value ?? '90')
  )
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      // Save safety stock
      const res1 = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'default_safety_stock',
          value: parseInt(safetyStock, 10) || 10,
        }),
      })
      if (!res1.ok) {
        const data = await res1.json()
        toast.error(data.error || '기본 안전재고 저장에 실패했습니다.')
        return
      }

      // Save stale days
      const res2 = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'stale_stock_days',
          value: parseInt(staleDays, 10) || 90,
        }),
      })
      if (!res2.ok) {
        const data = await res2.json()
        toast.error(data.error || '악성재고 기간 저장에 실패했습니다.')
        return
      }

      // Update local settings state
      const updateSetting = (
        key: string,
        value: number
      ): Setting[] => {
        const existing = settings.find((s) => s.key === key)
        if (existing) {
          return settings.map((s) =>
            s.key === key ? { ...s, value } : s
          )
        }
        return [
          ...settings,
          {
            id: `temp_${key}`,
            key,
            value,
            description: null,
            updated_by: null,
            updated_at: new Date().toISOString(),
          },
        ]
      }

      let updated = updateSetting(
        'default_safety_stock',
        parseInt(safetyStock, 10) || 10
      )
      // Re-run for stale_stock_days on the already updated array
      const existingStale = updated.find((s) => s.key === 'stale_stock_days')
      if (existingStale) {
        updated = updated.map((s) =>
          s.key === 'stale_stock_days'
            ? { ...s, value: parseInt(staleDays, 10) || 90 }
            : s
        )
      } else {
        updated = [
          ...updated,
          {
            id: 'temp_stale_stock_days',
            key: 'stale_stock_days',
            value: parseInt(staleDays, 10) || 90,
            description: null,
            updated_by: null,
            updated_at: new Date().toISOString(),
          },
        ]
      }

      onSettingsChange(updated)
      toast.success('재고 기준 설정이 저장되었습니다.')
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>재고 기준 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="default_safety_stock">기본 안전재고</Label>
          <Input
            id="default_safety_stock"
            type="number"
            min={0}
            value={safetyStock}
            onChange={(e) => setSafetyStock(e.target.value)}
            className="w-48"
          />
          <p className="text-xs text-muted-foreground">
            상품 등록 시 기본 안전재고 수량입니다.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="stale_stock_days">악성재고 판단기간 (일)</Label>
          <Input
            id="stale_stock_days"
            type="number"
            min={1}
            value={staleDays}
            onChange={(e) => setStaleDays(e.target.value)}
            className="w-48"
          />
          <p className="text-xs text-muted-foreground">
            마지막 출고일로부터 이 기간이 지나면 악성재고로 판단합니다.
          </p>
        </div>

        <Button onClick={handleSave} disabled={loading}>
          {loading ? '저장 중...' : '저장'}
        </Button>
      </CardContent>
    </Card>
  )
}
