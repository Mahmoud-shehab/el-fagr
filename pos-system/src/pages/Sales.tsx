import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { printInvoice } from '@/components/InvoicePrint'
import { Plus, Search, Eye, Printer } from 'lucide-react'

interface SaleItem {
  id: string
  quantity: number
  unit_price: number
  total_price: number
  product: { name_ar: string; code: string }
}

interface SaleDetails {
  id: string
  invoice_number: string
  invoice_date: string
  created_at?: string
  customer_name?: string
  cashier_id?: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  remaining_amount: number
  payment_method: string
  status: string
  has_tax?: boolean
  payment_status?: string
  customer?: { name_ar?: string; phone?: string }
  branch?: { name_ar: string }
  cashier?: { full_name_ar?: string; full_name?: string }
  items?: SaleItem[]
}

interface BranchRow {
  id: string
  code: string
  name_ar: string
  branch_type?: string
  status?: string
}

interface SaleRow {
  id: string
  invoice_number: string
  invoice_date?: string
  created_at?: string
  customer_name?: string
  total_amount?: number
  paid_amount?: number
  remaining_amount?: number
  status?: string
  has_tax?: boolean
  payment_status?: string
  is_lifted?: boolean
  customer?: { name?: string; name_ar?: string }
  branch?: { name_ar?: string }
}

