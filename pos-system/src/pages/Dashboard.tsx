import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Package, Users, TrendingUp, AlertTriangle, Building2 } from 'lucide-react'
import { useState } from 'react'

interface SaleRow {
  id: string
  invoice_number: string
  customer_name?: string
  total_amount?: number
  customer?: { name?: string }
}

interface InventoryRow {
  quantity: number
  product?: {
    name?: string
    name_ar?: string
    min_stock_level?: number
  }
}

interface BranchRow {
  id: string
  name_ar: string
}

export default function Dashboard() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')

  // Fetch branches
  const { data: branches } = useQuery<BranchRow[]>({
    queryKey: ['dashboard-branches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('status', 'active')
        .order('name_ar')
      return (data || []) as BranchRow[]
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', selectedBranchId],
    queryFn: async () => {
      // Build queries with branch filter
      let productsQuery = supabase.from('products').select('id', { count: 'exact', head: true })
      let customersQuery = supabase.from('customers').select('id', { count: 'exact', head: true })
      let salesQuery = supabase.from('sales').select('total_amount, cost_price:sale_items(cost_price, quantity)').eq('status', 'completed')
      let inventoryQuery = supabase.from('inventory').select('quantity, product_id')
      
      if (selectedBranchId !== 'all') {
        customersQuery = customersQuery.eq('branch_id', selectedBranchId)
        salesQuery = salesQuery.eq('branch_id', selectedBranchId)
        inventoryQuery = inventoryQuery.eq('branch_id', selectedBranchId)
      }

      const [products, customers, sales, inventory] = await Promise.all([
        productsQuery,
        customersQuery,
        salesQuery,
        inventoryQuery,
      ])
      
      const totalSales = sales.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0
      
      // Calculate profit (simplified)
      let totalProfit = 0
      sales.data?.forEach(sale => {
        const saleTotal = sale.total_amount || 0
        // This is simplified - in real scenario, calculate from sale_items
        totalProfit += saleTotal * 0.2 // Assume 20% profit margin
      })
      
      const lowStock = inventory.data?.filter(i => (i.quantity || 0) < 10).length || 0
      
      return {
        productsCount: products.count || 0,
        customersCount: customers.count || 0,
        totalSales,
        totalProfit,
        lowStockCount: lowStock,
      }
    },
  })

  const cards = [
    { title: 'إجمالي المبيعات', value: formatCurrency(stats?.totalSales || 0), icon: TrendingUp, color: 'text-green-600' },
    { title: 'الأرباح', value: formatCurrency(stats?.totalProfit || 0), icon: TrendingUp, color: 'text-emerald-600' },
    { title: 'المنتجات', value: stats?.productsCount || 0, icon: Package, color: 'text-blue-600' },
    { title: 'العملاء', value: stats?.customersCount || 0, icon: Users, color: 'text-purple-600' },
    { title: 'منتجات منخفضة المخزون', value: stats?.lowStockCount || 0, icon: AlertTriangle, color: 'text-red-600' },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground">مرحباً بك في نظام الفجر الجديد</p>
        </div>
        
        {/* Branch Filter */}
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 sm:px-4 py-2 border rounded-md bg-background text-sm w-full sm:w-auto"
          >
            <option value="all">جميع الفروع</option>
            {branches?.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name_ar}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
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
  const { data: sales } = useQuery<SaleRow[]>({
    queryKey: ['recent-sales'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales')
        .select('*, customer:customers(name)')
        .order('created_at', { ascending: false })
        .limit(5)
      return (data || []) as SaleRow[]
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
  const { data: lowStock } = useQuery<InventoryRow[]>({
    queryKey: ['low-stock'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory')
        .select('quantity, product:products(name, name_ar, min_stock_level)')
        .lt('quantity', 10)
        .limit(5)
      return (data || []) as InventoryRow[]
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
