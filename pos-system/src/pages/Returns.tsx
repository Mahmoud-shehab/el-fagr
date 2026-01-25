import { useState, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Search, Eye, RotateCcw, Trash2, Minus, Building2 } from 'lucide-react'

interface SalesReturnRow {
  id: string
  return_number: string
  return_date?: string
  created_at?: string
  sale?: { invoice_number?: string }
  customer?: { name?: string; name_ar?: string }
  total_amount?: number
  status?: string
}

interface PurchaseReturnRow {
  id: string
  return_number: string
  return_date?: string
  created_at?: string
  purchase?: { invoice_number?: string }
  supplier?: { name?: string; name_ar?: string }
  total_amount?: number
  status?: string
}

interface SaleRow {
  id: string
  invoice_number: string
  invoice_date?: string
  customer_name?: string
  total_amount?: number
  branch?: { name_ar?: string }
}

interface SaleItemRow {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  product?: { code: string; name_ar: string }
}

interface ReturnItem {
  id: string
  sale_item_id: string
  product_id: string
  product_name: string
  product_code: string
  original_quantity: number
  return_quantity: number
  unit_price: number
  total: number
}

interface PurchaseRow {
  id: string
  invoice_number: string
  invoice_date?: string
  supplier_invoice_number?: string
  total_amount?: number
  supplier?: { name_ar?: string; name?: string }
  branch?: { name_ar?: string }
}

interface PurchaseItemRow {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  product?: { code: string; name_ar: string }
}

interface PurchaseReturnItem {
  id: string
  purchase_item_id: string
  product_id: string
  product_name: string
  product_code: string
  original_quantity: number
  return_quantity: number
  unit_price: number
  total: number
}