export default function Sales() {
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState<SaleDetails | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [taxFilter, setTaxFilter] = useState<'all' | 'with_tax' | 'without_tax'>('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'credit'>('all')
  const [liftedFilter, setLiftedFilter] = useState<'all' | 'lifted' | 'not_lifted'>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch branches (outlets only - no main warehouse)
  const { data: branches } = useQuery<BranchRow[]>({
    queryKey: ['sales-branches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('status', 'active')
        .eq('branch_type', 'outlet')
        .order('name_ar')
      return (data || []) as BranchRow[]
    },
  })

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', search, taxFilter, paymentFilter, liftedFilter, branchFilter, currentPage],
    queryFn: async () => {
      // First, get the total count
      let countQuery = supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
      
      if (search) {
        countQuery = countQuery.or(`invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`)
      }
      if (branchFilter !== 'all') {
        countQuery = countQuery.eq('branch_id', branchFilter)
      }
      if (taxFilter === 'with_tax') {
        countQuery = countQuery.eq('has_tax', true)
      } else if (taxFilter === 'without_tax') {
        countQuery = countQuery.eq('has_tax', false)
      }
      if (paymentFilter === 'paid') {
        countQuery = countQuery.eq('payment_status', 'paid')
      } else if (paymentFilter === 'credit') {
        countQuery = countQuery.eq('payment_status', 'credit')
      }
      if (liftedFilter === 'lifted') {
        countQuery = countQuery.eq('is_lifted', true)
      } else if (liftedFilter === 'not_lifted') {
        countQuery = countQuery.eq('is_lifted', false)
      }

      const { count } = await countQuery

      // Then get the paginated data
      let query = supabase
        .from('sales')
        .select('*, customer:customers(name, name_ar), branch:branches(name_ar)')
        .order('created_at', { ascending: false })
      
      if (search) {
        query = query.or(`invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`)
      }

      // Branch filter
      if (branchFilter !== 'all') {
        query = query.eq('branch_id', branchFilter)
      }

      // Tax filter
      if (taxFilter === 'with_tax') {
        query = query.eq('has_tax', true)
      } else if (taxFilter === 'without_tax') {
        query = query.eq('has_tax', false)
      }

      // Payment filter
      if (paymentFilter === 'paid') {
        query = query.eq('payment_status', 'paid')
      } else if (paymentFilter === 'credit') {
        query = query.eq('payment_status', 'credit')
      }

      // Lifted filter
      if (liftedFilter === 'lifted') {
        query = query.eq('is_lifted', true)
      } else if (liftedFilter === 'not_lifted') {
        query = query.eq('is_lifted', false)
      }
      
      // Pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      
      const { data } = await query.range(from, to)
      
      return {
        sales: (data || []) as SaleRow[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage)
      }
    },
  })

  const sales = salesData?.sales || []
  const totalPages = salesData?.totalPages || 1
  const totalCount = salesData?.totalCount || 0

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, taxFilter, paymentFilter, liftedFilter, branchFilter])

  // Handle lifted status change
  const handleLiftedChange = async (saleId: string, isLifted: boolean) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ is_lifted: isLifted } as never)
        .eq('id', saleId)

      if (error) throw error

      // Refresh the sales list
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      
      // Show success message
      const message = isLifted ? 'تم تحديث الحالة إلى: تم الرفع' : 'تم تحديث الحالة إلى: لم يتم الرفع'
      alert(message)
    } catch (error) {
      console.error('Error updating lifted status:', error)
      alert('حدث خطأ في تحديث حالة الرفع')
    }
  }

  // View sale details
  const viewSaleDetails = async (saleId: string) => {
    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(name_ar, phone),
          branch:branches(name_ar)
        `)
        .eq('id', saleId)
        .single()

      if (saleError) {
        console.error('Error fetching sale:', saleError)
        alert('حدث خطأ في جلب بيانات الفاتورة: ' + saleError.message)
        return
      }

      if (sale) {
        // Get cashier name separately
        let cashierName = ''
        const saleData = sale as { cashier_id?: string }
        if (saleData.cashier_id) {
          const { data: cashier } = await supabase
            .from('users')
            .select('full_name_ar, full_name')
            .eq('id', saleData.cashier_id)
            .single()
          const cashierData = cashier ? (cashier as { full_name_ar?: string; full_name?: string }) : null
          cashierName = cashierData?.full_name_ar || cashierData?.full_name || ''
        }

        const { data: items, error: itemsError } = await supabase
          .from('sale_items')
          .select('*, product:products(name_ar, code)')
          .eq('sale_id', saleId)

        if (itemsError) {
          console.error('Error fetching items:', itemsError)
        }

        const saleObj = sale as Record<string, unknown>
        setSelectedSale({ 
          ...saleObj, 
          items: (items || []) as SaleItem[],
          cashier: { full_name_ar: cashierName, full_name: cashierName }
        } as SaleDetails)
        setShowDetails(true)
      }
    } catch (err) {
      console.error('Error:', err)
      alert('حدث خطأ غير متوقع')
    }
  }

  // Print invoice
  const handlePrint = async (saleId: string) => {
    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(name_ar, phone),
          branch:branches(name_ar)
        `)
        .eq('id', saleId)
        .single()

      if (saleError) {
        console.error('Error fetching sale for print:', saleError)
        alert('حدث خطأ في جلب بيانات الفاتورة للطباعة: ' + saleError.message)
        return
      }

      if (sale) {
        // Get cashier name separately
        let cashierName = ''
        const saleData = sale as { cashier_id?: string; customer_id?: string; customer?: { name_ar?: string; phone?: string }; customer_name?: string; branch?: { name_ar?: string } }
        if (saleData.cashier_id) {
          const { data: cashier } = await supabase
            .from('users')
            .select('full_name_ar, full_name')
            .eq('id', saleData.cashier_id)
            .single()
          const cashierData = cashier ? (cashier as { full_name_ar?: string; full_name?: string }) : null
          cashierName = cashierData?.full_name_ar || cashierData?.full_name || ''
        }

        const { data: items } = await supabase
          .from('sale_items')
          .select('*, product:products(name_ar)')
          .eq('sale_id', saleId)

        // Get customer's previous balance (before this sale)
        let customerPreviousBalance = 0
        if (saleData.customer_id) {
          const { data: customer } = await supabase
            .from('customers')
            .select('current_balance')
            .eq('id', saleData.customer_id)
            .single()
          
          if (customer) {
            const customerData = customer as { current_balance?: number }
            // Current balance includes this sale, so subtract this sale's remaining amount to get previous balance
            const saleDetails = sale as SaleDetails
            customerPreviousBalance = (customerData.current_balance || 0) - (saleDetails.remaining_amount || 0)
          }
        }

        const saleDetails = sale as SaleDetails
        printInvoice({
          invoice_number: saleDetails.invoice_number,
          invoice_date: saleDetails.invoice_date || saleDetails.created_at || '',
          customer_name: saleData.customer?.name_ar || saleData.customer_name,
          customer_phone: saleData.customer?.phone,
          customer_previous_balance: customerPreviousBalance > 0 ? customerPreviousBalance : undefined,
          items: (items || []).map((item: SaleItem & { product: { name_ar: string } }) => ({
            product_name: item.product?.name_ar || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          })),
          subtotal: saleDetails.subtotal || saleDetails.total_amount,
          discount_amount: saleDetails.discount_amount || 0,
          tax_amount: saleDetails.tax_amount || 0,
          total_amount: saleDetails.total_amount,
          paid_amount: saleDetails.paid_amount || 0,
          remaining_amount: saleDetails.remaining_amount || 0,
          payment_method: saleDetails.payment_method || 'cash',
          cashier_name: cashierName,
          branch_name: saleData.branch?.name_ar || '',
        })
      }
    } catch (err) {
      console.error('Error:', err)
      alert('حدث خطأ في الطباعة')
    }
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">المبيعات</h1>
          <p className="text-sm text-muted-foreground">إدارة فواتير المبيعات</p>
        </div>
        <Button onClick={() => navigate('/pos')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 ml-2" />
          <span className="hidden sm:inline">فاتورة جديدة</span>
          <span className="sm:hidden">جديد</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الفاتورة أو اسم العميل..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            
            {/* Tax Filter */}
            <select
              value={taxFilter}
              onChange={(e) => setTaxFilter(e.target.value as 'all' | 'with_tax' | 'without_tax')}
              className="px-3 py-2 border rounded-md bg-background text-sm"
              aria-label="فلتر الضريبة"
            >
              <option value="all">الكل (ضريبة)</option>
              <option value="with_tax">بضريبة</option>
              <option value="without_tax">بدون ضريبة</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'paid' | 'credit')}
              className="px-3 py-2 border rounded-md bg-background text-sm"
              aria-label="فلتر الدفع"
            >
              <option value="all">الكل (دفع)</option>
              <option value="paid">مدفوع</option>
              <option value="credit">آجل</option>
            </select>

            {/* Lifted Filter */}
            <select
              value={liftedFilter}
              onChange={(e) => setLiftedFilter(e.target.value as 'all' | 'lifted' | 'not_lifted')}
              className="px-3 py-2 border rounded-md bg-background text-sm"
              aria-label="فلتر الرفع"
            >
              <option value="all">الكل (رفع)</option>
              <option value="lifted">تم الرفع</option>
              <option value="not_lifted">لم يتم الرفع</option>
            </select>

            {/* Branch Filter */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background text-sm"
              aria-label="فلتر الفرع"
            >
              <option value="all">جميع المنافذ</option>
              {branches?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name_ar}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !sales?.length ? (
            <p className="text-center py-8 text-muted-foreground">لا توجد فواتير</p>
          ) : (
            <>
              <div className="mb-4 text-xs sm:text-sm text-muted-foreground">
                عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} من {totalCount} فاتورة
              </div>
              
              {/* Mobile Cards */}
              <div className="block md:hidden space-y-3">
                {sales.map((sale) => (
                  <Card key={sale.id} className="p-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm font-mono">{sale.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(sale.invoice_date || sale.created_at!)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => viewSaleDetails(sale.id)} title="عرض">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handlePrint(sale.id)} title="طباعة">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="text-muted-foreground">العميل: </span>
                          <span className="font-medium">{sale.customer?.name_ar || sale.customer_name || 'عميل نقدي'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">الفرع: </span>
                          <span className="font-medium">{sale.branch?.name_ar}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <span className="text-muted-foreground">الإجمالي: </span>
                            <span className="font-bold">{formatCurrency(sale.total_amount || 0)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">المدفوع: </span>
                            <span className="font-medium">{formatCurrency(sale.paid_amount || 0)}</span>
                          </div>
                          {(sale.remaining_amount || 0) > 0 && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">المتبقي: </span>
                              <span className="font-bold text-orange-600">{formatCurrency(sale.remaining_amount || 0)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${sale.has_tax ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {sale.has_tax ? 'بضريبة' : 'بدون'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${sale.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {sale.payment_status === 'paid' ? 'مدفوع' : 'آجل'}
                        </span>
                        <select
                          value={sale.is_lifted ? 'lifted' : 'not_lifted'}
                          onChange={(e) => handleLiftedChange(sale.id, e.target.value === 'lifted')}
                          className={`px-2 py-1 rounded-md text-xs border ${
                            sale.is_lifted 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <option value="lifted">تم الرفع</option>
                          <option value="not_lifted">لم يتم الرفع</option>
                        </select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-2">رقم الفاتورة</th>
                    <th className="text-right py-3 px-2">التاريخ</th>
                    <th className="text-right py-3 px-2">العميل</th>
                    <th className="text-right py-3 px-2">الفرع</th>
                    <th className="text-right py-3 px-2">الإجمالي</th>
                    <th className="text-right py-3 px-2">المدفوع</th>
                    <th className="text-right py-3 px-2">المتبقي</th>
                    <th className="text-right py-3 px-2">ضريبة</th>
                    <th className="text-right py-3 px-2">الدفع</th>
                    <th className="text-right py-3 px-2">الرفع</th>
                    <th className="text-right py-3 px-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono text-sm">{sale.invoice_number}</td>
                      <td className="py-3 px-2 text-sm">{formatDate(sale.invoice_date || sale.created_at!)}</td>
                      <td className="py-3 px-2 text-sm">{sale.customer?.name_ar || sale.customer_name || 'عميل نقدي'}</td>
                      <td className="py-3 px-2 text-sm">{sale.branch?.name_ar}</td>
                      <td className="py-3 px-2 text-sm">{formatCurrency(sale.total_amount || 0)}</td>
                      <td className="py-3 px-2 text-sm">{formatCurrency(sale.paid_amount || 0)}</td>
                      <td className="py-3 px-2 text-sm">
                        {(sale.remaining_amount || 0) > 0 ? (
                          <span className="text-orange-600 font-semibold">{formatCurrency(sale.remaining_amount || 0)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${sale.has_tax ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {sale.has_tax ? 'بضريبة' : 'بدون'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${sale.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {sale.payment_status === 'paid' ? 'مدفوع' : 'آجل'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <select
                          value={sale.is_lifted ? 'lifted' : 'not_lifted'}
                          onChange={(e) => handleLiftedChange(sale.id, e.target.value === 'lifted')}
                          className={`px-2 py-1 rounded-md text-xs border ${
                            sale.is_lifted 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <option value="lifted">تم الرفع</option>
                          <option value="not_lifted">لم يتم الرفع</option>
                        </select>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => viewSaleDetails(sale.id)} title="عرض التفاصيل" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handlePrint(sale.id)} title="طباعة" className="h-8 w-8">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="text-xs sm:text-sm"
                >
                  السابق
                </Button>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 sm:w-10 sm:h-10 p-0 text-xs sm:text-sm"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="text-xs sm:text-sm"
                >
                  التالي
                </Button>
              </div>
            )}
          </>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" onClose={() => setShowDetails(false)}>
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">تفاصيل الفاتورة - {selectedSale?.invoice_number}</DialogTitle>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div><span className="text-muted-foreground">التاريخ:</span> {formatDate(selectedSale.invoice_date)}</div>
                <div><span className="text-muted-foreground">العميل:</span> {selectedSale.customer?.name_ar || selectedSale.customer_name || 'عميل نقدي'}</div>
                <div><span className="text-muted-foreground">الفرع:</span> {selectedSale.branch?.name_ar}</div>
                <div><span className="text-muted-foreground">الكاشير:</span> {selectedSale.cashier?.full_name_ar || selectedSale.cashier?.full_name}</div>
                <div>
                  <span className="text-muted-foreground">نوع الفاتورة:</span>{' '}
                  <span className={`px-2 py-1 rounded-full text-xs ${selectedSale.has_tax ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                    {selectedSale.has_tax ? 'بضريبة' : 'بدون ضريبة'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">حالة الدفع:</span>{' '}
                  <span className={`px-2 py-1 rounded-full text-xs ${selectedSale.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {selectedSale.payment_status === 'paid' ? 'مدفوع' : 'آجل'}
                  </span>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[400px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-right py-2 px-2 sm:px-3">الصنف</th>
                      <th className="text-right py-2 px-2 sm:px-3">الكمية</th>
                      <th className="text-right py-2 px-2 sm:px-3">السعر</th>
                      <th className="text-right py-2 px-2 sm:px-3">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items?.map((item: SaleItem) => (
                      <tr key={item.id} className="border-t">
                        <td className="py-2 px-2 sm:px-3">{item.product?.name_ar}</td>
                        <td className="py-2 px-2 sm:px-3">{item.quantity}</td>
                        <td className="py-2 px-2 sm:px-3">{formatCurrency(item.unit_price)}</td>
                        <td className="py-2 px-2 sm:px-3">{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>المجموع الفرعي:</span><span>{formatCurrency(selectedSale.subtotal || selectedSale.total_amount)}</span></div>
                {selectedSale.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600"><span>الخصم:</span><span>-{formatCurrency(selectedSale.discount_amount)}</span></div>
                )}
                <div className="flex justify-between font-bold text-base sm:text-lg"><span>الإجمالي:</span><span>{formatCurrency(selectedSale.total_amount)}</span></div>
                <div className="flex justify-between"><span>المدفوع:</span><span>{formatCurrency(selectedSale.paid_amount)}</span></div>
                {selectedSale.remaining_amount > 0 && (
                  <div className="flex justify-between text-orange-600"><span>المتبقي:</span><span>{formatCurrency(selectedSale.remaining_amount)}</span></div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                {selectedSale.remaining_amount > 0 && (
                  <Button 
                    variant="outline"
                    onClick={() => setShowPaymentDialog(true)}
                    className="bg-green-50 hover:bg-green-100 w-full sm:w-auto"
                  >
                    إضافة دفعة
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowDetails(false)} className="w-full sm:w-auto">إغلاق</Button>
                <Button onClick={() => handlePrint(selectedSale.id)} className="w-full sm:w-auto">
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">إضافة دفعة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">المبلغ المتبقي</p>
              <p className="text-xl sm:text-2xl font-bold text-destructive">{formatCurrency(selectedSale?.remaining_amount || 0)}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">المبلغ المدفوع</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
                placeholder="أدخل المبلغ"
                autoFocus
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setShowPaymentDialog(false)
                setPaymentAmount('')
              }} className="w-full sm:w-auto">
                إلغاء
              </Button>
              <Button 
                onClick={handleAddPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                className="w-full sm:w-auto"
              >
                تأكيد الدفع
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  async function handleAddPayment() {
    if (!selectedSale) return

    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح')
      return
    }

    const remaining = selectedSale.remaining_amount || 0
    if (amount > remaining) {
      alert('المبلغ المدفوع أكبر من المبلغ المتبقي')
      return
    }

    try {
      const newPaidAmount = (selectedSale.paid_amount || 0) + amount
      const newRemainingAmount = (selectedSale.total_amount || 0) - newPaidAmount
      const newPaymentStatus = newRemainingAmount <= 0 ? 'paid' : 'credit'

      const { error } = await supabase
        .from('sales')
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          payment_status: newPaymentStatus
        } as never)
        .eq('id', selectedSale.id)

      if (error) throw error

      alert('تم إضافة الدفعة بنجاح')
      setShowPaymentDialog(false)
      setPaymentAmount('')
      
      // Refresh the sale details
      await viewSaleDetails(selectedSale.id)
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    } catch (error) {
      console.error('Error adding payment:', error)
      alert('حدث خطأ في إضافة الدفعة')
    }
  }
}
