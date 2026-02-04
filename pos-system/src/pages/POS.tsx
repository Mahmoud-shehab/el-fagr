import { useState, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, User, Barcode, Building2 } from 'lucide-react'

interface ProductRow {
  id: string
  code: string
  name: string
  name_ar: string
  barcode?: string
  selling_price?: number
  category?: { name_ar?: string }
  available_quantity?: number
}

interface CartItem {
  id: string
  product: ProductRow
  quantity: number
  unit_price: number
  discount: number
  total: number
}

interface CustomerRow {
  id: string
  code: string
  name: string
  name_ar?: string
  phone: string
  current_balance?: number
}

interface BranchRow {
  id: string
  code: string
  name_ar: string
  branch_type?: string
}

export default function POS() {
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [transportFee, setTransportFee] = useState(0)
  const [paidAmount, setPaidAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [hasTax, setHasTax] = useState(false)
  const [taxRate, setTaxRate] = useState(14)
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [showBranchSelect, setShowBranchSelect] = useState(false)
  const queryClient = useQueryClient()

  // Fetch branches (outlets only)
  const { data: branches } = useQuery<BranchRow[]>({
    queryKey: ['pos-branches'],
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

  // Auto-select first branch if none selected
  if (!selectedBranchId && branches && branches.length > 0) {
    setSelectedBranchId(branches[0].id)
  }

  const selectedBranch = branches?.find(b => b.id === selectedBranchId)

  // Fetch products with inventory for selected branch
  const { data: products } = useQuery<ProductRow[]>({
    queryKey: ['pos-products', search, selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return []
      
      // Get products with inventory for this branch
      let query = supabase
        .from('inventory')
        .select(`
          quantity,
          product:products!inner(
            id,
            code,
            name,
            name_ar,
            barcode,
            selling_price,
            status,
            category:categories(name_ar)
          )
        `)
        .eq('branch_id', selectedBranchId)
        .eq('product.status', 'active')
        .gt('quantity', 0)
      
      if (search) {
        query = query.or(`product.code.ilike.%${search}%,product.name_ar.ilike.%${search}%,product.barcode.ilike.%${search}%`)
      }
      
      const { data } = await query.limit(20)
      
      // Transform the data to match ProductRow interface
      return (data || []).map((item: any) => ({
        ...item.product,
        available_quantity: item.quantity
      })) as ProductRow[]
    },
    enabled: !!selectedBranchId,
  })

  // Fetch customers for search - filtered by selected branch
  const { data: customers } = useQuery<CustomerRow[]>({
    queryKey: ['pos-customers', customerSearch, selectedBranchId, showCustomerSearch],
    queryFn: async () => {
      if (!selectedBranchId) return []
      let query = supabase
        .from('customers')
        .select('*')
        .eq('status', 'active')
        .eq('branch_id', selectedBranchId)
      
      if (customerSearch) {
        query = query.or(`code.ilike.%${customerSearch}%,name_ar.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`)
      }
      
      const { data } = await query.limit(20).order('name_ar')
      return (data || []) as CustomerRow[]
    },
    enabled: showCustomerSearch && !!selectedBranchId,
  })

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const discountAmount = (subtotal * discount) / 100
  const taxAmount = hasTax ? (subtotal - discountAmount + transportFee) * (taxRate / 100) : 0
  const total = subtotal - discountAmount + transportFee + taxAmount
  const paid = parseFloat(paidAmount) || 0
  const remaining = total - paid

  // Add product to cart
  const addToCart = (product: ProductRow) => {
    const existingItem = cart.find(item => item.product.id === product.id)
    const currentQtyInCart = existingItem ? existingItem.quantity : 0
    const availableQty = product.available_quantity || 0
    
    // Check if we have enough stock
    if (currentQtyInCart >= availableQty) {
      alert(`الكمية المتاحة: ${availableQty}`)
      return
    }
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
          : item
      ))
    } else {
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        product,
        quantity: 1,
        unit_price: product.selling_price || 0,
        discount: 0,
        total: product.selling_price || 0,
      }
      setCart([...cart, newItem])
    }
  }

  // Update quantity
  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + delta)
        const availableQty = item.product.available_quantity || 0
        
        // Check stock limit
        if (newQty > availableQty) {
          alert(`الكمية المتاحة: ${availableQty}`)
          return item
        }
        
        return { ...item, quantity: newQty, total: newQty * item.unit_price }
      }
      return item
    }))
  }

  // Remove from cart
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId))
  }

  // Clear cart
  const clearCart = () => {
    setCart([])
    setSelectedCustomer(null)
    setDiscount(0)
    setTransportFee(0)
    setPaidAmount('')
    setDueDate('')
    setHasTax(false)
    setTaxRate(14)
  }

  // Create sale mutation
  const createSale = useMutation({
    mutationFn: async (paymentMethod: string) => {
      if (!selectedBranchId) throw new Error('الرجاء اختيار منفذ البيع')
      
      // Get current user (simplified - in real app get from auth)
      const { data: users } = await supabase.from('users').select('id').limit(1)
      const userId = (users as { id: string }[] | null)?.[0]?.id

      if (!userId) throw new Error('Missing user')

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`

      // Create sale
      const saleData = {
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString(),
        branch_id: selectedBranchId,
        cashier_id: userId,
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name_ar || selectedCustomer?.name || null,
        subtotal,
        discount_amount: discountAmount,
        transport_fee: transportFee,
        tax_amount: taxAmount,
        tax_rate: hasTax ? taxRate : 0,
        total_amount: total,
        paid_amount: paid,
        remaining_amount: remaining > 0 ? remaining : 0,
        payment_method: paymentMethod,
        status: remaining <= 0 ? 'paid' : 'partially_paid',
        due_date: paymentMethod === 'credit' && dueDate ? dueDate : null,
        has_tax: hasTax,
        payment_status: remaining <= 0 ? 'paid' : 'credit',
      }
      
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert(saleData as never)
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: (sale as { id: string }).id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount,
        total_price: item.total,
      }))

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems as never)
      if (itemsError) throw itemsError

      // Update inventory - reduce quantities
      for (const item of cart) {
        // Get current quantity first
        const { data: currentInv } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('product_id', item.product.id)
          .eq('branch_id', selectedBranchId)
          .single()
        
        if (currentInv) {
          const newQuantity = (currentInv.quantity || 0) - item.quantity
          const { error: invError } = await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('product_id', item.product.id)
            .eq('branch_id', selectedBranchId)
          
          if (invError) console.error('Inventory update error:', invError)
        }
      }

      return sale
    },
    onSuccess: () => {
      clearCart()
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      alert('تم حفظ الفاتورة بنجاح!')
    },
    onError: (error) => {
      alert('حدث خطأ: ' + error.message)
    },
  })

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-2 sm:gap-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="mb-2 sm:mb-4 space-y-2">
          {/* Branch Selection */}
          <div className="relative">
            <div 
              className="flex items-center gap-2 p-2 sm:p-3 border rounded-md cursor-pointer hover:bg-muted bg-card"
              onClick={() => setShowBranchSelect(!showBranchSelect)}
            >
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="flex-1 font-medium text-sm sm:text-base">
                {selectedBranch ? selectedBranch.name_ar : 'اختر منفذ البيع'}
              </span>
            </div>
            
            {showBranchSelect && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-60 overflow-auto">
                {branches?.map((branch) => (
                  <button
                    type="button"
                    key={branch.id}
                    className={`w-full p-3 text-right hover:bg-muted ${selectedBranchId === branch.id ? 'bg-primary/10' : ''}`}
                    onClick={() => { 
                      setSelectedBranchId(branch.id)
                      setShowBranchSelect(false)
                      setCart([]) // Clear cart when changing branch
                    }}
                  >
                    <p className="font-medium">{branch.name_ar}</p>
                    <p className="text-xs text-muted-foreground">{branch.code}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <Input
              placeholder="بحث بالكود أو الباركود..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pr-10 sm:pr-12 text-base sm:text-lg h-10 sm:h-12"
              autoFocus
              disabled={!selectedBranchId}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {!selectedBranchId ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p className="text-sm sm:text-base">الرجاء اختيار منفذ البيع أولاً</p>
            </div>
          ) : products && products.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p className="text-sm sm:text-base">لا توجد منتجات متاحة في هذا المنفذ</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
              {products?.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="p-2 sm:p-4 bg-card border rounded-lg hover:border-primary hover:shadow-md transition-all text-right relative"
                >
                  <p className="font-bold text-sm sm:text-lg truncate">{product.name_ar}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{product.code}</p>
                  <p className="text-primary font-bold mt-1 sm:mt-2 text-sm sm:text-base">{formatCurrency(product.selling_price || 0)}</p>
                  <span className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-muted px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs">
                    {product.available_quantity}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <Card className="w-full lg:w-[400px] flex flex-col max-h-[50vh] lg:max-h-none">
        <CardHeader className="pb-2 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              الفاتورة
              {cart.length > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs">
                  {cart.length}
                </span>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={clearCart} className="h-8 w-8 sm:h-9 sm:w-9">
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
          
          {/* Customer Selection */}
          <div className="relative mt-2">
            <div 
              className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted"
              onClick={() => setShowCustomerSearch(!showCustomerSearch)}
            >
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="flex-1 text-xs sm:text-sm">
                {selectedCustomer ? selectedCustomer.name_ar || selectedCustomer.name : 'عميل نقدي'}
              </span>
            </div>
            
            {showCustomerSearch && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 p-2">
                <Input
                  placeholder="بحث عن عميل..."
                  value={customerSearch}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomerSearch(e.target.value)}
                  className="mb-2"
                />
                <div className="max-h-40 overflow-auto">
                  <button
                    type="button"
                    className="w-full p-2 text-right hover:bg-muted rounded"
                    onClick={() => { setSelectedCustomer(null); setShowCustomerSearch(false) }}
                  >
                    عميل نقدي
                  </button>
                  {customers?.map((customer) => (
                    <button
                      type="button"
                      key={customer.id}
                      className="w-full p-2 text-right hover:bg-muted rounded"
                      onClick={() => { setSelectedCustomer(customer); setShowCustomerSearch(false) }}
                    >
                      <p className="font-medium">{customer.name_ar || customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.phone}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-2 sm:p-4">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p className="text-sm">السلة فارغة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item, index) => (
                <div key={item.id} className="flex items-center gap-1 sm:gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-xs text-muted-foreground w-4 sm:w-5">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{item.product.name_ar}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)}</p>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <Button variant="outline" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => updateQuantity(item.id, -1)}>
                      <Minus className="h-2 w-2 sm:h-3 sm:w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const newQty = parseInt(e.target.value) || 1
                        const availableQty = item.product.available_quantity || 0
                        if (newQty > availableQty) {
                          alert(`الكمية المتاحة: ${availableQty}`)
                          return
                        }
                        if (newQty < 1) return
                        setCart(cart.map(cartItem => 
                          cartItem.id === item.id 
                            ? { ...cartItem, quantity: newQty, total: newQty * cartItem.unit_price }
                            : cartItem
                        ))
                      }}
                      className="w-12 sm:w-16 h-6 sm:h-7 text-center font-bold p-1 text-xs sm:text-sm"
                      min={1}
                      max={item.product.available_quantity || 999}
                    />
                    <Button variant="outline" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => updateQuantity(item.id, 1)}>
                      <Plus className="h-2 w-2 sm:h-3 sm:w-3" />
                    </Button>
                  </div>
                  <span className="font-bold w-16 sm:w-20 text-left text-xs sm:text-sm">{formatCurrency(item.total)}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => removeFromCart(item.id)}>
                    <Trash2 className="h-2 w-2 sm:h-3 sm:w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Totals & Payment */}
        <div className="border-t p-2 sm:p-4 space-y-2 sm:space-y-3">
          <div className="flex justify-between text-xs sm:text-sm">
            <span>المجموع الفرعي</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm">خصم %</span>
            <Input
              type="number"
              value={discount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-16 sm:w-20 h-7 sm:h-8 text-center text-xs sm:text-sm"
              min={0}
              max={100}
            />
            <span className="text-xs sm:text-sm text-muted-foreground">({formatCurrency(discountAmount)})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm">نقل</span>
            <Input
              type="number"
              value={transportFee}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTransportFee(parseFloat(e.target.value) || 0)}
              className="flex-1 h-7 sm:h-8 text-center text-xs sm:text-sm"
              min={0}
              placeholder="0"
            />
            <span className="text-xs sm:text-sm text-muted-foreground">ج.م</span>
          </div>

          {/* Tax Radio Buttons */}
          <div className="flex items-center gap-2 sm:gap-4 py-2 border-y">
            <span className="text-xs sm:text-sm font-medium">الضريبة:</span>
            <label className="flex items-center gap-1 sm:gap-2 cursor-pointer">
              <input
                type="radio"
                name="tax"
                checked={!hasTax}
                onChange={() => setHasTax(false)}
                className="w-3 h-3 sm:w-4 sm:h-4"
              />
              <span className="text-xs sm:text-sm">بدون</span>
            </label>
            <label className="flex items-center gap-1 sm:gap-2 cursor-pointer">
              <input
                type="radio"
                name="tax"
                checked={hasTax}
                onChange={() => setHasTax(true)}
                className="w-3 h-3 sm:w-4 sm:h-4"
              />
              <span className="text-xs sm:text-sm">بضريبة</span>
            </label>
          </div>

          {hasTax && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm">نسبة الضريبة %</span>
                <Input
                  type="number"
                  value={taxRate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setTaxRate(parseFloat(e.target.value) || 14)}
                  className="w-16 sm:w-20 h-7 sm:h-8 text-center text-xs sm:text-sm"
                  min={0}
                  max={100}
                  step={0.1}
                />
              </div>
              <div className="flex justify-between text-xs sm:text-sm text-blue-600">
                <span>الضريبة ({taxRate}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between text-base sm:text-lg font-bold border-t pt-2">
            <span>الإجمالي</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm">المدفوع</span>
            <Input
              type="number"
              value={paidAmount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPaidAmount(e.target.value)}
              className="flex-1 h-8 sm:h-10 text-base sm:text-lg"
              placeholder="0"
            />
          </div>

          {/* Due Date for Credit Sales */}
          {selectedCustomer && (
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm whitespace-nowrap">تاريخ الاستحقاق</span>
              <Input
                type="date"
                value={dueDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                className="flex-1 h-8 sm:h-10 text-xs sm:text-sm"
                placeholder="اختياري"
              />
            </div>
          )}

          {remaining > 0 && (
            <div className="flex justify-between text-destructive text-xs sm:text-sm">
              <span>المتبقي</span>
              <span>{formatCurrency(remaining)}</span>
            </div>
          )}
          {remaining < 0 && (
            <div className="flex justify-between text-green-600 text-xs sm:text-sm">
              <span>الباقي للعميل</span>
              <span>{formatCurrency(Math.abs(remaining))}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button 
              className="h-10 sm:h-12 text-sm sm:text-base" 
              onClick={() => createSale.mutate('cash')}
              disabled={cart.length === 0 || createSale.isPending}
            >
              <Banknote className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
              نقدي
            </Button>
            <Button 
              variant="outline" 
              className="h-10 sm:h-12 text-sm sm:text-base"
              onClick={() => createSale.mutate('credit')}
              disabled={cart.length === 0 || !selectedCustomer || createSale.isPending}
            >
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
              آجل
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}