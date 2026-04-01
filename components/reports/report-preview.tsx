'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  ReportData,
  ReportSection,
} from './types'

interface ReportPreviewProps {
  data: ReportData
  sections: ReportSection[]
  period: { from: string; to: string }
}

function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR')
}

function formatCurrency(n: number): string {
  return n.toLocaleString('ko-KR') + '원'
}

export function ReportPreview({ data, sections, period }: ReportPreviewProps) {
  const periodLabel =
    period.from && period.to
      ? `${period.from} ~ ${period.to}`
      : period.from
        ? `${period.from} ~`
        : period.to
          ? `~ ${period.to}`
          : '전체 기간'

  return (
    <div className="space-y-6" id="report-preview">
      {/* Report Header (visible in print) */}
      <div className="text-center print:mb-8">
        <h1 className="text-2xl font-bold print:text-3xl">통합 보고서</h1>
        <p className="mt-1 text-muted-foreground print:text-black">
          조회 기간: {periodLabel}
        </p>
        <p className="text-xs text-muted-foreground print:text-black">
          생성일시: {new Date().toLocaleString('ko-KR')}
        </p>
      </div>

      {/* 1. Stock Summary */}
      {sections.includes('stock_summary') && data.stockSummary && (
        <Card className="print:break-inside-avoid print:shadow-none print:ring-1 print:ring-gray-300">
          <CardHeader>
            <CardTitle>재고 현황 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold">
                  {formatNumber(data.stockSummary.totalProducts)}
                </div>
                <div className="text-sm text-muted-foreground">전체 상품 수</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatNumber(data.stockSummary.lowStockCount)}
                </div>
                <div className="text-sm text-muted-foreground">
                  안전재고 미달
                </div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold">
                  {formatNumber(data.stockSummary.totalStockQuantity)}
                </div>
                <div className="text-sm text-muted-foreground">
                  총 재고 수량
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Transaction History */}
      {sections.includes('transactions') && data.transactions && (
        <Card className="print:break-inside-avoid print:shadow-none print:ring-1 print:ring-gray-300">
          <CardHeader>
            <CardTitle>입출고 내역</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-lg font-bold text-blue-600">
                  {formatNumber(data.transactions.totalIn)}
                </div>
                <div className="text-xs text-muted-foreground">입고 수량</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-lg font-bold text-blue-600">
                  {formatCurrency(data.transactions.totalInAmount)}
                </div>
                <div className="text-xs text-muted-foreground">입고 금액</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-lg font-bold text-orange-600">
                  {formatNumber(data.transactions.totalOut)}
                </div>
                <div className="text-xs text-muted-foreground">출고 수량</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-lg font-bold text-orange-600">
                  {formatCurrency(data.transactions.totalOutAmount)}
                </div>
                <div className="text-xs text-muted-foreground">출고 금액</div>
              </div>
            </div>

            {data.transactions.items.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">
                  최근 거래 내역 (최대 50건)
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>날짜</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>상품코드</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead>거래처</TableHead>
                      <TableHead className="text-right">수량</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transactions.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.transaction_date}</TableCell>
                        <TableCell>
                          <span
                            className={
                              item.type === 'in'
                                ? 'text-blue-600'
                                : 'text-orange-600'
                            }
                          >
                            {item.type === 'in' ? '입고' : '출고'}
                          </span>
                        </TableCell>
                        <TableCell>{item.product_code}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.partner_name}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Finance */}
      {sections.includes('finance') && data.finance && (
        <Card className="print:break-inside-avoid print:shadow-none print:ring-1 print:ring-gray-300">
          <CardHeader>
            <CardTitle>매입/매출 현황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-lg font-bold">
                  {formatCurrency(data.finance.totalPurchase)}
                </div>
                <div className="text-xs text-muted-foreground">총 매입액</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-lg font-bold">
                  {formatCurrency(data.finance.totalSales)}
                </div>
                <div className="text-xs text-muted-foreground">총 매출액</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div
                  className={`text-lg font-bold ${data.finance.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(data.finance.margin)}
                </div>
                <div className="text-xs text-muted-foreground">마진</div>
              </div>
            </div>

            {data.finance.items.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">일별 매입/매출</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>날짜</TableHead>
                      <TableHead className="text-right">매입</TableHead>
                      <TableHead className="text-right">매출</TableHead>
                      <TableHead className="text-right">마진</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.finance.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.transaction_date}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.purchase_total)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.sales_total)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${item.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {formatCurrency(item.margin)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Partners */}
      {sections.includes('partners') && data.partners && (
        <Card className="print:break-inside-avoid print:shadow-none print:ring-1 print:ring-gray-300">
          <CardHeader>
            <CardTitle>거래처 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-lg font-bold">
                  {formatNumber(data.partners.total)}
                </div>
                <div className="text-xs text-muted-foreground">전체</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-lg font-bold">
                  {formatNumber(data.partners.supplierCount)}
                </div>
                <div className="text-xs text-muted-foreground">공급처</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-lg font-bold">
                  {formatNumber(data.partners.customerCount)}
                </div>
                <div className="text-xs text-muted-foreground">판매처</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-lg font-bold">
                  {formatNumber(data.partners.bothCount)}
                </div>
                <div className="text-xs text-muted-foreground">공급+판매</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Low Stock Items */}
      {sections.includes('low_stock') && data.lowStock && (
        <Card className="print:break-inside-avoid print:shadow-none print:ring-1 print:ring-gray-300">
          <CardHeader>
            <CardTitle>
              재고 부족 상품 ({data.lowStock.count}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStock.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                안전재고 미달 상품이 없습니다.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>상품코드</TableHead>
                    <TableHead>상품명</TableHead>
                    <TableHead className="text-right">안전재고</TableHead>
                    <TableHead className="text-right">현재 재고</TableHead>
                    <TableHead className="text-right">부족 수량</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowStock.items.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell>{item.product_code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(item.safety_stock)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(item.current_stock)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatNumber(item.shortage)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
