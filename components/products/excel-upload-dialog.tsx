'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { parseExcelFile, type ParsedProductRow } from '@/lib/excel'

interface ExcelUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ExcelUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: ExcelUploadDialogProps) {
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([])
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const rows = parseExcelFile(buffer)
      if (rows.length === 0) {
        toast.error('파일에 데이터가 없습니다.')
        return
      }
      setParsedRows(rows)
      toast.success(`${rows.length}건의 데이터를 불러왔습니다.`)
    } catch {
      toast.error('엑셀 파일 파싱에 실패했습니다.')
      setParsedRows([])
    }
  }

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      toast.error('업로드할 데이터가 없습니다.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/upload/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedRows }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '업로드에 실패했습니다.')
        return
      }

      const msg = `처리 완료: 신규 ${data.created}건, 수정 ${data.updated}건`
      if (data.errors?.length > 0) {
        toast.warning(`${msg} (오류 ${data.errors.length}건)`)
      } else {
        toast.success(msg)
      }

      setParsedRows([])
      setFileName('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('업로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setParsedRows([])
      setFileName('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>엑셀 업로드</DialogTitle>
          <DialogDescription>
            .xls 또는 .xlsx 파일을 선택하세요. 컬럼 매핑: 상품코드, 상품명,
            옵션명, 정상재고, 작업대기부속부족
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File input */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Upload className="size-4" />
              파일 선택
            </Button>
            <span className="text-sm text-muted-foreground">
              {fileName || '선택된 파일 없음'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Preview table */}
          {parsedRows.length > 0 && (
            <div className="rounded-lg border">
              <div className="p-2 bg-muted/30 border-b">
                <span className="text-sm font-medium">
                  미리보기 ({parsedRows.length}건)
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>상품코드</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead>옵션명</TableHead>
                      <TableHead className="text-right">정상재고</TableHead>
                      <TableHead className="text-right">
                        작업대기부속부족
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>{row.product_code}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.option_name || '-'}</TableCell>
                        <TableCell className="text-right">
                          {row.normal_stock}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.pending_shortage_stock}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedRows.length > 50 && (
                <div className="p-2 text-center text-sm text-muted-foreground border-t">
                  외 {parsedRows.length - 50}건 더 있음
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={loading}
          >
            취소
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || parsedRows.length === 0}
          >
            {loading ? '업로드 중...' : `${parsedRows.length}건 가져오기`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
