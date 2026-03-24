'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Printer } from 'lucide-react'
import { toast } from 'sonner'
import type { ReportData, ReportSection } from './types'

const REPORT_SECTIONS: { id: ReportSection; label: string; description: string }[] = [
  {
    id: 'stock_summary',
    label: '재고 현황 요약',
    description: '전체 상품 수, 안전재고 미달 수, 총 재고 수량',
  },
  {
    id: 'transactions',
    label: '입출고 내역',
    description: '기간별 입고/출고 건수 및 금액 합계',
  },
  {
    id: 'finance',
    label: '매입/매출 현황',
    description: '일별 매입/매출 집계 및 마진',
  },
  {
    id: 'partners',
    label: '거래처 현황',
    description: '유형별 거래처 수',
  },
  {
    id: 'low_stock',
    label: '재고 부족 상품',
    description: '안전재고 미달 상품 목록',
  },
]

interface ReportGeneratorProps {
  onDataLoaded: (data: ReportData, sections: ReportSection[], period: { from: string; to: string }) => void
}

export function ReportGenerator({ onDataLoaded }: ReportGeneratorProps) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedSections, setSelectedSections] = useState<ReportSection[]>([
    'stock_summary',
    'transactions',
    'finance',
    'partners',
    'low_stock',
  ])
  const [loading, setLoading] = useState(false)

  const toggleSection = useCallback((section: ReportSection) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    )
  }, [])

  const selectAll = useCallback(() => {
    setSelectedSections(REPORT_SECTIONS.map((s) => s.id))
  }, [])

  const deselectAll = useCallback(() => {
    setSelectedSections([])
  }, [])

  const handleGenerate = useCallback(async () => {
    if (selectedSections.length === 0) {
      toast.error('하나 이상의 섹션을 선택해주세요.')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      params.set('sections', selectedSections.join(','))

      const res = await fetch(`/api/reports?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '보고서 생성에 실패했습니다.')
        return
      }

      onDataLoaded(data, selectedSections, { from: dateFrom, to: dateTo })
      toast.success('보고서가 생성되었습니다.')
    } catch {
      toast.error('보고서 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, selectedSections, onDataLoaded])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle>보고서 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date range */}
        <div>
          <h3 className="mb-3 text-sm font-medium">조회 기간</h3>
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="report_date_from">시작일</Label>
              <Input
                id="report_date_from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="report_date_to">종료일</Label>
              <Input
                id="report_date_to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-44"
              />
            </div>
          </div>
        </div>

        {/* Section selection */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">포함할 항목</h3>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAll}
              >
                전체 선택
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={deselectAll}
              >
                전체 해제
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {REPORT_SECTIONS.map((section) => (
              <label
                key={section.id}
                className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selectedSections.includes(section.id)}
                  onChange={() => toggleSection(section.id)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <div className="text-sm font-medium">{section.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {section.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={loading}>
            <Search className="size-4" />
            {loading ? '생성 중...' : '보고서 생성'}
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="size-4" />
            PDF로 저장 (인쇄)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
