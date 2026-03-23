'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { AuditLog } from '@/types'

interface AuditDetailDialogProps {
  log: AuditLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuditDetailDialog({
  log,
  open,
  onOpenChange,
}: AuditDetailDialogProps) {
  if (!log) return null

  const oldValues = log.old_values ?? {}
  const newValues = log.new_values ?? {}

  // Get all keys from both old and new
  const allKeys = Array.from(
    new Set([...Object.keys(oldValues), ...Object.keys(newValues)])
  ).sort()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            변경 상세
            <Badge variant="secondary">{log.action}</Badge>
            <span className="text-sm font-normal text-muted-foreground">
              {log.table_name}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <span>시간: {new Date(log.changed_at).toLocaleString('ko-KR')}</span>
            {log.user?.name && (
              <span className="ml-4">사용자: {log.user.name}</span>
            )}
            <span className="ml-4 font-mono">ID: {log.record_id}</span>
          </div>

          {allKeys.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              변경 데이터가 없습니다.
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">필드</th>
                    <th className="px-3 py-2 text-left font-medium">변경 전</th>
                    <th className="px-3 py-2 text-left font-medium">변경 후</th>
                  </tr>
                </thead>
                <tbody>
                  {allKeys.map((key) => {
                    const oldVal = oldValues[key]
                    const newVal = newValues[key]
                    const oldStr =
                      oldVal !== undefined && oldVal !== null
                        ? JSON.stringify(oldVal)
                        : '-'
                    const newStr =
                      newVal !== undefined && newVal !== null
                        ? JSON.stringify(newVal)
                        : '-'
                    const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal)

                    return (
                      <tr
                        key={key}
                        className={`border-b last:border-0 ${changed ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}`}
                      >
                        <td className="px-3 py-1.5 font-mono text-xs font-medium">
                          {key}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-xs break-all max-w-[220px]">
                          {oldStr}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-xs break-all max-w-[220px]">
                          {changed ? (
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {newStr}
                            </span>
                          ) : (
                            newStr
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
