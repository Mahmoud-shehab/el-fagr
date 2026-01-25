import { useState, ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, TrendingUp, Package, Users, DollarSign, Printer, Download } from 'lucide-react'

// Add print styles
const printStyles = `
  @media print {
    /* Hide sidebar and controls */
    aside, nav, .no-print {
      display: none !important;
    }
    
    /* Hide browser default headers and footers */
    @page {
      margin: 0.5cm;
    }
    
    /* Make content full width */
    main {
      margin: 0 !important;
      padding: 20px !important;
    }
    
    /* Show print header with logo */
    .print-header {
      display: block !important;
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
    }
    .print-header img {
      max-width: 80px;
      margin: 0 auto 10px;
      display: block;
    }
    .print-header h2 {
      font-size: 24px;
      font-weight: bold;
      margin: 10px 0;
    }
    .print-stats {
      display: flex !important;
      justify-content: space-around;
      margin: 20px 0;
      padding: 15px;
      background: #f5f5f5;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    table th, table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: right;
    }
    table th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
  }
  
  /* Hide print header on screen */
  .print-header {
    display: none;
  }
`

type ReportType = 'sales' | 'purchases' | 'inventory' | 'customers' | 'suppliers' | 'profit'

interface SaleRow {
  id: string
  invoice_number: string
  invoice_date?: string
  created_at: string
  total_amount?: number
  paid_amount?: number
  status?: string
}

interface PurchaseRow {
  id: string
  invoice_number: string
  invoice_date?: string
  created_at: string
  total_amount?: number
  paid_amount?: number
  supplier?: { name_ar?: string }
}

interface InventoryRow {
  id: string
  quantity?: number
  min_quantity?: number
  product?: { code?: string; name_ar?: string; selling_price?: number }
  branch?: { name_ar?: string }
}

interface CustomerRow {
  id: string
  code: string
  name?: string
  name_ar?: string
  phone?: string
  current_balance?: number
  credit_limit?: number
}

interface SupplierRow {
  id: string
  code: string
  name?: string
  name_ar?: string
  phone?: string
  current_balance?: number
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>('sales')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Get the report content
    const reportContent = document.querySelector('.report-content')
    if (!reportContent) return

    // Create a simple CSV export
    const reportTitle = reports.find(r => r.key === activeReport)?.label || 'تقرير'
    const dateRange = dateFrom && dateTo ? `من ${dateFrom} إلى ${dateTo}` : ''
    
