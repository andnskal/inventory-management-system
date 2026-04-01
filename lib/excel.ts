import * as XLSX from 'xlsx'

export interface ParsedProductRow {
  product_code: string
  name: string
  option_name: string
  normal_stock: number
  pending_shortage_stock: number
}

const COLUMN_MAP: Record<string, keyof ParsedProductRow> = {
  '상품코드': 'product_code',
  'product_code': 'product_code',
  '상품명': 'name',
  'name': 'name',
  '옵션명': 'option_name',
  'option_name': 'option_name',
  '정상재고': 'normal_stock',
  'normal_stock': 'normal_stock',
  '작업대기부속부족': 'pending_shortage_stock',
  'pending_shortage_stock': 'pending_shortage_stock',
}

export function parseExcelFile(buffer: ArrayBuffer): ParsedProductRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  return rawData.map((row) => {
    const mapped: Partial<ParsedProductRow> = {}
    for (const [key, value] of Object.entries(row)) {
      const mappedKey = COLUMN_MAP[key.trim()]
      if (mappedKey) {
        if (mappedKey === 'normal_stock' || mappedKey === 'pending_shortage_stock') {
          mapped[mappedKey] = Number(value) || 0
        } else {
          mapped[mappedKey] = String(value ?? '')
        }
      }
    }
    return {
      product_code: mapped.product_code ?? '',
      name: mapped.name ?? '',
      option_name: mapped.option_name ?? '',
      normal_stock: mapped.normal_stock ?? 0,
      pending_shortage_stock: mapped.pending_shortage_stock ?? 0,
    }
  })
}

export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string
) {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '상품목록')

  // Auto column widths
  const colWidths = Object.keys(data[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => String(row[key] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })
  worksheet['!cols'] = colWidths

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
