import React, { useState, ChangeEvent, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReactToPrint } from 'react-to-print'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Search, Eye, Trash2, ShoppingBag, Building2, User, Minus, Printer } from 'lucide-react'
import PurchaseInvoicePrint from '@/components/PurchaseInvoicePrint'

interface PurchaseRow {
  id: string
  invoice_number: string
  invoice_date?: string
  created_at?: string
  supplier?: { name?: string; name_ar?: string }
  branch?: { name_ar?: string }
  total_amount?: number
  paid_amount?: number
  status?: string
  has_tax?: boolean
  payment_status?: string
}

interface BranchRow { 
  id: string
  name_ar: string
  branch_type?: string
}

interface SupplierRow { 
  id: string
  code: string
  name_ar?: string
  name?: string
  phone?: string
}

interface ProductRow { 
  id: string
  code: string
  name_ar: string
  purchase_price?: number
}

interface PurchaseItem { 
  id: string
  product: ProductRow
  quantity: number
  unit_price: number
  total: number
}

export default function Purchases() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewPurchase, setShowNewPurchase] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<string | null>(null)
  const [printPurchaseId, setPrintPurchaseId] = useState<string | null>(null)
  const [taxFilter, setTaxFilter] = useState<'all' | 'with_tax' | 'without_tax'>('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'credit'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const queryClient = useQueryClient()
  const printRef = useRef<HTMLDivElement>(null)

  // Fetch purchases
  const { data: purchasesData } = useQuery<{ purchases: PurchaseRow[]; totalCount: number; totalPages: number }>({
    queryKey: ['purchases', searchTerm, taxFilter, paymentFilter, currentPage],
    queryFn: async () => {
      // Get total count
      let countQuery = supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true })
      
      if (searchTerm) {
        countQuery = countQuery.or(`invoice_number.ilike.%${searchTerm}%`)
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

      const { count } = await countQuery

      // Get paginated data
      let query = supabase
        .from('purchases')
        .select('*, supplier:suppliers(name, name_ar), branch:branches(name_ar)')
        .order('created_at', { ascending: false })
      
      if (searchTerm) {
        query = query.or(`invoice_number.ilike.%${searchTerm}%`)
      }
      if (taxFilter === 'with_tax') {
        query = query.eq('has_tax', true)
      } else if (taxFilter === 'without_tax') {
        query = query.eq('has_tax', false)
      }
      if (paymentFilter === 'paid') {
        query = query.eq('payment_status', 'paid')
      } else if (paymentFilter === 'credit') {
        query = query.eq('payment_status', 'credit')
      }
      
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      
      const { data } = await query.range(from, to)
      
      return {
        purchases: (data || []) as PurchaseRow[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage)
      }
    },
  })

  const purchases = purchasesData?.purchases || []
  const totalPages = purchasesData?.totalPages || 1
  const totalCount = purchasesData?.totalCount || 0

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, taxFilter, paymentFilter])

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">المشتريات</h1>
        <Button onClick={() => setShowNewPurchase(true)}>
          <Plus className="ml-2 h-4 w-4" />
          فاتورة شراء جديدة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="بحث في المشتريات..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
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
          {!purchases || purchases.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              لا توجد مشتريات حالياً
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} من {totalCount} فاتورة
              </div>
              <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-3">رقم الفاتورة</th>
                  <th className="text-right py-3">التاريخ</th>
                  <th className="text-right py-3">المورد</th>
                  <th className="text-right py-3">الفرع</th>
                  <th className="text-right py-3">الإجمالي</th>
                  <th className="text-right py-3">المدفوع</th>
                  <th className="text-right py-3">ضريبة</th>
                  <th className="text-right py-3">الدفع</th>
                  <th className="text-center py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b hover:bg-muted/50">
                    <td className="py-3">{purchase.invoice_number}</td>
                    <td className="py-3">{formatDate(purchase.invoice_date || purchase.created_at || '')}</td>
                    <td className="py-3">{purchase.supplier?.name_ar || purchase.supplier?.name}</td>
                    <td className="py-3">{purchase.branch?.name_ar}</td>
                    <td className="py-3">{formatCurrency(purchase.total_amount || 0)}</td>
                    <td className="py-3">{formatCurrency(purchase.paid_amount || 0)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${purchase.has_tax ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {purchase.has_tax ? 'بضريبة' : 'بدون'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${purchase.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {purchase.payment_status === 'paid' ? 'مدفوع' : 'آجل'}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedPurchase(purchase.id)}
                          title="عرض التفاصيل"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setPrintPurchaseId(purchase.id)}
                          title="طباعة"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  السابق
                </Button>
                
                <div className="flex items-center gap-2">
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
                        className="w-10"
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
                >
                  التالي
                </Button>
              </div>
            )}
          </>
          )}
        </CardContent>
      </Card>

      {/* New Purchase Dialog */}
      <Dialog open={showNewPurchase} onOpenChange={setShowNewPurchase}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>فاتورة شراء جديدة</DialogTitle>
          </DialogHeader>
          <NewPurchaseForm 
            onClose={() => setShowNewPurchase(false)}
            onSuccess={() => {
              setShowNewPurchase(false)
              queryClient.invalidateQueries({ queryKey: ['purchases'] })
            }}
          />
        </DialogContent>
      </Dialog>

      {/* View Purchase Dialog */}
      {selectedPurchase && (
        <Dialog open={!!selectedPurchase} onOpenChange={() => setSelectedPurchase(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل فاتورة الشراء</DialogTitle>
            </DialogHeader>
            <PurchaseDetails 
              purchaseId={selectedPurchase} 
              onClose={() => setSelectedPurchase(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Print Purchase */}
      {printPurchaseId && <PrintPurchase purchaseId={printPurchaseId} onClose={() => setPrintPurchaseId(null)} />}
    </div>
  )
}

function NewPurchaseForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [paidAmount, setPaidAmount] = useState('')
  const [expensesUsd, setExpensesUsd] = useState('')
  const [hasTax, setHasTax] = useState(false)
  const [showBranchSelect, setShowBranchSelect] = useState(false)
  const [showSupplierSelect, setShowSupplierSelect] = useState(false)

  // Fetch USD exchange rate
  const { data: usdRate } = useQuery<number>({
    queryKey: ['usd-rate'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'usd_exchange_rate')
        .single()
      const value = data ? (data as { value?: string }).value : '50'
      return parseFloat(value || '50')
    },
  })

  // Fetch branches
  const { data: branches } = useQuery<BranchRow[]>({
    queryKey: ['purchase-branches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('status', 'active')
        .order('name_ar')
      return (data || []) as BranchRow[]
    },
  })

  // Fetch suppliers
  const { data: suppliers } = useQuery<SupplierRow[]>({
    queryKey: ['purchase-suppliers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active')
        .order('name_ar')
      return (data || []) as SupplierRow[]
    },
  })

  // Fetch products
  const { data: products } = useQuery<ProductRow[]>({
    queryKey: ['purchase-products', productSearch],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('name_ar')
      
      if (productSearch) {
        query = query.or(`code.ilike.%${productSearch}%,name_ar.ilike.%${productSearch}%`)
      }
      
      const { data } = await query.limit(20)
      return (data || []) as ProductRow[]
    },
  })

  const selectedBranch = branches?.find(b => b.id === selectedBranchId)
  const selectedSupplier = suppliers?.find(s => s.id === selectedSupplierId)

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const expensesUsdValue = parseFloat(expensesUsd) || 0
  const expensesEgp = expensesUsdValue * (usdRate || 50)
  const totalWithExpenses = subtotal + expensesEgp
  const paid = parseFloat(paidAmount) || 0
  const remaining = totalWithExpenses - paid

  // Add product to items
  const addProduct = (product: ProductRow) => {
    const existingItem = items.find(item => item.product.id === product.id)
    if (existingItem) {
      setItems(items.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
          : item
      ))
    } else {
      const newItem: PurchaseItem = {
        id: crypto.randomUUID(),
        product,
        quantity: 1,
        unit_price: product.purchase_price || 0,
        total: product.purchase_price || 0,
      }
      setItems([...items, newItem])
    }
    setProductSearch('')
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQty, total: newQty * item.unit_price }
      }
      return item
    }))
  }

  const updatePrice = (itemId: string, price: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        return { ...item, unit_price: price, total: item.quantity * price }
      }
      return item
    }))
  }

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId))
  }

  // Create purchase mutation
  const createPurchase = useMutation({
    mutationFn: async () => {
      if (!selectedBranchId || !selectedSupplierId) {
        throw new Error('الرجاء اختيار الفرع والمورد')
      }
      if (items.length === 0) {
        throw new Error('الرجاء إضافة منتجات')
      }

      // Get current user
      const { data: users } = await supabase.from('users').select('id').limit(1)
      const userId = (users as { id: string }[] | null)?.[0]?.id
      
      if (!userId) throw new Error('المستخدم غير موجود')

      const invoiceNumber = `PUR-${Date.now()}`

      // Determine payment status
      const paymentStatus = remaining > 0 ? 'credit' : 'paid'

      // Create purchase
      const purchaseData = {
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString(),
        supplier_invoice_number: supplierInvoiceNumber || null,
        branch_id: selectedBranchId,
        supplier_id: selectedSupplierId,
        received_by: userId,
        subtotal,
        expenses_usd: expensesUsdValue || null,
        expenses_egp: expensesEgp || null,
        has_tax: hasTax,
        payment_status: paymentStatus,
        total_amount: totalWithExpenses,
        paid_amount: paid,
        remaining_amount: remaining > 0 ? remaining : 0,
        status: 'received',
      }
      
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert(purchaseData as never)
        .select()
        .single()

      if (purchaseError) throw purchaseError

      // Create purchase items
      const purchaseItems = items.map(item => ({
        purchase_id: (purchase as { id: string }).id,
        product_id: item.product.id,
        quantity: item.quantity,
        received_quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total,
      }))

      const { error: itemsError } = await supabase.from('purchase_items').insert(purchaseItems as never)
      if (itemsError) throw itemsError

      // Update inventory - add quantities
      for (const item of items) {
        // Check if inventory record exists
        const { data: existingInv } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('product_id', item.product.id)
          .eq('branch_id', selectedBranchId)
          .single()

        if (existingInv) {
          // Update existing
          await supabase
            .from('inventory')
            .update({ 
              quantity: ((existingInv as { quantity?: number }).quantity || 0) + item.quantity 
            } as never)
            .eq('id', (existingInv as { id: string }).id)
        } else {
          // Create new
          await supabase
            .from('inventory')
            .insert({
              product_id: item.product.id,
              branch_id: selectedBranchId,
              quantity: item.quantity,
            } as never)
        }
      }

      return purchase
    },
    onSuccess: () => {
      alert('تم حفظ فاتورة الشراء بنجاح!')
      onSuccess()
    },
    onError: (error: Error) => {
      alert('حدث خطأ: ' + error.message)
    },
  })

  return (
    <div className="space-y-4">
      {/* Branch and Supplier Selection */}
      <div className="grid grid-cols-2 gap-4">
        {/* Branch */}
        <div className="relative">
          <label className="text-sm font-medium mb-2 block">الفرع</label>
          <div 
            className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-muted"
            onClick={() => setShowBranchSelect(!showBranchSelect)}
          >
            <Building2 className="h-4 w-4" />
            <span className="flex-1">
              {selectedBranch ? selectedBranch.name_ar : 'اختر الفرع'}
            </span>
          </div>
          
          {showBranchSelect && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-60 overflow-auto">
              {branches?.map((branch) => (
                <button
                  type="button"
                  key={branch.id}
                  className="w-full p-3 text-right hover:bg-muted"
                  onClick={() => { 
                    setSelectedBranchId(branch.id)
                    setShowBranchSelect(false)
                  }}
                >
                  <p className="font-medium">{branch.name_ar}</p>
                  <p className="text-xs text-muted-foreground">
                    {branch.branch_type === 'warehouse' ? 'مخزن' : 'منفذ بيع'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Supplier */}
        <div className="relative">
          <label className="text-sm font-medium mb-2 block">المورد</label>
          <div 
            className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-muted"
            onClick={() => setShowSupplierSelect(!showSupplierSelect)}
          >
            <User className="h-4 w-4" />
            <span className="flex-1">
              {selectedSupplier ? selectedSupplier.name_ar || selectedSupplier.name : 'اختر المورد'}
            </span>
          </div>
          
          {showSupplierSelect && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-60 overflow-auto">
              {suppliers?.map((supplier) => (
                <button
                  type="button"
                  key={supplier.id}
                  className="w-full p-3 text-right hover:bg-muted"
                  onClick={() => { 
                    setSelectedSupplierId(supplier.id)
                    setShowSupplierSelect(false)
                  }}
                >
                  <p className="font-medium">{supplier.name_ar || supplier.name}</p>
                  <p className="text-xs text-muted-foreground">{supplier.phone}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Supplier Invoice Number and Tax */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">رقم فاتورة المورد (اختياري)</label>
          <Input
            value={supplierInvoiceNumber}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSupplierInvoiceNumber(e.target.value)}
            placeholder="رقم فاتورة المورد"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">نوع الفاتورة</label>
          <div className="flex items-center gap-4 h-10">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!hasTax}
                onChange={() => setHasTax(false)}
                className="w-4 h-4"
              />
              <span>بدون ضريبة</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={hasTax}
                onChange={() => setHasTax(true)}
                className="w-4 h-4"
              />
              <span>بضريبة</span>
            </label>
          </div>
        </div>
      </div>

      {/* Product Search */}
      <div>
        <label className="text-sm font-medium mb-2 block">إضافة منتجات</label>
        <Input
          value={productSearch}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setProductSearch(e.target.value)}
          placeholder="بحث عن منتج..."
          disabled={!selectedBranchId}
        />
        {productSearch && products && products.length > 0 && (
          <div className="mt-2 border rounded-md max-h-40 overflow-auto">
            {products.map((product) => (
              <button
                type="button"
                key={product.id}
                className="w-full p-2 text-right hover:bg-muted flex justify-between items-center"
                onClick={() => addProduct(product)}
              >
                <div>
                  <p className="font-medium">{product.name_ar}</p>
                  <p className="text-xs text-muted-foreground">{product.code}</p>
                </div>
                <p className="text-sm">{formatCurrency(product.purchase_price || 0)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="border rounded-md p-4">
        <h3 className="font-medium mb-3">المنتجات</h3>
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">لم يتم إضافة منتجات بعد</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.product.name_ar}</p>
                  <p className="text-xs text-muted-foreground">{item.product.code}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const newQty = parseInt(e.target.value) || 1
                      if (newQty < 1) return
                      setItems(items.map(purchaseItem => 
                        purchaseItem.id === item.id 
                          ? { ...purchaseItem, quantity: newQty, total: newQty * purchaseItem.unit_price }
                          : purchaseItem
                      ))
                    }}
                    className="w-16 h-7 text-center font-bold p-1"
                    min={1}
                  />
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  type="number"
                  value={item.unit_price}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                  className="w-24 h-8 text-center"
                />
                <span className="font-bold w-24 text-left">{formatCurrency(item.total)}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="border-t pt-4 space-y-3">
        <div className="flex justify-between">
          <span>المجموع الفرعي</span>
          <span className="font-bold">{formatCurrency(subtotal)}</span>
        </div>

        {/* Expenses in USD */}
        <div className="border rounded-lg p-3 bg-blue-50">
          <label className="text-sm font-medium mb-2 block">إجمالي المصاريف (بالدولار)</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.01"
              value={expensesUsd}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setExpensesUsd(e.target.value)}
              className="flex-1 h-10"
              placeholder="0.00"
            />
            <span className="text-sm font-medium">$</span>
          </div>
          {expensesUsdValue > 0 && (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">
                بالجنيه المصري (سعر الدولار: {usdRate || 50} جنيه)
              </span>
              <span className="font-bold text-blue-700">{formatCurrency(expensesEgp)}</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>الإجمالي الكلي</span>
          <span className="text-primary">{formatCurrency(totalWithExpenses)}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm">المدفوع</span>
          <Input
            type="number"
            value={paidAmount}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPaidAmount(e.target.value)}
            className="flex-1 h-10"
            placeholder="0"
          />
        </div>

        {remaining > 0 && (
          <div className="flex justify-between text-destructive">
            <span>المتبقي</span>
            <span>{formatCurrency(remaining)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-4">
        <Button variant="outline" onClick={onClose}>
          إلغاء
        </Button>
        <Button 
          onClick={() => createPurchase.mutate()}
          disabled={createPurchase.isPending || items.length === 0}
        >
          <ShoppingBag className="h-4 w-4 ml-2" />
          حفظ الفاتورة
        </Button>
      </div>
    </div>
  )
}


function PurchaseDetails({ purchaseId, onClose }: { purchaseId: string; onClose: () => void }) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const queryClient = useQueryClient()

  const { data: purchase } = useQuery<{
    id: string
    invoice_number: string
    invoice_date?: string
    supplier_invoice_number?: string
    subtotal?: number
    expenses_usd?: number
    expenses_egp?: number
    has_tax?: boolean
    payment_status?: string
    total_amount?: number
    paid_amount?: number
    remaining_amount?: number
    status?: string
    supplier?: { name?: string; name_ar?: string; phone?: string }
    branch?: { name_ar?: string }
    items?: Array<{
      id: string
      quantity: number
      unit_price: number
      total_price: number
      product?: { code?: string; name_ar?: string }
    }>
  }>({
    queryKey: ['purchase-details', purchaseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('purchases')
        .select(`
          *,
          supplier:suppliers(name, name_ar, phone),
          branch:branches(name_ar),
          items:purchase_items(
            *,
            product:products(code, name_ar)
          )
        `)
        .eq('id', purchaseId)
        .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data as any
    },
  })

  if (!purchase) return <div className="text-center py-8">جاري التحميل...</div>

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-md">
        <div>
          <p className="text-sm text-muted-foreground">رقم الفاتورة</p>
          <p className="font-bold">{purchase.invoice_number}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">التاريخ</p>
          <p className="font-bold">{formatDate(purchase.invoice_date || '')}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">المورد</p>
          <p className="font-bold">{purchase.supplier?.name_ar || purchase.supplier?.name}</p>
          {purchase.supplier?.phone && (
            <p className="text-xs text-muted-foreground">{purchase.supplier.phone}</p>
          )}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">الفرع</p>
          <p className="font-bold">{purchase.branch?.name_ar}</p>
        </div>
        {purchase.supplier_invoice_number && (
          <div>
            <p className="text-sm text-muted-foreground">رقم فاتورة المورد</p>
            <p className="font-bold">{purchase.supplier_invoice_number}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">نوع الفاتورة</p>
          <span className={`px-2 py-1 rounded-full text-xs ${purchase.has_tax ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
            {purchase.has_tax ? 'بضريبة' : 'بدون ضريبة'}
          </span>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">حالة الدفع</p>
          <span className={`px-2 py-1 rounded-full text-xs ${purchase.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
            {purchase.payment_status === 'paid' ? 'مدفوع' : 'آجل'}
          </span>
        </div>
      </div>

      {/* Items */}
      <div>
        <h3 className="font-bold mb-3">المنتجات</h3>
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
            {purchase.items?.map((item) => (
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
        <div className="flex justify-between">
          <span>المجموع الفرعي</span>
          <span className="font-bold">{formatCurrency(purchase.subtotal || 0)}</span>
        </div>
        {(purchase.expenses_usd || 0) > 0 && (
          <div className="bg-blue-50 p-2 rounded">
            <div className="flex justify-between text-sm">
              <span>المصاريف</span>
              <span className="font-bold text-blue-700">
                ${purchase.expenses_usd?.toFixed(2)} ({formatCurrency(purchase.expenses_egp || 0)})
              </span>
            </div>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold">
          <span>الإجمالي</span>
          <span className="text-primary">{formatCurrency(purchase.total_amount || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>المدفوع</span>
          <span className="font-bold text-green-600">{formatCurrency(purchase.paid_amount || 0)}</span>
        </div>
        {(purchase.remaining_amount || 0) > 0 && (
          <div className="flex justify-between">
            <span>المتبقي</span>
            <span className="font-bold text-destructive">{formatCurrency(purchase.remaining_amount || 0)}</span>
          </div>
        )}
      </div>

      {/* Close Button */}
      <div className="flex justify-between pt-4 border-t">
        {(purchase.remaining_amount || 0) > 0 && (
          <Button 
            variant="outline" 
            onClick={() => setShowPaymentDialog(true)}
            className="bg-green-50 hover:bg-green-100"
          >
            إضافة دفعة
          </Button>
        )}
        <Button onClick={onClose} className="mr-auto">
          إغلاق
        </Button>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة دفعة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">المبلغ المتبقي</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(purchase.remaining_amount || 0)}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">المبلغ المدفوع</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
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
                onClick={() => handleAddPayment()}
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
    if (!purchase) {
      alert('لا توجد بيانات للفاتورة')
      return
    }

    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح')
      return
    }

    const remaining = purchase.remaining_amount || 0
    if (amount > remaining) {
      alert('المبلغ المدفوع أكبر من المبلغ المتبقي')
      return
    }

    try {
      const newPaidAmount = (purchase.paid_amount || 0) + amount
      const newRemainingAmount = (purchase.total_amount || 0) - newPaidAmount
      const newPaymentStatus = newRemainingAmount <= 0 ? 'paid' : 'credit'

      const { error } = await supabase
        .from('purchases')
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          payment_status: newPaymentStatus
        } as never)
        .eq('id', purchaseId)

      if (error) throw error

      alert('تم إضافة الدفعة بنجاح')
      setShowPaymentDialog(false)
      setPaymentAmount('')
      queryClient.invalidateQueries({ queryKey: ['purchase-details', purchaseId] })
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
    } catch (error) {
      console.error('Error adding payment:', error)
      alert('حدث خطأ في إضافة الدفعة')
    }
  }
}


// Print Purchase Component
function PrintPurchase({ purchaseId, onClose }: { purchaseId: string; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null)

  const { data: purchase } = useQuery({
    queryKey: ['purchase-print', purchaseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('purchases')
        .select('*, supplier:suppliers(*), branch:branches(*)')
        .eq('id', purchaseId)
        .single()
      return data
    },
  })

  const { data: items } = useQuery({
    queryKey: ['purchase-items-print', purchaseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('purchase_items')
        .select('*, product:products(*)')
        .eq('purchase_id', purchaseId)
      return data || []
    },
  })

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: onClose,
  })

  if (!purchase || !items) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">جاري التحميل...</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>طباعة فاتورة الشراء</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="max-h-[60vh] overflow-auto border rounded">
            <PurchaseInvoicePrint
              ref={printRef}
              purchase={purchase}
              items={items}
              supplier={purchase.supplier}
              branch={purchase.branch}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
