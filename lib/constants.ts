import {
  LayoutDashboard,
  Package,
  Building2,
  ArrowLeftRight,
  DollarSign,
  ClipboardList,
  Settings,
  FileText,
} from 'lucide-react'

export const NAV_ITEMS = [
  { title: '대시보드', href: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'staff'] },
  { title: '상품 관리', href: '/products', icon: Package, roles: ['admin', 'manager', 'staff'] },
  { title: '거래처 관리', href: '/partners', icon: Building2, roles: ['admin', 'manager', 'staff'] },
  { title: '입출고 관리', href: '/inventory', icon: ArrowLeftRight, roles: ['admin', 'manager', 'staff'] },
  { title: '매입/매출', href: '/finance', icon: DollarSign, roles: ['admin', 'manager'] },
  { title: '사용 이력', href: '/audit', icon: ClipboardList, roles: ['admin'] },
  { title: '환경 설정', href: '/settings', icon: Settings, roles: ['admin'] },
  { title: '통합 보고서', href: '/reports', icon: FileText, roles: ['admin', 'manager'] },
] as const
