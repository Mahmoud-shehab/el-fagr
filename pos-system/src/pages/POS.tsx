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
  const [paidAmount, setPaidAmount] = useState('')
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
    queryKey: ['pos-customers', customerSearch, selectedBranchId],
    queryFn: async () => {
      if (!customerSearch || !selectedBranchId) return []
      let query = supabase
        .from('customers')
        .select('*')
        .eq('status', 'active')
        .or(`code.ilike.%${customerSearch}%,name_ar.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`)
      
      // Filter by branch
      query = query.eq('branch_id', selectedBranchId)
      
      const { data } = await query.limit(10)
      return (data || []) as CustomerRow[]
    },
    enabled: customerSearch.length > 0 && !!selectedBranchId,
  })

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const discountAmount = (subtotal * discount) / 100
  const total = subtotal - discountAmount
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
    setPaidAmount('')
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
        total_amount: total,
        paid_amount: paid,
        remaining_amount: remaining > 0 ? remaining : 0,
        payment_method: paymentMethod,
        status: remaining <= 0 ? 'paid' : 'partially_paid',
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
    <div className="h-[calc(100vh-4rem)] flex gap-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col">
        <div className="mb-4 space-y-2">
          {/* Branch Selection */}
          <div className="relative">
            <div 
              className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-muted bg-card"
              onClick={() => setShowBranchSelect(!showBranchSelect)}
            >
              <Building2 className="h-5 w-5 text-primary" />
              <span className="flex-1 font-medium">
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
            <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="بحث بالكود أو الباركود أو الاسم..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pr-12 text-lg h-12"
              autoFocus
              disabled={!selectedBranchId}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {!selectedBranchId ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>الرجاء اختيار منفذ البيع أولاً</p>
            </div>
          ) : products && products.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>لا توجد منتجات متاحة في هذا المنفذ</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {products?.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="p-4 bg-card border rounded-lg hover:border-primary hover:shadow-md transition-all text-right relative"
                >
                  <p className="font-bold text-lg truncate">{product.name_ar}</p>
                  <p className="text-sm text-muted-foreground">{product.code}</p>
                  <p className="text-primary font-bold mt-2">{formatCurrency(product.selling_price || 0)}</p>
                  <span className="absolute top-2 left-2 bg-muted px-2 py-1 rounded text-xs">
                    متاح: {product.available_quantity}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <Card className="w-[400px] flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              الفاتورة
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={clearCart}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Customer Selection */}
          <div className="relative mt-2">
            <div 
              className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted"
              onClick={() => setShowCustomerSearch(!showCustomerSearch)}
            >
              <User className="h-4 w-4" />
              <span className="flex-1 text-sm">
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

        <CardContent className="flex-1 overflow-auto p-2">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>السلة فارغة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-xs text-muted-foreground w-5">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name_ar}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="font-bold w-20 text-left">{formatCurrency(item.total)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFromCart(item.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Totals & Payment */}
        <div className="border-t p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span>المجموع الفرعي</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm">خصم %</span>
            <Input
              type="number"
              value={discount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-20 h-8 text-center"
              min={0}
              max={100}
            />
            <span className="text-sm text-muted-foreground">({formatCurrency(discountAmount)})</span>
          </div>

          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>الإجمالي</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">المدفوع</span>
            <Input
              type="number"
              value={paidAmount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPaidAmount(e.target.value)}
              className="flex-1 h-10 text-lg"
              placeholder="0"
            />
          </div>

          {remaining > 0 && (
            <div className="flex justify-between text-destructive">
              <span>المتبقي</span>
              <span>{formatCurrency(remaining)}</span>
            </div>
          )}
          {remaining < 0 && (
            <div className="flex justify-between text-green-600">
              <span>الباقي للعميل</span>
              <span>{formatCurrency(Math.abs(remaining))}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button 
              className="h-12" 
              onClick={() => createSale.mutate('cash')}
              disabled={cart.length === 0 || createSale.isPending}
            >
              <Banknote className="h-5 w-5 ml-2" />
              نقدي
            </Button>
            <Button 
              variant="outline" 
              className="h-12"
              onClick={() => createSale.mutate('credit')}
              disabled={cart.length === 0 || !selectedCustomer || createSale.isPending}
            >
              <CreditCard className="h-5 w-5 ml-2" />
              آجل
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}