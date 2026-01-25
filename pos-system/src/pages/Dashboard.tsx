import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Package, Users, ShoppingCart, TrendingUp, AlertTriangle, ArrowLeftRight } from 'lucide-react'

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [products, customers, sales, inventory, branches] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('sales').select('total_amount').eq('status', 'completed'),
        supabase.from('inventory').select('quantity, product_id'),
        supabase.from('branches').select('*').eq('status', 'active'),
      ])
      
      const totalSales = sales.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0
      const lowStock = inventory.data?.filter(i => (i.quantity || 0) < 10).length || 0
      
      return {
        productsCount: products.count || 0,
        customersCount: customers.count || 0,
        totalSales,
        lowStockCount: lowStock,
        branchesCount: branches.data?.length || 0,
      }
    },
  })

  const cards = [
    { title: 'إجمالي المبيعات', value: formatCurrency(stats?.totalSales || 0), icon: TrendingUp, color: 'text-green-600' },
    { title: 'المنتجات', value: stats?.productsCount || 0, icon: Package, color: 'text-blue-600' },
    { title: 'العملاء', value: stats?.customersCount || 0, icon: Users, color: 'text-purple-600' },
    { title: 'الفروع', value: stats?.branchesCount || 0, icon: ArrowLeftRight, color: 'text-orange-600' },
    { title: 'منتجات منخفضة المخزون', value: stats?.lowStockCount || 0, icon: AlertTriangle, color: 'text-red-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground">مرحباً بك في نظام الفجر الجديدة</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>آخر المبيعات</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentSales />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>تنبيهات المخزون</CardTitle>
          </CardHeader>
          <CardContent>
            <LowStockAlerts />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RecentSales() {
  const { data: sales } = useQuery({
    queryKey: ['recent-sales'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales')
        .select('*, customer:customers(name)')
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    },
  })

  if (!sales?.length) return <p className="text-muted-foreground text-sm">لا توجد مبيعات حتى الآن</p>

  return (
    <div className="space-y-3">
      {sales.map((sale) => (
        <div key={sale.id} className="flex items-center justify-between border-b pb-2">
          <div>
            <p className="font-medium">{sale.invoice_number}</p>
            <p className="text-sm text-muted-foreground">{sale.customer?.name || sale.customer_name || 'عميل نقدي'}</p>
          </div>
          <span className="font-medium">{formatCurrency(sale.total_amount || 0)}</span>
        </div>
      ))}
    </div>
  )
}

function LowStockAlerts() {
  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory')
        .select('quantity, product:products(name, name_ar, min_stock_level)')
        .lt('quantity', 10)
        .limit(5)
      return data || []
    },
  })

  if (!lowStock?.length) return <p className="text-muted-foreground text-sm">لا توجد تنبيهات</p>

  return (
    <div className="space-y-3">
      {lowStock.map((item, i) => (
        <div key={i} className="flex items-center justify-between border-b pb-2">
          <p className="font-medium">{item.product?.name_ar || item.product?.name}</p>
          <span className="text-destructive font-medium">{item.quantity} وحدة</span>
        </div>
      ))}
    </div>
  )
}
