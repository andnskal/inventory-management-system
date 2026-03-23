import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import type { User } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const userProfile = profile as User

  // 안전재고 미달 상품 수 조회 (product_stock_summary 뷰에서)
  let lowStockCount = 0
  try {
    const { data: lowStockItems } = await supabase
      .from('product_stock_summary')
      .select('product_id, safety_stock, total_normal_stock')

    if (lowStockItems) {
      lowStockCount = lowStockItems.filter(
        (item) =>
          (item.total_normal_stock ?? 0) < (item.safety_stock ?? 0)
      ).length
    }
  } catch {
    // 뷰가 없을 수 있음 - 무시
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={userProfile.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={userProfile} lowStockCount={lowStockCount} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