const salesReturnStatus: Record<string, { label: string; color: string }> = {
  pending: { label: 'معلق', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'موافق عليه', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700' },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
}

const purchaseReturnStatus: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700' },
  approved: { label: 'موافق عليه', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
}

export default function Returns() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales')
  const [showNewReturn, setShowNewReturn] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: salesReturns, isLoading: loadingSales } = useQuery<SalesReturnRow[]>({
    queryKey: ['sales-returns', search],
    queryFn: async () => {
      let query = supabase
        .from('sales_returns')
        .select('*, customer:customers(name, name_ar), branch:branches(name_ar), sale:sales(invoice_number)')
        .order('created_at', { ascending: false })
      
      if (search) {
        query = query.ilike('return_number', `%${search}%`)
      }
      
      const { data } = await query.limit(50)
      return (data || []) as SalesReturnRow[]
    },
    enabled: activeTab === 'sales',
  })

  const { data: purchaseReturns, isLoading: loadingPurchases } = useQuery<PurchaseReturnRow[]>({
    queryKey: ['purchase-returns', search],
    queryFn: async () => {
      let query = supabase
        .from('purchase_returns')
        .select('*, supplier:suppliers(name, name_ar), branch:branches(name_ar), purchase:purchases(invoice_number)')
        .order('created_at', { ascending: false })
      
      if (search) {
        query = query.ilike('return_number', `%${search}%`)
      }
      
      const { data } = await query.limit(50)
      return (data || []) as PurchaseReturnRow[]
    },
    enabled: activeTab === 'purchases',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المرتجعات</h1>
          <p className="text-muted-foreground">إدارة مرتجعات المبيعات والمشتريات</p>
        </div>
        <Button onClick={() => setShowNewReturn(true)}>
          <Plus className="h-4 w-4 ml-2" />
          مرتجع جديد
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'sales' ? 'border-primary text-primary' : 'border-transparent hover:text-primary'
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          مرتجعات المبيعات
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'purchases' ? 'border-primary text-primary' : 'border-transparent hover:text-primary'
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          مرتجعات المشتريات
        </button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم المرتجع..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'sales' ? (
            loadingSales ? (
              <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
            ) : !salesReturns?.length ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد مرتجعات</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-2">رقم المرتجع</th>
                      <th className="text-right py-3 px-2">التاريخ</th>
                      <th className="text-right py-3 px-2">رقم الفاتورة</th>
                      <th className="text-right py-3 px-2">العميل</th>
                      <th className="text-right py-3 px-2">المبلغ</th>
                      <th className="text-right py-3 px-2">الحالة</th>
                      <th className="text-right py-3 px-2">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReturns.map((ret) => (
                      <tr key={ret.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-mono">{ret.return_number}</td>
                        <td className="py-3 px-2">{formatDate(ret.return_date || ret.created_at!)}</td>
                        <td className="py-3 px-2">{ret.sale?.invoice_number}</td>
                        <td className="py-3 px-2">{ret.customer?.name_ar || ret.customer?.name || '-'}</td>
                        <td className="py-3 px-2">{formatCurrency(ret.total_amount || 0)}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${salesReturnStatus[ret.status || 'pending'].color}`}>
                            {salesReturnStatus[ret.status || 'pending'].label}
                          </span>
                        </td>
                        <td className="py-3 px-2 flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedReturn(ret.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {ret.status === 'pending' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={async () => {
                                const { error } = await supabase
                                  .from('sales_returns')
                                  .update({ status: 'completed' })
                                  .eq('id', ret.id)
                                if (!error) {
                                  alert('تم تأكيد المرتجع!')
                                  queryClient.invalidateQueries({ queryKey: ['sales-returns'] })
                                }
                              }}
                            >
                              تأكيد
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            loadingPurchases ? (
              <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
            ) : !purchaseReturns?.length ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد مرتجعات</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-2">رقم المرتجع</th>
                      <th className="text-right py-3 px-2">التاريخ</th>
                      <th className="text-right py-3 px-2">رقم الفاتورة</th>
                      <th className="text-right py-3 px-2">المورد</th>
                      <th className="text-right py-3 px-2">المبلغ</th>
                      <th className="text-right py-3 px-2">الحالة</th>
                      <th className="text-right py-3 px-2">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseReturns.map((ret) => (
                      <tr key={ret.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-mono">{ret.return_number}</td>
                        <td className="py-3 px-2">{formatDate(ret.return_date || ret.created_at!)}</td>
                        <td className="py-3 px-2">{ret.purchase?.invoice_number}</td>
                        <td className="py-3 px-2">{ret.supplier?.name_ar || ret.supplier?.name}</td>
                        <td className="py-3 px-2">{formatCurrency(ret.total_amount || 0)}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${purchaseReturnStatus[ret.status || 'draft'].color}`}>
                            {purchaseReturnStatus[ret.status || 'draft'].label}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedReturn(ret.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* New Return Dialog */}
      <Dialog open={showNewReturn} onOpenChange={setShowNewReturn}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {activeTab === 'sales' ? 'مرتجع مبيعات جديد' : 'مرتجع مشتريات جديد'}
            </DialogTitle>
          </DialogHeader>
          {activeTab === 'sales' ? (
            <NewSalesReturnForm 
              onClose={() => setShowNewReturn(false)}
              onSuccess={() => setShowNewReturn(false)}
            />
          ) : (
            <NewPurchaseReturnForm 
              onClose={() => setShowNewReturn(false)}
              onSuccess={() => setShowNewReturn(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Return Dialog */}
      {selectedReturn && (
        <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل المرتجع</DialogTitle>
            </DialogHeader>
            <ReturnDetails 
              returnId={selectedReturn}
              returnType={activeTab}
              onClose={() => setSelectedReturn(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function NewSalesReturnForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItemRow[]>([])
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  const [returnReason, setReturnReason] = useState('')
  const queryClient = useQueryClient()

  // Search for sales
  const { data: sales } = useQuery<SaleRow[]>({
    queryKey: ['return-sales-search', invoiceSearch],
    queryFn: async () => {
      if (!invoiceSearch) return []
      const { data } = await supabase
        .from('sales')
        .select('*, branch:branches(name_ar)')
        .or(`invoice_number.ilike.%${invoiceSearch}%`)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(10)
      return (data || []) as SaleRow[]
    },
    enabled: invoiceSearch.length > 0,
  })

  // Load sale items when sale is selected
  const loadSaleItems = async (saleId: string) => {
    const { data } = await supabase
      .from('sale_items')
      .select('*, product:products(code, name_ar)')
      .eq('sale_id', saleId)
    
    if (data) {
      setSaleItems(data as SaleItemRow[])
      // Initialize return items
      setReturnItems(data.map((item: SaleItemRow) => ({
        id: crypto.randomUUID(),
        sale_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product?.name_ar || '',
        product_code: item.product?.code || '',
        original_quantity: item.quantity,
        return_quantity: 0,
        unit_price: item.unit_price,
        total: 0,
      })))
    }
  }

  const selectSale = (sale: SaleRow) => {
    setSelectedSale(sale)
    loadSaleItems(sale.id)
    setInvoiceSearch('')
  }

  const updateReturnQuantity = (itemId: string, quantity: number) => {
    setReturnItems(returnItems.map(item => {
      if (item.id === itemId) {
        const qty = Math.max(0, Math.min(quantity, item.original_quantity))
        return { ...item, return_quantity: qty, total: qty * item.unit_price }
      }
      return item
    }))
  }

  const removeItem = (itemId: string) => {
    setReturnItems(returnItems.filter(item => item.id !== itemId))
  }

  const totalAmount = returnItems.reduce((sum, item) => sum + item.total, 0)
  const totalItems = returnItems.filter(item => item.return_quantity > 0).length

  // Create return mutation
  const createReturn = useMutation({
    mutationFn: async () => {
      if (!selectedSale) throw new Error('الرجاء اختيار فاتورة')
      
      const itemsToReturn = returnItems.filter(item => item.return_quantity > 0)
      if (itemsToReturn.length === 0) throw new Error('الرجاء تحديد كميات للإرجاع')

      // Get current user
      const { data: users } = await supabase.from('users').select('id').limit(1)
      const userId = (users as { id: string }[] | null)?.[0]?.id
      
      if (!userId) throw new Error('المستخدم غير موجود')

      const returnNumber = `SR-${Date.now()}`

      // Create sales return
      const returnData = {
        return_number: returnNumber,
        return_date: new Date().toISOString(),
        sale_id: selectedSale.id,
        branch_id: selectedSale.branch?.name_ar ? null : null,
        customer_id: null,
        requested_by: userId,
        total_amount: totalAmount,
        refund_amount: totalAmount,
        status: 'pending',
      }

      // Get branch_id from sale
      const { data: saleData } = await supabase
        .from('sales')
        .select('branch_id, customer_id')
        .eq('id', selectedSale.id)
        .single()

      if (saleData) {
        returnData.branch_id = (saleData as any).branch_id
        returnData.customer_id = (saleData as any).customer_id
      }
      
      const { data: returnRecord, error: returnError } = await supabase
        .from('sales_returns')
        .insert(returnData as never)
        .select()
        .single()

      if (returnError) throw returnError

      // Create return items - try different possible column names
      const returnItemsData = itemsToReturn.map(item => ({
        return_id: (returnRecord as { id: string }).id,
        sale_item_id: item.sale_item_id,
        product_id: item.product_id,
        quantity: item.return_quantity,
        unit_price: item.unit_price,
        total_price: item.total,
      }))

      const { error: itemsError } = await supabase
        .from('sales_return_items')
        .insert(returnItemsData as never)

      if (itemsError) throw itemsError

      // Update inventory - add back quantities
      const branchId = returnData.branch_id
      if (branchId) {
        for (const item of itemsToReturn) {
          const { data: existingInv } = await supabase
            .from('inventory')
            .select('id, quantity')
            .eq('product_id', item.product_id)
            .eq('branch_id', branchId)
            .single()

          if (existingInv) {
            await supabase
              .from('inventory')
              .update({ 
                quantity: (existingInv.quantity || 0) + item.return_quantity 
              } as any)
              .eq('id', existingInv.id)
          }
        }
      }

      return returnRecord
    },
    onSuccess: () => {
      alert('تم إنشاء المرتجع بنجاح!')
      queryClient.invalidateQueries({ queryKey: ['sales-returns'] })
      onSuccess()
    },
    onError: (error: Error) => {
      alert('حدث خطأ: ' + error.message)
    },
  })

  return (
    <div className="space-y-4">
      {/* Invoice Search */}
      {!selectedSale ? (
        <div>
          <label className="text-sm font-medium mb-2 block">بحث عن فاتورة</label>
          <Input
            value={invoiceSearch}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInvoiceSearch(e.target.value)}
            placeholder="رقم الفاتورة..."
            autoFocus
          />
          {sales && sales.length > 0 && (
            <div className="mt-2 border rounded-md max-h-60 overflow-auto">
              {sales.map((sale) => (
                <button
                  type="button"
                  key={sale.id}
                  className="w-full p-3 text-right hover:bg-muted flex justify-between items-center border-b"
                  onClick={() => selectSale(sale)}
                >
                  <div>
                    <p className="font-medium">{sale.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(sale.invoice_date)} - {sale.customer_name || 'عميل نقدي'}
                    </p>
                  </div>
                  <p className="font-bold">{formatCurrency(sale.total_amount || 0)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Selected Sale Info */}
          <div className="bg-muted p-4 rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg">{selectedSale.invoice_number}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedSale.invoice_date)} - {selectedSale.customer_name || 'عميل نقدي'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedSale(null); setReturnItems([]) }}>
                تغيير الفاتورة
              </Button>
            </div>
          </div>

          {/* Return Reason */}
          <div>
            <label className="text-sm font-medium mb-2 block">سبب الإرجاع (اختياري)</label>
            <Input
              value={returnReason}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setReturnReason(e.target.value)}
              placeholder="سبب الإرجاع..."
            />
          </div>

          {/* Return Items */}
          <div className="border rounded-md p-4">
            <h3 className="font-medium mb-3">المنتجات</h3>
            <div className="space-y-2">
              {returnItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.product_code} - الكمية الأصلية: {item.original_quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={() => updateReturnQuantity(item.id, item.return_quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.return_quantity}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        updateReturnQuantity(item.id, parseInt(e.target.value) || 0)
                      }
                      className="w-16 h-8 text-center"
                      min={0}
                      max={item.original_quantity}
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={() => updateReturnQuantity(item.id, item.return_quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="font-bold w-24 text-left">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>عدد المنتجات المرتجعة</span>
              <span className="font-bold">{totalItems}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>إجمالي المبلغ المرتجع</span>
              <span className="text-primary">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button 
              onClick={() => createReturn.mutate()}
              disabled={createReturn.isPending || totalItems === 0}
            >
              <RotateCcw className="h-4 w-4 ml-2" />
              إنشاء المرتجع
            </Button>
          </div>
        </>
      )}
    </div>
  )
}


function NewPurchaseReturnForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRow | null>(null)
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemRow[]>([])
  const [returnItems, setReturnItems] = useState<PurchaseReturnItem[]>([])
  const [returnReason, setReturnReason] = useState('')
  const queryClient = useQueryClient()

  // Search for purchases
  const { data: purchases } = useQuery<PurchaseRow[]>({
    queryKey: ['return-purchases-search', invoiceSearch],
    queryFn: async () => {
      if (!invoiceSearch) return []
      const { data } = await supabase
        .from('purchases')
        .select('*, supplier:suppliers(name, name_ar), branch:branches(name_ar)')
        .or(`invoice_number.ilike.%${invoiceSearch}%,supplier_invoice_number.ilike.%${invoiceSearch}%`)
        .eq('status', 'received')
        .order('created_at', { ascending: false })
        .limit(10)
      return (data || []) as PurchaseRow[]
    },
    enabled: invoiceSearch.length > 0,
  })

  // Load purchase items when purchase is selected
  const loadPurchaseItems = async (purchaseId: string) => {
    const { data } = await supabase
      .from('purchase_items')
      .select('*, product:products(code, name_ar)')
      .eq('purchase_id', purchaseId)
    
    if (data) {
      setPurchaseItems(data as PurchaseItemRow[])
      // Initialize return items
      setReturnItems(data.map((item: PurchaseItemRow) => ({
        id: crypto.randomUUID(),
        purchase_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product?.name_ar || '',
        product_code: item.product?.code || '',
        original_quantity: item.quantity,
        return_quantity: 0,
        unit_price: item.unit_price,
        total: 0,
      })))
    }
  }

  const selectPurchase = (purchase: PurchaseRow) => {
    setSelectedPurchase(purchase)
    loadPurchaseItems(purchase.id)
    setInvoiceSearch('')
  }

  const updateReturnQuantity = (itemId: string, quantity: number) => {
    setReturnItems(returnItems.map(item => {
      if (item.id === itemId) {
        const qty = Math.max(0, Math.min(quantity, item.original_quantity))
        return { ...item, return_quantity: qty, total: qty * item.unit_price }
      }
      return item
    }))
  }

  const totalAmount = returnItems.reduce((sum, item) => sum + item.total, 0)
  const totalItems = returnItems.filter(item => item.return_quantity > 0).length

  // Create return mutation
  const createReturn = useMutation({
    mutationFn: async () => {
      if (!selectedPurchase) throw new Error('الرجاء اختيار فاتورة شراء')
      
      const itemsToReturn = returnItems.filter(item => item.return_quantity > 0)
      if (itemsToReturn.length === 0) throw new Error('الرجاء تحديد كميات للإرجاع')

      const returnNumber = `PR-${Date.now()}`

      // Get branch_id and supplier_id from purchase
      const { data: purchaseData } = await supabase
        .from('purchases')
        .select('branch_id, supplier_id')
        .eq('id', selectedPurchase.id)
        .single()

      if (!purchaseData) throw new Error('فاتورة الشراء غير موجودة')

      // Create purchase return
      const returnData = {
        return_number: returnNumber,
        return_date: new Date().toISOString(),
        purchase_id: selectedPurchase.id,
        branch_id: (purchaseData as any).branch_id,
        supplier_id: (purchaseData as any).supplier_id,
        total_amount: totalAmount,
        credit_amount: totalAmount,
        status: 'draft',
      }
      
      const { data: returnRecord, error: returnError } = await supabase
        .from('purchase_returns')
        .insert(returnData as never)
        .select()
        .single()

      if (returnError) throw returnError

      // Create return items
      const returnItemsData = itemsToReturn.map(item => ({
        purchase_return_id: (returnRecord as { id: string }).id,
        purchase_item_id: item.purchase_item_id,
        product_id: item.product_id,
        quantity: item.return_quantity,
        unit_price: item.unit_price,
        total_price: item.total,
      }))

      const { error: itemsError } = await supabase
        .from('purchase_return_items')
        .insert(returnItemsData as never)

      if (itemsError) throw itemsError

      // Update inventory - reduce quantities (returning to supplier)
      const branchId = (purchaseData as any).branch_id
      for (const item of itemsToReturn) {
        const { data: existingInv } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('product_id', item.product_id)
          .eq('branch_id', branchId)
          .single()

        if (existingInv) {
          await supabase
            .from('inventory')
            .update({ 
              quantity: Math.max(0, (existingInv.quantity || 0) - item.return_quantity)
            } as any)
            .eq('id', existingInv.id)
        }
      }

      return returnRecord
    },
    onSuccess: () => {
      alert('تم إنشاء مرتجع المشتريات بنجاح!')
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] })
      onSuccess()
    },
    onError: (error: Error) => {
      alert('حدث خطأ: ' + error.message)
    },
  })

  return (
    <div className="space-y-4">
      {/* Invoice Search */}
      {!selectedPurchase ? (
        <div>
          <label className="text-sm font-medium mb-2 block">بحث عن فاتورة شراء</label>
          <Input
            value={invoiceSearch}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInvoiceSearch(e.target.value)}
            placeholder="رقم الفاتورة أو رقم فاتورة المورد..."
            autoFocus
          />
          {purchases && purchases.length > 0 && (
            <div className="mt-2 border rounded-md max-h-60 overflow-auto">
              {purchases.map((purchase) => (
                <button
                  type="button"
                  key={purchase.id}
                  className="w-full p-3 text-right hover:bg-muted flex justify-between items-center border-b"
                  onClick={() => selectPurchase(purchase)}
                >
                  <div>
                    <p className="font-medium">{purchase.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(purchase.invoice_date)} - {purchase.supplier?.name_ar || purchase.supplier?.name}
                    </p>
                    {purchase.supplier_invoice_number && (
                      <p className="text-xs text-muted-foreground">
                        فاتورة المورد: {purchase.supplier_invoice_number}
                      </p>
                    )}
                  </div>
                  <p className="font-bold">{formatCurrency(purchase.total_amount || 0)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Selected Purchase Info */}
          <div className="bg-muted p-4 rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg">{selectedPurchase.invoice_number}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedPurchase.invoice_date)} - {selectedPurchase.supplier?.name_ar || selectedPurchase.supplier?.name}
                </p>
                {selectedPurchase.supplier_invoice_number && (
                  <p className="text-xs text-muted-foreground">
                    فاتورة المورد: {selectedPurchase.supplier_invoice_number}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedPurchase(null); setReturnItems([]) }}>
                تغيير الفاتورة
              </Button>
            </div>
          </div>

          {/* Return Reason */}
          <div>
            <label className="text-sm font-medium mb-2 block">سبب الإرجاع (اختياري)</label>
            <Input
              value={returnReason}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setReturnReason(e.target.value)}
              placeholder="سبب الإرجاع للمورد..."
            />
          </div>

          {/* Return Items */}
          <div className="border rounded-md p-4">
            <h3 className="font-medium mb-3">المنتجات</h3>
            <div className="space-y-2">
              {returnItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.product_code} - الكمية المشتراة: {item.original_quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={() => updateReturnQuantity(item.id, item.return_quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.return_quantity}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => 
                        updateReturnQuantity(item.id, parseInt(e.target.value) || 0)
                      }
                      className="w-16 h-8 text-center"
                      min={0}
                      max={item.original_quantity}
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={() => updateReturnQuantity(item.id, item.return_quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="font-bold w-24 text-left">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>عدد المنتجات المرتجعة</span>
              <span className="font-bold">{totalItems}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>إجمالي المبلغ المرتجع</span>
              <span className="text-primary">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button 
              onClick={() => createReturn.mutate()}
              disabled={createReturn.isPending || totalItems === 0}
            >
              <RotateCcw className="h-4 w-4 ml-2" />
              إنشاء المرتجع
            </Button>
          </div>
        </>
      )}
    </div>
  )
}


function ReturnDetails({ returnId, returnType, onClose }: { returnId: string; returnType: 'sales' | 'purchases'; onClose: () => void }) {
  const tableName = returnType === 'sales' ? 'sales_returns' : 'purchase_returns'
  const itemsTable = returnType === 'sales' ? 'sales_return_items' : 'purchase_return_items'
  
  const { data: returnData } = useQuery({
    queryKey: ['return-details', returnId, returnType],
    queryFn: async () => {
      const { data } = await supabase
        .from(tableName)
        .select(`
          *,
          ${returnType === 'sales' ? 'sale:sales(invoice_number), customer:customers(name_ar, phone)' : 'purchase:purchases(invoice_number), supplier:suppliers(name_ar, phone)'},
          branch:branches(name_ar)
        `)
        .eq('id', returnId)
        .single()
      return data
    },
  })

  const { data: items } = useQuery({
    queryKey: ['return-items', returnId, returnType],
    queryFn: async () => {
      const { data } = await supabase
        .from(itemsTable)
        .select(`
          *,
          product:products(code, name_ar)
        `)
        .eq('return_id', returnId)
      return data
    },
  })

  if (!returnData) return <div className="text-center py-8">جاري التحميل...</div>

  const statusLabels = returnType === 'sales' ? salesReturnStatus : purchaseReturnStatus

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-md">
        <div>
          <p className="text-sm text-muted-foreground">رقم المرتجع</p>
          <p className="font-bold">{returnData.return_number}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">التاريخ</p>
          <p className="font-bold">{formatDate(returnData.return_date)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {returnType === 'sales' ? 'رقم الفاتورة' : 'رقم فاتورة الشراء'}
          </p>
          <p className="font-bold">
            {returnType === 'sales' ? returnData.sale?.invoice_number : returnData.purchase?.invoice_number}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {returnType === 'sales' ? 'العميل' : 'المورد'}
          </p>
          <p className="font-bold">
            {returnType === 'sales' 
              ? (returnData.customer?.name_ar || 'عميل نقدي')
              : returnData.supplier?.name_ar
            }
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">الفرع</p>
          <p className="font-bold">{returnData.branch?.name_ar}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">الحالة</p>
          <span className={`px-2 py-1 rounded-full text-xs ${statusLabels[returnData.status || 'pending'].color}`}>
            {statusLabels[returnData.status || 'pending'].label}
          </span>
        </div>
      </div>

      {/* Items */}
      <div>
        <h3 className="font-bold mb-3">المنتجات المرتجعة</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-right py-2">الكود</th>
              <th className="text-right py-2">المنتج</th>
              <th className="text-center py-2">الكمية</th>
              <th className="text-right py-2">السعر</th>
              <th className="text-right py-2">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((item: any) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.product?.code}</td>
                <td className="py-2">{item.product?.name_ar}</td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2">{formatCurrency(item.unit_price)}</td>
                <td className="py-2">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-lg font-bold">
          <span>إجمالي المبلغ المرتجع</span>
          <span className="text-primary">{formatCurrency(returnData.total_amount || 0)}</span>
        </div>
        {returnType === 'sales' && (
          <div className="flex justify-between">
            <span>المبلغ المسترد</span>
            <span className="font-bold text-green-600">{formatCurrency(returnData.refund_amount || 0)}</span>
          </div>
        )}
        {returnType === 'purchases' && (
          <div className="flex justify-between">
            <span>المبلغ المستحق</span>
            <span className="font-bold text-green-600">{formatCurrency(returnData.credit_amount || 0)}</span>
          </div>
        )}
      </div>

      {/* Close Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={onClose}>
          إغلاق
        </Button>
      </div>
    </div>
  )
}
