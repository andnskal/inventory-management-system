import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuditPageClient } from '@/components/audit/audit-page-client'
import type { AuditLog } from '@/types'

export default async function AuditPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/')
  }

  // Fetch initial audit logs
  const { data: logs, count } = await supabase
    .from('audit_logs')
    .select('*, user:users(id, name, email)', { count: 'exact' })
    .order('changed_at', { ascending: false })
    .range(0, 29)

  return (
    <AuditPageClient
      initialLogs={(logs ?? []) as AuditLog[]}
      initialTotal={count ?? 0}
    />
  )
}
