'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2 } from 'lucide-react'
import type { Partner } from '@/types'

interface PartnerTableProps {
  partners: Partner[]
  onEdit: (partner: Partner) => void
  onDelete: (partner: Partner) => void
}

const PARTNER_TYPE_LABELS: Record<string, string> = {
  supplier: '매입처',
  customer: '매출처',
  both: '양쪽',
}

const PARTNER_TYPE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  supplier: 'default',
  customer: 'secondary',
  both: 'outline',
}

export function PartnerTable({ partners, onEdit, onDelete }: PartnerTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>거래처명</TableHead>
            <TableHead>유형</TableHead>
            <TableHead>담당자</TableHead>
            <TableHead>연락처</TableHead>
            <TableHead>이메일</TableHead>
            <TableHead className="text-center">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {partners.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                등록된 거래처가 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell>
                  <Badge
                    variant={PARTNER_TYPE_VARIANTS[partner.type] ?? 'outline'}
                    className={
                      partner.type === 'supplier'
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                        : partner.type === 'customer'
                          ? 'bg-green-100 text-green-800 hover:bg-green-100'
                          : 'bg-purple-100 text-purple-800 hover:bg-purple-100'
                    }
                  >
                    {PARTNER_TYPE_LABELS[partner.type] ?? partner.type}
                  </Badge>
                </TableCell>
                <TableCell>{partner.contact_name ?? '-'}</TableCell>
                <TableCell>{partner.phone ?? '-'}</TableCell>
                <TableCell>{partner.email ?? '-'}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onEdit(partner)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onDelete(partner)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
