import { Package, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface SummaryCardsProps {
  totalProducts: number
  lowStockCount: number
  totalPurchase: number
  totalSales: number
}

export function SummaryCards({
  totalProducts,
  lowStockCount,
  totalPurchase,
  totalSales,
}: SummaryCardsProps) {
  const cards = [
    {
      title: '전체 상품',
      value: totalProducts.toLocaleString(),
      suffix: '개',
      icon: Package,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: '재고 부족',
      value: lowStockCount.toLocaleString(),
      suffix: '개',
      icon: AlertTriangle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    {
      title: '총 매입액',
      value: `₩${totalPurchase.toLocaleString()}`,
      suffix: '',
      icon: TrendingDown,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      title: '총 매출액',
      value: `₩${totalSales.toLocaleString()}`,
      suffix: '',
      icon: TrendingUp,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardContent className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${card.iconBg}`}>
                <Icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">
                  {card.value}
                  {card.suffix && (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      {card.suffix}
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
