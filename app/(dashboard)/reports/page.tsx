import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReportsPageClient } from '@/components/reports/reports-page-client'

export default async function ReportsPage() {
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

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    redirect('/')
  }

  return <ReportsPageClient />
}
