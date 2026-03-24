'use client'

import { useState, useCallback } from 'react'
import { ReportGenerator } from './report-generator'
import { ReportPreview } from './report-preview'
import type { ReportData, ReportSection } from './types'

export function ReportsPageClient() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [activeSections, setActiveSections] = useState<ReportSection[]>([])
  const [period, setPeriod] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  })

  const handleDataLoaded = useCallback(
    (data: ReportData, sections: ReportSection[], newPeriod: { from: string; to: string }) => {
      setReportData(data)
      setActiveSections(sections)
      setPeriod(newPeriod)
    },
    []
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">통합 보고서</h1>
        <p className="mt-1 text-muted-foreground">
          기간과 항목을 선택하여 통합 보고서를 생성합니다.
        </p>
      </div>

      <ReportGenerator onDataLoaded={handleDataLoaded} />

      {reportData && (
        <ReportPreview
          data={reportData}
          sections={activeSections}
          period={period}
        />
      )}

      {!reportData && (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <p className="text-muted-foreground">
            기간과 항목을 선택한 후 &quot;보고서 생성&quot; 버튼을 클릭해주세요.
          </p>
        </div>
      )}
    </div>
  )
}
