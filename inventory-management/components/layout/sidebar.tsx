'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import type { UserRole } from '@/types'

interface SidebarProps {
  userRole: UserRole
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()

  const filteredItems = NAV_ITEMS.filter((item) =>
    (item.roles as readonly string[]).includes(userRole)
  )

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          재고관리
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {filteredItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
