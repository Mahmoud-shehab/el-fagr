import React, { useState, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Search, Eye, ArrowLeftRight, X } from 'lucide-react'

interface TransferRow {
  id: string
  transfer_number: string
  transfer_date?: string
  created_at?: string
  from_branch?: { name_ar?: string }
  to_branch?: { name_ar?: string }
  total_items?: number
  total_value?: number
  status?: string
}

interface BranchRow { id: string; name_ar: string }
interface ProductRow { id: string; code: string; name_ar: string; selling_price?: number }
interface TransferItem { product_id: string; product_name: string; quantity: number; unit_cost: number }

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'في انتظار الموافقة', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'موافق عليه', color: 'bg-blue-100 text-blue-700' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700' },
  preparing: { label: 'جاري التجهيز', color: 'bg-purple-100 text-purple-700' },
  in_transit: { label: 'في الطريق', color: 'bg-orange-100 text-orange-700' },
  partially_received: { label: 'استلام جزئي', color: 'bg-orange-100 text-orange-700' },
  received: { label: 'تم الاستلام', color: 'bg-green-100 text-green-700' },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-700' },
}

export default function Transfers() {
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRow | null>(null)
  const [fromBranch, setFromBranch] = useState('')
  const [toBranch, setToBranch] = useState('')
  const [items, setItems] = useState<TransferItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const queryClient = useQueryClient()

  const { data: transfersData, isLoading } = useQuery({
    queryKey: ['transfers', search, currentPage],
    queryFn: async () => {
      let countQuery = supabase.from('stock_transfers').select('*', { count: 'exact', head: true })
      if (search) countQuery = countQuery.ilike('transfer_number', `%${search}%`)
      const { count } = await countQuery

      let query = supabase
        .from('stock_transfers')
        .select('*, from_branch:branches!stock_transfers_from_branch_id_fkey(name_ar), to_branch:branches!stock_transfers_to_branch_id_fkey(name_ar)')
        .order('created_at', { ascending: false })
      if (search) query = query.ilike('transfer_number', `%${search}%`)
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      const { data } = await query.range(from, to)
      return {
        transfers: (data || []) as TransferRow[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage)
      }
    },
  })

  const transfers = transfersData?.transfers || []
  const totalPages = transfersData?.totalPages || 1
  const totalCount = transfersData?.totalCount || 0

  React.useEffect(() => { setCurrentPage(1) }, [search])
    },
  })

  const { data: branches } = useQuery<BranchRow[]>({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name_ar').eq('status', 'active')
      return (data || []) as BranchRow[]
    },
  })

  const { data: products } = useQuery<ProductRow[]>({
    queryKey: ['products-list'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, code, name_ar, selling_price').eq('status', 'active')
      return (data || []) as ProductRow[]
    },
  })

  const createTransfer = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.from('users').select('id').limit(1).single()
      const transferNumber = `TRF-${Date.now()}`
      const totalValue = items.reduce((sum: number, i: TransferItem) => sum + i.quantity * i.unit_cost, 0)

      // Create transfer
      const { data: transfer, error } = await supabase.from('stock_transfers').insert({
        transfer_number: transferNumber,
        transfer_date: new Date().toISOString(),
        from_branch_id: fromBranch,
        to_branch_id: toBranch,
        total_items: items.length,
        total_value: totalValue,
        status: 'completed',
        requested_by: user?.id,
        approved_by: user?.id,
      } as never).select().single()

      if (error) throw error

      // Create transfer items
      for (const item of items) {
        await supabase.from('stock_transfer_items').insert({
          transfer_id: (transfer as { id: string }).id,
          product_id: item.product_id,
          requested_quantity: item.quantity,
          approved_quantity: item.quantity,
          shipped_quantity: item.quantity,
          received_quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_value: item.quantity * item.unit_cost,
        } as never)

        // Deduct from source branch
        const { data: srcInv } = await supabase.from('inventory')
          .select('id, quantity').eq('product_id', item.product_id).eq('branch_id', fromBranch).single()
        if (srcInv) {
          const src = srcInv as { id: string; quantity: number }
          await supabase.from('inventory').update({ quantity: (src.quantity || 0) - item.quantity } as never)
            .eq('id', src.id)
        }

        // Add to destination branch
        const { data: destInv } = await supabase.from('inventory')
          .select('id, quantity').eq('product_id', item.product_id).eq('branch_id', toBranch).single()
        if (destInv) {
          const dest = destInv as { id: string; quantity: number }
          await supabase.from('inventory').update({ quantity: (dest.quantity || 0) + item.quantity } as never)
            .eq('id', dest.id)
        } else {
          await supabase.from('inventory').insert({
            product_id: item.product_id, branch_id: toBranch, quantity: item.quantity, avg_cost: item.unit_cost
          } as never)
        }
      }
      return transfer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setShowDialog(false)
      resetForm()
      alert('تم إنشاء التحويل بنجاح!')
    },
    onError: (err) => alert('خطأ: ' + err.message),
  })

  const resetForm = () => {
    setFromBranch('')
    setToBranch('')
    setItems([])
    setSelectedProduct('')
    setQuantity(1)
  }

  const addItem = () => {
    const product = products?.find(p => p.id === selectedProduct)
    if (!product || quantity <= 0) return
    setItems([...items, {
      product_id: product.id,
      product_name: product.name_ar,
      quantity,
      unit_cost: product.selling_price || 0
    }])
    setSelectedProduct('')
    setQuantity(1)
  }

  const removeItem = (idx: number) => setItems(items.filter((_: TransferItem, i: number) => i !== idx))

  // Query for transfer items when viewing a transfer
  const { data: transferItems } = useQuery({
    queryKey: ['transfer-items', selectedTransfer?.id],
    queryFn: async () => {
      if (!selectedTransfer?.id) return []
      const { data } = await supabase
        .from('stock_transfer_items')
        .select('*, product:products(name_ar, code)')
        .eq('transfer_id', selectedTransfer.id)
      return data || []
    },
    enabled: !!selectedTransfer?.id && showViewDialog,
  })

  const handleViewTransfer = (transfer: TransferRow) => {
    setSelectedTransfer(transfer)
    setShowViewDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">تحويلات المخزون</h1>
          <p className="text-muted-foreground">إدارة تحويلات المخزون بين الفروع</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 ml-2" />
          تحويل جديد
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent onClose={() => setShowDialog(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تحويل مخزون جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="from-branch" className="text-sm font-medium">من فرع *</label>
                <select id="from-branch" title="من فرع" className="w-full h-10 border rounded-md px-3"
                  value={fromBranch} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFromBranch(e.target.value)}>
                  <option value="">اختر الفرع</option>
                  {branches?.filter(b => b.id !== toBranch).map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="to-branch" className="text-sm font-medium">إلى فرع *</label>
                <select id="to-branch" title="إلى فرع" className="w-full h-10 border rounded-md px-3"
                  value={toBranch} onChange={(e: ChangeEvent<HTMLSelectElement>) => setToBranch(e.target.value)}>
                  <option value="">اختر الفرع</option>
                  {branches?.filter(b => b.id !== fromBranch).map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
                </select>
              </div>
            </div>

            <div className="border rounded-md p-4">
              <h4 className="font-medium mb-3">إضافة منتج</h4>
              <div className="flex gap-2">
                <select title="المنتج" className="flex-1 h-10 border rounded-md px-3"
                  value={selectedProduct} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedProduct(e.target.value)}>
                  <option value="">اختر المنتج</option>
                  {products?.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name_ar}</option>)}
                </select>
                <Input type="number" value={quantity} onChange={(e: ChangeEvent<HTMLInputElement>) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-24" min={1} placeholder="الكمية" />
                <Button type="button" onClick={addItem}>إضافة</Button>
              </div>
            </div>

            {items.length > 0 && (
              <div className="border rounded-md">
                <table className="w-full">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-right py-2 px-3">المنتج</th>
                    <th className="text-right py-2 px-3">الكمية</th>
                    <th className="text-right py-2 px-3">التكلفة</th>
                    <th className="py-2 px-3"></th>
                  </tr></thead>
                  <tbody>
                    {items.map((item: TransferItem, idx: number) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 px-3">{item.product_name}</td>
                        <td className="py-2 px-3">{item.quantity}</td>
                        <td className="py-2 px-3">{formatCurrency(item.quantity * item.unit_cost)}</td>
                        <td className="py-2 px-3">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={() => createTransfer.mutate()} 
              disabled={!fromBranch || !toBranch || items.length === 0 || createTransfer.isPending}>
              {createTransfer.isPending ? 'جاري الحفظ...' : 'حفظ التحويل'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Transfer Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent onClose={() => setShowViewDialog(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل التحويل - {selectedTransfer?.transfer_number}</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">من فرع</p>
                  <p className="font-medium">{selectedTransfer.from_branch?.name_ar}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إلى فرع</p>
                  <p className="font-medium">{selectedTransfer.to_branch?.name_ar}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">التاريخ</p>
                  <p className="font-medium">{formatDate(selectedTransfer.transfer_date || selectedTransfer.created_at!)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${statusLabels[selectedTransfer.status || 'pending'].color}`}>
                    {statusLabels[selectedTransfer.status || 'pending'].label}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">عدد الأصناف</p>
                  <p className="font-medium">{selectedTransfer.total_items || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي القيمة</p>
                  <p className="font-medium">{formatCurrency(selectedTransfer.total_value || 0)}</p>
                </div>
              </div>

              <div className="border rounded-md">
                <h4 className="font-medium p-3 border-b bg-muted/30">أصناف التحويل</h4>
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right py-2 px-3">المنتج</th>
                      <th className="text-right py-2 px-3">الكمية</th>
                      <th className="text-right py-2 px-3">تكلفة الوحدة</th>
                      <th className="text-right py-2 px-3">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferItems?.map((item: { id: string; product?: { name_ar?: string; code?: string }; received_quantity?: number; unit_cost?: number; total_value?: number }) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-2 px-3">{item.product?.code} - {item.product?.name_ar}</td>
                        <td className="py-2 px-3">{item.received_quantity || 0}</td>
                        <td className="py-2 px-3">{formatCurrency(item.unit_cost || 0)}</td>
                        <td className="py-2 px-3">{formatCurrency(item.total_value || 0)}</td>
                      </tr>
                    ))}
                    {(!transferItems || transferItems.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-muted-foreground">لا توجد أصناف</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث برقم التحويل..." value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pr-10" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !transfers?.length ? (
            <p className="text-center py-8 text-muted-foreground">لا توجد تحويلات</p>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} من {totalCount} تحويل
              </div>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b">
                  <th className="text-right py-3 px-2">رقم التحويل</th>
                  <th className="text-right py-3 px-2">التاريخ</th>
                  <th className="text-right py-3 px-2">من</th>
                  <th className="text-right py-3 px-2">إلى</th>
                  <th className="text-right py-3 px-2">عدد الأصناف</th>
                  <th className="text-right py-3 px-2">القيمة</th>
                  <th className="text-right py-3 px-2">الحالة</th>
                  <th className="text-right py-3 px-2">إجراءات</th>
                </tr></thead>
                <tbody>
                  {transfers.map((transfer) => (
                    <tr key={transfer.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono">{transfer.transfer_number}</td>
                      <td className="py-3 px-2">{formatDate(transfer.transfer_date || transfer.created_at!)}</td>
                      <td className="py-3 px-2">{transfer.from_branch?.name_ar}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                          {transfer.to_branch?.name_ar}
                        </div>
                      </td>
                      <td className="py-3 px-2">{transfer.total_items || 0}</td>
                      <td className="py-3 px-2">{formatCurrency(transfer.total_value || 0)}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${statusLabels[transfer.status || 'pending'].color}`}>
                          {statusLabels[transfer.status || 'pending'].label}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <Button variant="ghost" size="icon" title="عرض" onClick={() => handleViewTransfer(transfer)}><Eye className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>السابق</Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i
                    return <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(pageNum)} className="w-10">{pageNum}</Button>
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>التالي</Button>
              </div>
            )}
          </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