    alert(`سيتم تنزيل ${reportTitle} ${dateRange}`)
    // In a real app, you would generate CSV/PDF here
  }

  const reports = [
    { key: 'sales', label: 'تقرير المبيعات', icon: TrendingUp },
    { key: 'purchases', label: 'تقرير المشتريات', icon: FileText },
    { key: 'inventory', label: 'تقرير المخزون', icon: Package },
    { key: 'customers', label: 'تقرير العملاء', icon: Users },
    { key: 'suppliers', label: 'تقرير الموردين', icon: Users },
    { key: 'profit', label: 'تقرير الأرباح', icon: DollarSign },
  ]

  return (
    <div className="space-y-6">
      <style>{printStyles}</style>
      
      {/* Print Header - Only visible when printing */}
      <div className="print-header">
        <img src="/logo.jpg" alt="شركة الفجر الجديد" />
        <h2>شركة الفجر الجديد</h2>
        <h3>{reports.find(r => r.key === activeReport)?.label}</h3>
        {dateFrom && dateTo && (
          <p>من {dateFrom} إلى {dateTo}</p>
        )}
      </div>
      
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">التقارير</h1>
          <p className="text-muted-foreground">عرض وطباعة التقارير</p>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-56 space-y-1 no-print">
          {reports.map((report) => (
            <button
              type="button"
              key={report.key}
              onClick={() => setActiveReport(report.key as ReportType)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors ${
                activeReport === report.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <report.icon className="h-4 w-4" />
              {report.label}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <Card>
            <CardHeader className="no-print">
              <div className="flex items-center justify-between">
                <CardTitle>{reports.find(r => r.key === activeReport)?.label}</CardTitle>
                <div className="flex items-center gap-2">
                  <Input type="date" value={dateFrom} onChange={(e: ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)} className="w-40" />
                  <span>إلى</span>
                  <Input type="date" value={dateTo} onChange={(e: ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)} className="w-40" />
                  <Button variant="outline" size="icon" onClick={handlePrint}>
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="report-content">
              {activeReport === 'sales' && <SalesReport dateFrom={dateFrom} dateTo={dateTo} />}
              {activeReport === 'purchases' && <PurchasesReport dateFrom={dateFrom} dateTo={dateTo} />}
              {activeReport === 'inventory' && <InventoryReport />}
              {activeReport === 'customers' && <CustomersReport />}
              {activeReport === 'suppliers' && <SuppliersReport />}
              {activeReport === 'profit' && <ProfitReport dateFrom={dateFrom} dateTo={dateTo} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SalesReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['sales-report', dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from('sales').select('*').order('created_at', { ascending: false })
      if (dateFrom) query = query.gte('invoice_date', dateFrom)
      if (dateTo) query = query.lte('invoice_date', dateTo)
      const { data } = await query.limit(100)
      const sales = (data || []) as SaleRow[]
      
      const totalSales = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
      const totalPaid = sales.reduce((sum, s) => sum + (s.paid_amount || 0), 0)
      const count = sales.length
      
      return { sales, totalSales, totalPaid, count }
    },
  })

  if (isLoading) return <p className="text-center py-8">جاري التحميل...</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 print-stats">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-muted-foreground">عدد الفواتير</p>
          <p className="text-2xl font-bold">{data?.count}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.totalSales || 0)}</p>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-muted-foreground">إجمالي المحصل</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.totalPaid || 0)}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-right py-2">رقم الفاتورة</th>
            <th className="text-right py-2">التاريخ</th>
            <th className="text-right py-2">الإجمالي</th>
            <th className="text-right py-2">المدفوع</th>
            <th className="text-right py-2">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {data?.sales.slice(0, 20).map((sale) => (
            <tr key={sale.id} className="border-b">
              <td className="py-2">{sale.invoice_number}</td>
              <td className="py-2">{formatDate(sale.invoice_date || sale.created_at)}</td>
              <td className="py-2">{formatCurrency(sale.total_amount || 0)}</td>
              <td className="py-2">{formatCurrency(sale.paid_amount || 0)}</td>
              <td className="py-2">{sale.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

function PurchasesReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['purchases-report', dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from('purchases').select('*, supplier:suppliers(name_ar)').order('created_at', { ascending: false })
      if (dateFrom) query = query.gte('invoice_date', dateFrom)
      if (dateTo) query = query.lte('invoice_date', dateTo)
      const { data } = await query.limit(100)
      const purchases = (data || []) as PurchaseRow[]
      
      const total = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0)
      const paid = purchases.reduce((sum, p) => sum + (p.paid_amount || 0), 0)
      
      return { purchases, total, paid, count: purchases.length }
    },
  })

  if (isLoading) return <p className="text-center py-8">جاري التحميل...</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-muted-foreground">عدد الفواتير</p>
          <p className="text-2xl font-bold">{data?.count}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-muted-foreground">إجمالي المشتريات</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.total || 0)}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-muted-foreground">إجمالي المدفوع</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.paid || 0)}</p>
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-right py-2">رقم الفاتورة</th>
            <th className="text-right py-2">المورد</th>
            <th className="text-right py-2">التاريخ</th>
            <th className="text-right py-2">الإجمالي</th>
            <th className="text-right py-2">المدفوع</th>
          </tr>
        </thead>
        <tbody>
          {data?.purchases.slice(0, 20).map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2">{p.invoice_number}</td>
              <td className="py-2">{p.supplier?.name_ar}</td>
              <td className="py-2">{formatDate(p.invoice_date || p.created_at)}</td>
              <td className="py-2">{formatCurrency(p.total_amount || 0)}</td>
              <td className="py-2">{formatCurrency(p.paid_amount || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InventoryReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-report'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory')
        .select('*, product:products(code, name_ar, selling_price), branch:branches(name_ar)')
        .order('quantity', { ascending: true })
        .limit(100)
      const inventory = (data || []) as InventoryRow[]
      
      const lowStock = inventory.filter((i) => (i.quantity || 0) <= (i.min_quantity || 10))
      const totalValue = inventory.reduce((sum, i) => sum + ((i.quantity || 0) * (i.product?.selling_price || 0)), 0)
      
      return { inventory, lowStock, totalValue }
    },
  })

  if (isLoading) return <p className="text-center py-8">جاري التحميل...</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-muted-foreground">إجمالي الأصناف</p>
          <p className="text-2xl font-bold">{data?.inventory.length}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-muted-foreground">أصناف تحت الحد الأدنى</p>
          <p className="text-2xl font-bold">{data?.lowStock.length}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-muted-foreground">قيمة المخزون</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.totalValue || 0)}</p>
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-right py-2">كود المنتج</th>
            <th className="text-right py-2">اسم المنتج</th>
            <th className="text-right py-2">الفرع</th>
            <th className="text-right py-2">الكمية</th>
            <th className="text-right py-2">الحد الأدنى</th>
          </tr>
        </thead>
        <tbody>
          {data?.inventory.map((inv) => (
            <tr key={inv.id} className={`border-b ${(inv.quantity || 0) <= (inv.min_quantity || 10) ? 'bg-red-50' : ''}`}>
              <td className="py-2">{inv.product?.code}</td>
              <td className="py-2">{inv.product?.name_ar}</td>
              <td className="py-2">{inv.branch?.name_ar}</td>
              <td className="py-2">{inv.quantity || 0}</td>
              <td className="py-2">{inv.min_quantity || 10}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


function CustomersReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['customers-report'],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('current_balance', { ascending: false })
        .limit(100)
      const customers = (data || []) as CustomerRow[]
      
      const totalBalance = customers.reduce((sum, c) => sum + (c.current_balance || 0), 0)
      const withBalance = customers.filter(c => (c.current_balance || 0) > 0)
      
      return { customers, totalBalance, withBalance: withBalance.length }
    },
  })

  if (isLoading) return <p className="text-center py-8">جاري التحميل...</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
          <p className="text-2xl font-bold">{data?.customers.length}</p>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-muted-foreground">عملاء لديهم رصيد</p>
          <p className="text-2xl font-bold">{data?.withBalance}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-muted-foreground">إجمالي المديونية</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.totalBalance || 0)}</p>
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-right py-2">الكود</th>
            <th className="text-right py-2">الاسم</th>
            <th className="text-right py-2">الهاتف</th>
            <th className="text-right py-2">الرصيد</th>
            <th className="text-right py-2">حد الائتمان</th>
          </tr>
        </thead>
        <tbody>
          {data?.customers.map((c) => (
            <tr key={c.id} className={`border-b ${(c.current_balance || 0) > (c.credit_limit || 0) ? 'bg-red-50' : ''}`}>
              <td className="py-2">{c.code}</td>
              <td className="py-2">{c.name_ar || c.name}</td>
              <td className="py-2">{c.phone}</td>
              <td className="py-2">{formatCurrency(c.current_balance || 0)}</td>
              <td className="py-2">{formatCurrency(c.credit_limit || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SuppliersReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['suppliers-report'],
    queryFn: async () => {
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .order('current_balance', { ascending: false })
        .limit(100)
      const suppliers = (data || []) as SupplierRow[]
      
      const totalBalance = suppliers.reduce((sum, s) => sum + (s.current_balance || 0), 0)
      
      return { suppliers, totalBalance }
    },
  })

  if (isLoading) return <p className="text-center py-8">جاري التحميل...</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-muted-foreground">إجمالي الموردين</p>
          <p className="text-2xl font-bold">{data?.suppliers.length}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-muted-foreground">إجمالي المستحقات</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.totalBalance || 0)}</p>
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-right py-2">الكود</th>
            <th className="text-right py-2">الاسم</th>
            <th className="text-right py-2">الهاتف</th>
            <th className="text-right py-2">الرصيد المستحق</th>
          </tr>
        </thead>
        <tbody>
          {data?.suppliers.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="py-2">{s.code}</td>
              <td className="py-2">{s.name_ar || s.name}</td>
              <td className="py-2">{s.phone}</td>
              <td className="py-2">{formatCurrency(s.current_balance || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProfitReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['profit-report', dateFrom, dateTo],
    queryFn: async () => {
      let salesQuery = supabase.from('sales').select('total_amount, discount_amount')
      let purchasesQuery = supabase.from('purchases').select('total_amount')
      
      if (dateFrom) {
        salesQuery = salesQuery.gte('invoice_date', dateFrom)
        purchasesQuery = purchasesQuery.gte('invoice_date', dateFrom)
      }
      if (dateTo) {
        salesQuery = salesQuery.lte('invoice_date', dateTo)
        purchasesQuery = purchasesQuery.lte('invoice_date', dateTo)
      }
      
      const [{ data: salesData }, { data: purchasesData }] = await Promise.all([salesQuery, purchasesQuery])
      const sales = (salesData || []) as { total_amount?: number; discount_amount?: number }[]
      const purchases = (purchasesData || []) as { total_amount?: number }[]
      
      const totalSales = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
      const totalDiscounts = sales.reduce((sum, s) => sum + (s.discount_amount || 0), 0)
      const totalPurchases = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0)
      const grossProfit = totalSales - totalPurchases
      
      return { totalSales, totalDiscounts, totalPurchases, grossProfit }
    },
  })

  if (isLoading) return <p className="text-center py-8">جاري التحميل...</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 bg-green-50 rounded-lg">
          <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(data?.totalSales || 0)}</p>
        </div>
        <div className="p-6 bg-red-50 rounded-lg">
          <p className="text-sm text-muted-foreground">إجمالي المشتريات</p>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(data?.totalPurchases || 0)}</p>
        </div>
        <div className="p-6 bg-yellow-50 rounded-lg">
          <p className="text-sm text-muted-foreground">إجمالي الخصومات</p>
          <p className="text-3xl font-bold text-yellow-600">{formatCurrency(data?.totalDiscounts || 0)}</p>
        </div>
        <div className={`p-6 rounded-lg ${(data?.grossProfit || 0) >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
          <p className="text-sm text-muted-foreground">صافي الربح</p>
          <p className={`text-3xl font-bold ${(data?.grossProfit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(data?.grossProfit || 0)}
          </p>
        </div>
      </div>
    </div>
  )
}