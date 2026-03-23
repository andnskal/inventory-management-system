'use client'

import { useState, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { AuditDetailDialog } from './audit-detail-dialog'
import type { AuditLog } from '@/types'

interface AuditPageClientProps {
  initialLogs: AuditLog[]
  initialTotal: number
}

const ACTION_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  INSERT: { label: 'INSERT', variant: 'default' },
  UPDATE: { label: 'UPDATE', variant: 'secondary' },
  DELETE: { label: 'DELETE', variant: 'destructive' },
}

export function AuditPageClient({ initialLogs, initialTotal }: AuditPageClientProps) {
  const [logs, setLogs] = useState(initialLogs)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const pageSize = 30

  const fetchLogs = useCallback(
    async (targetPage: number) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(targetPage))
        params.set('pageSize', String(pageSize))
        if (dateFrom) params.set('date_from', dateFrom)
        if (dateTo) params.set('date_to', dateTo)

        const res = await fetch(`/api/audit?${params.toString()}`)
        const data = await res.json()

        if (!res.ok) {
          toast.error(data.error || '조회에 실패했습니다.')
          return
        }

        setLogs(data.logs)
        setTotal(data.total)
        setPage(targetPage)
      } catch {
        toast.error('조회 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    },
    [dateFrom, dateTo]
  )

  const handleSearch = () => fetchLogs(1)

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">사용 이력</h1>
        <p className="mt-1 text-muted-foreground">
          시스템 변경 이력을 조회합니다.
        </p>
      </div>

      {/* Date filter */}
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="audit_date_from">시작일</Label>
          <Input
            id="audit_date_from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit_date_to">종료일</Label>
          <Input
            id="audit_date_to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-44"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? '조회 중...' : '조회'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              조회된 이력이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시간</TableHead>
                  <TableHead>사용자</TableHead>
                  <TableHead>작업</TableHead>
                  <TableHead>테이블</TableHead>
                  <TableHead>대상 ID</TableHead>
                  <TableHead className="w-20">상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const badge = ACTION_BADGES[log.action] ?? {
                    label: log.action,
                    variant: 'outline' as const,
                  }
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {new Date(log.changed_at).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell>{log.user?.name ?? log.changed_by ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.table_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {log.record_id}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLog(log)}
                        >
                          보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => fetchLogs(page - 1)}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => fetchLogs(page + 1)}
          >
            다음
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <AuditDetailDialog
        log={selectedLog}
        open={!!selectedLog}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null)
        }}
      />
    </div>
  )
}
