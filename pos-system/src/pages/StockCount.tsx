import { useState, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Plus, Building2, Package, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface CountItem {
  product_id: string
  product_name: string
  product_code: string
  system_quantity: number
  counted_quantity: number
  variance: number
  variance_type: 'surplus' | 'shortage' | 'match'
}

export default function StockCount() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [showNewCount, setShowNewCount] = useState(false)
  const [countItems, setCountItems] = useState<CountItem[]>([])
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['stockcount-branches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('status', 'active')
        .order('name_ar')
      return data || []
    },
  })

  // Fetch inventory for selected branch
  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['stockcount-inventory', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return []
      
      const { data } = await supabase
        .from('inventory')
        .select(`
          product_id,
          quantity,
          product:products(id, code, name, name_ar)
        `)
        .eq('branch_id', selectedBranchId)
      
      return data || []
    },
    enabled: !!selectedBranchId,
  })

  // Fetch stock counts
  const { data: stockCounts, isLoading: countsLoading } = useQuery({
    queryKey: ['stock-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('stock_counts')
        .select('*, branch:branches(name_ar)')
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  // Start new count
  const startNewCount = () => {
    if (!selectedBranchId) {
      alert('الرجاء اختيار الفرع أولاً')
      return
    }
    
    if (!inventory || inventory.length === 0) {
      alert('لا توجد منتجات في هذا الفرع')
      return
    }
    
    const items: CountItem[] = inventory.map((inv: any) => ({
      product_id: inv.product_id,
      product_name: inv.product?.name_ar || inv.product?.name,
      product_code: inv.product?.code,
      system_quantity: inv.quantity || 0,
      counted_quantity: 0,
      variance: 0,
      variance_type: 'match' as const,
    }))
    
    setCountItems(items)
    setShowNewCount(true)
  }

  // Update counted quantity
  const updateCountedQuantity = (productId: string, quantity: number) => {
    setCountItems(items => items.map(item => {
      if (item.product_id === productId) {
        const variance = quantity - item.system_quantity
        const variance_type = variance > 0 ? 'surplus' : variance < 0 ? 'shortage' : 'match'
        return { ...item, counted_quantity: quantity, variance, variance_type }
      }
      return item
    }))
  }

  // Save stock count
  const saveCountMutation = useMutation({
    mutationFn: async () => {
      const countNumber = `SC-${Date.now()}`
      
      // Get current user
      const { data: users } = await supabase.from('users').select('id').limit(1)
      const userId = (users as { id: string }[] | null)?.[0]?.id
      
      // Calculate totals
      const totalVariance = countItems.reduce((sum, item) => sum + Math.abs(item.variance), 0)
      const surplusCount = countItems.filter(item => item.variance_type === 'surplus').length
      const shortageCount = countItems.filter(item => item.variance_type === 'shortage').length
      
      // Create stock count
      const { data: stockCount, error: countError } = await supabase
        .from('stock_counts')
        .insert({
          count_number: countNumber,
          branch_id: selectedBranchId,
          counted_by: userId,
          count_date: new Date().toISOString(),
          status: 'pending',
          notes: notes || null,
          total_items: countItems.length,
          variance_items: surplusCount + shortageCount,
        } as never)
        .select()
        .single()
      
      if (countError) throw countError
      
      // Create count items
      const countItemsData = countItems.map(item => ({
        stock_count_id: (stockCount as { id: string }).id,
        product_id: item.product_id,
        system_quantity: item.system_quantity,
        counted_quantity: item.counted_quantity,
        variance_quantity: item.variance,
        variance_type: item.variance_type,
      }))
      
      const { error: itemsError } = await supabase
        .from('stock_count_items')
        .insert(countItemsData as never)
      
      if (itemsError) throw itemsError
      
      return stockCount
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] })
      setShowNewCount(false)
      setCountItems([])
      setNotes('')
      alert('تم حفظ الجرد بنجاح!')
    },
    onError: (error) => {
      alert('حدث خطأ: ' + error.message)
    },
  })

  // Approve stock count
  const approveCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      // Get count items
      const { data: items } = await supabase
        .from('stock_count_items')
        .select('*')
        .eq('stock_count_id', countId)
      
      if (!items) throw new Error('Count items not found')
      
      // Get count to get branch_id
      const { data: count } = await supabase
        .from('stock_counts')
        .select('branch_id')
        .eq('id', countId)
        .single()
      
      if (!count) throw new Error('Count not found')
      
      // Update inventory for each item with variance
      for (const item of items) {
        if (item.variance_quantity !== 0) {
          await supabase
            .from('inventory')
            .update({ 
              quantity: item.counted_quantity 
            } as any)
            .eq('product_id', item.product_id)
            .eq('branch_id', count.branch_id)
        }
      }
      
      // Update count status
      await supabase
        .from('stock_counts')
        .update({ status: 'approved', approved_at: new Date().toISOString() } as never)
        .eq('id', countId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] })
      queryClient.invalidateQueries({ queryKey: ['stockcount-inventory'] })
      alert('تم اعتماد الجرد وتحديث المخزون!')
    },
    onError: (error) => {
      alert('حدث خطأ: ' + error.message)
    },
  })

  const totalVariance = countItems.reduce((sum, item) => sum + Math.abs(item.variance), 0)
  const surplusCount = countItems.filter(item => item.variance_type === 'surplus').length
  const shortageCount = countItems.filter(item => item.variance_type === 'shortage').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">جرد المخزون</h1>
          <p className="text-muted-foreground">إدارة عمليات جرد المخزون</p>
        </div>
      </div>

      {/* Branch Selection & Start Count */}
      <Card>
        <CardHeader>
          <CardTitle>بدء جرد جديد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">اختر الفرع</label>
              <select
                value={selectedBranchId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background mt-1"
              >
                <option value="">اختر الفرع</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name_ar}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-6">
              <Button onClick={startNewCount} disabled={!selectedBranchId || inventoryLoading}>
                <Plus className="h-4 w-4 ml-2" />
                بدء الجرد
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Count Dialog */}
      <Dialog open={showNewCount} onOpenChange={setShowNewCount}>
        <DialogContent onClose={() => setShowNewCount(false)} className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>جرد المخزون - {branches?.find(b => b.id === selectedBranchId)?.name_ar}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>
                <p className="text-2xl font-bold">{countItems.length}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-md">
                <p className="text-sm text-muted-foreground">فائض</p>
                <p className="text-2xl font-bold text-green-600">{surplusCount}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-md">
                <p className="text-sm text-muted-foreground">عجز</p>
                <p className="text-2xl font-bold text-destructive">{shortageCount}</p>
              </div>
            </div>

            {/* Count Items Table */}
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-right py-2 px-2">الكود</th>
                    <th className="text-right py-2 px-2">المنتج</th>
                    <th className="text-right py-2 px-2">الكمية بالنظام</th>
                    <th className="text-right py-2 px-2">الكمية الفعلية</th>
                    <th className="text-right py-2 px-2">الفرق</th>
                  </tr>
                </thead>
                <tbody>
                  {countItems.map((item) => (
                    <tr key={item.product_id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-mono text-xs">{item.product_code}</td>
                      <td className="py-2 px-2">{item.product_name}</td>
                      <td className="py-2 px-2 text-center font-bold">{item.system_quantity}</td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={item.counted_quantity}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => 
                            updateCountedQuantity(item.product_id, parseInt(e.target.value) || 0)
                          }
                          className="w-24 text-center"
                          min={0}
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        {item.variance !== 0 && (
                          <span className={`font-bold ${item.variance_type === 'surplus' ? 'text-green-600' : 'text-destructive'}`}>
                            {item.variance > 0 ? '+' : ''}{item.variance}
                          </span>
                        )}
                        {item.variance === 0 && <span className="text-muted-foreground">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium">ملاحظات</label>
              <Input
                value={notes}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCount(false)}>إلغاء</Button>
            <Button 
              onClick={() => saveCountMutation.mutate()}
              disabled={saveCountMutation.isPending || countItems.some(item => item.counted_quantity === 0)}
            >
              {saveCountMutation.isPending ? 'جاري الحفظ...' : 'حفظ الجرد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Counts List */}
      <Card>
        <CardHeader>
          <CardTitle>سجل عمليات الجرد</CardTitle>
        </CardHeader>
        <CardContent>
          {countsLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !stockCounts?.length ? (
            <p className="text-center py-8 text-muted-foreground">لا توجد عمليات جرد</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-2">رقم الجرد</th>
                    <th className="text-right py-3 px-2">التاريخ</th>
                    <th className="text-right py-3 px-2">الفرع</th>
                    <th className="text-right py-3 px-2">عدد المنتجات</th>
                    <th className="text-right py-3 px-2">منتجات بفروقات</th>
                    <th className="text-right py-3 px-2">الحالة</th>
                    <th className="text-right py-3 px-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {stockCounts.map((count) => (
                    <tr key={count.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono text-sm">{count.count_number}</td>
                      <td className="py-3 px-2">
                        {new Date(count.count_date || count.created_at).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {count.branch?.name_ar}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">{count.total_items || 0}</td>
                      <td className="py-3 px-2 text-center">
                        {count.variance_items > 0 ? (
                          <span className="text-destructive font-bold">{count.variance_items}</span>
                        ) : (
                          <span className="text-green-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {count.status === 'approved' ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            معتمد
                          </span>
                        ) : count.status === 'rejected' ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                            <XCircle className="h-3 w-3" />
                            مرفوض
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            معلق
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {count.status === 'pending' && (
                          <Button 
                            size="sm"
                            onClick={() => approveCountMutation.mutate(count.id)}
                            disabled={approveCountMutation.isPending}
                          >
                            اعتماد
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
