'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Setting } from '@/types'

interface UnitManagerProps {
  settings: Setting[]
  onSettingsChange: (settings: Setting[]) => void
}

export function UnitManager({ settings, onSettingsChange }: UnitManagerProps) {
  const unitsSetting = settings.find((s) => s.key === 'units')
  const currentUnits: string[] = Array.isArray(unitsSetting?.value)
    ? (unitsSetting.value as string[])
    : ['개', 'EA', 'BOX', 'SET', 'kg', 'g', 'L', 'ml']

  const [newUnit, setNewUnit] = useState('')
  const [loading, setLoading] = useState(false)

  const saveUnits = async (units: string[]) => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'units', value: units }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '저장에 실패했습니다.')
        return
      }

      // Update settings state
      const updated = unitsSetting
        ? settings.map((s) =>
            s.key === 'units' ? { ...s, value: units } : s
          )
        : [
            ...settings,
            {
              id: 'temp',
              key: 'units',
              value: units,
              description: null,
              updated_by: null,
              updated_at: new Date().toISOString(),
            },
          ]
      onSettingsChange(updated)
      toast.success('단위가 저장되었습니다.')
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    if (!newUnit.trim()) {
      toast.error('단위를 입력하세요.')
      return
    }
    if (currentUnits.includes(newUnit.trim())) {
      toast.error('이미 존재하는 단위입니다.')
      return
    }
    saveUnits([...currentUnits, newUnit.trim()])
    setNewUnit('')
  }

  const handleRemove = (unit: string) => {
    saveUnits(currentUnits.filter((u) => u !== unit))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>단위 관리</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            placeholder="새 단위 입력"
            className="w-48"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
          />
          <Button size="sm" onClick={handleAdd} disabled={loading}>
            <Plus className="size-4" />
            추가
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentUnits.map((unit) => (
            <Badge
              key={unit}
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1 text-sm"
            >
              {unit}
              <button
                onClick={() => handleRemove(unit)}
                className="ml-1 rounded-full hover:bg-muted-foreground/20"
                disabled={loading}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>

        {currentUnits.length === 0 && (
          <p className="text-sm text-muted-foreground">
            등록된 단위가 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
