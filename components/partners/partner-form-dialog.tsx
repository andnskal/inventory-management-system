'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Partner } from '@/types'

interface PartnerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  partner?: Partner | null
  onSuccess: () => void
}

export function PartnerFormDialog({
  open,
  onOpenChange,
  mode,
  partner,
  onSuccess,
}: PartnerFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<string>('supplier')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && partner) {
        setName(partner.name)
        setType(partner.type)
        setContactName(partner.contact_name ?? '')
        setPhone(partner.phone ?? '')
        setEmail(partner.email ?? '')
        setAddress(partner.address ?? '')
        setNotes(partner.notes ?? '')
      } else {
        setName('')
        setType('supplier')
        setContactName('')
        setPhone('')
        setEmail('')
        setAddress('')
        setNotes('')
      }
    }
  }, [open, mode, partner])

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('거래처명을 입력해주세요.')
      return
    }

    if (!type) {
      toast.error('거래처 유형을 선택해주세요.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        type,
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      }

      const url =
        mode === 'edit' && partner
          ? `/api/partners/${partner.id}`
          : '/api/partners'
      const method = mode === 'edit' ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '저장에 실패했습니다.')
        return
      }

      toast.success(
        mode === 'create' ? '거래처가 등록되었습니다.' : '거래처가 수정되었습니다.'
      )
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '거래처 등록' : '거래처 수정'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? '새로운 거래처 정보를 입력하세요.'
              : '거래처 정보를 수정하세요.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="partner_name">거래처명 *</Label>
              <Input
                id="partner_name"
                value={name}
                onChange={(e) => setName((e.target as HTMLInputElement).value)}
                placeholder="거래처명 입력"
              />
            </div>
            <div className="space-y-1.5">
              <Label>유형 *</Label>
              <Select value={type} onValueChange={(val) => setType(val ?? 'supplier')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">매입처</SelectItem>
                  <SelectItem value="customer">매출처</SelectItem>
                  <SelectItem value="both">양쪽</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">담당자명</Label>
              <Input
                id="contact_name"
                value={contactName}
                onChange={(e) =>
                  setContactName((e.target as HTMLInputElement).value)
                }
                placeholder="담당자명 입력"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone((e.target as HTMLInputElement).value)}
                placeholder="010-0000-0000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="example@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">주소</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress((e.target as HTMLInputElement).value)}
              placeholder="주소 입력"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">비고</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
              placeholder="비고 입력"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? '저장 중...'
              : mode === 'create'
                ? '등록'
                : '수정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
