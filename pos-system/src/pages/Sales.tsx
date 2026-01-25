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

interface SaleRow {
  id: string
  invoice_number: string
  invoice_date?: string
  created_at?: string
  customer_name?: string
  total_amount?: number
  paid_amount?: number
  status?: string
  has_tax?: boolean
  payment_status?: string
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', search, taxFilter, paymentFilter],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select('*, customer:customers(name, name_ar), branch:branches(name_ar)')
        .order('created_at', { ascending: false })
      
      if (search) {
        query = query.or(`invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`)
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
      
      const { data } = await query.limit(50)
      return (data || []) as SaleRow[]
    },
  })

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
        const saleData = sale as { cashier_id?: string; customer?: { name_ar?: string; phone?: string }; customer_name?: string; branch?: { name_ar?: string } }
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

        const saleDetails = sale as SaleDetails
        printInvoice({
          invoice_number: saleDetails.invoice_number,
          invoice_date: saleDetails.invoice_date || saleDetails.created_at || '',
          customer_name: saleData.customer?.name_ar || saleData.customer_name,
          customer_phone: saleData.customer?.phone,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المبيعات</h1>
          <p className="text-muted-foreground">إدارة فواتير المبيعات</p>
        </div>
        <Button onClick={() => navigate('/pos')}>
          <Plus className="h-4 w-4 ml-2" />
          فاتورة جديدة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
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
              className="px-3 py-2 border rounded-md bg-background"
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
              className="px-3 py-2 border rounded-md bg-background"
              aria-label="فلتر الدفع"
            >
              <option value="all">الكل (دفع)</option>
              <option value="paid">مدفوع</option>
              <option value="credit">آجل</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !sales?.length ? (
            <p className="text-center py-8 text-muted-foreground">لا توجد فواتير</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-2">رقم الفاتورة</th>
                    <th className="text-right py-3 px-2">التاريخ</th>
                    <th className="text-right py-3 px-2">العميل</th>
                    <th className="text-right py-3 px-2">الفرع</th>
                    <th className="text-right py-3 px-2">الإجمالي</th>
                    <th className="text-right py-3 px-2">المدفوع</th>
                    <th className="text-right py-3 px-2">ضريبة</th>
                    <th className="text-right py-3 px-2">الدفع</th>
                    <th className="text-right py-3 px-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono">{sale.invoice_number}</td>
                      <td className="py-3 px-2">{formatDate(sale.invoice_date || sale.created_at!)}</td>
                      <td className="py-3 px-2">{sale.customer?.name_ar || sale.customer_name || 'عميل نقدي'}</td>
                      <td className="py-3 px-2">{sale.branch?.name_ar}</td>
                      <td className="py-3 px-2">{formatCurrency(sale.total_amount || 0)}</td>
                      <td className="py-3 px-2">{formatCurrency(sale.paid_amount || 0)}</td>
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
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => viewSaleDetails(sale.id)} title="عرض التفاصيل">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handlePrint(sale.id)} title="طباعة">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl" onClose={() => setShowDetails(false)}>
          <DialogHeader>
            <DialogTitle>تفاصيل الفاتورة - {selectedSale?.invoice_number}</DialogTitle>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
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

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-right py-2 px-3">الصنف</th>
                      <th className="text-right py-2 px-3">الكمية</th>
                      <th className="text-right py-2 px-3">السعر</th>
                      <th className="text-right py-2 px-3">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items?.map((item: SaleItem) => (
                      <tr key={item.id} className="border-t">
                        <td className="py-2 px-3">{item.product?.name_ar}</td>
                        <td className="py-2 px-3">{item.quantity}</td>
                        <td className="py-2 px-3">{formatCurrency(item.unit_price)}</td>
                        <td className="py-2 px-3">{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between"><span>المجموع الفرعي:</span><span>{formatCurrency(selectedSale.subtotal || selectedSale.total_amount)}</span></div>
                {selectedSale.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600"><span>الخصم:</span><span>-{formatCurrency(selectedSale.discount_amount)}</span></div>
                )}
                <div className="flex justify-between font-bold text-lg"><span>الإجمالي:</span><span>{formatCurrency(selectedSale.total_amount)}</span></div>
                <div className="flex justify-between"><span>المدفوع:</span><span>{formatCurrency(selectedSale.paid_amount)}</span></div>
                {selectedSale.remaining_amount > 0 && (
                  <div className="flex justify-between text-orange-600"><span>المتبقي:</span><span>{formatCurrency(selectedSale.remaining_amount)}</span></div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                {selectedSale.remaining_amount > 0 && (
                  <Button 
                    variant="outline"
                    onClick={() => setShowPaymentDialog(true)}
                    className="bg-green-50 hover:bg-green-100"
                  >
                    إضافة دفعة
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowDetails(false)}>إغلاق</Button>
                <Button onClick={() => handlePrint(selectedSale.id)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة دفعة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">المبلغ المتبقي</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(selectedSale?.remaining_amount || 0)}</p>
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
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setShowPaymentDialog(false)
                setPaymentAmount('')
              }}>
                إلغاء
              </Button>
              <Button 
                onClick={handleAddPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
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
