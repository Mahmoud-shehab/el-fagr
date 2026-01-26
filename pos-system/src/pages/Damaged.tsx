import { useState, ChangeEvent } from 'react'
import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Search, Eye, AlertTriangle } from 'lucide-react'

interface DamagedItemRow {
  id: string
  damage_number: string
  damage_date?: string
  created_at?: string
  product?: { code?: string; name?: string; name_ar?: string }
  branch?: { name_ar?: string }
  quantity: number
  damage_type?: string
  total_cost?: number
  status?: string
}

interface WriteOffRow {
  id: string
  writeoff_number: string
  writeoff_date?: string
  created_at?: string
  branch?: { name_ar?: string }
  writeoff_reason?: string
  total_items?: number
  total_value?: number
  status?: string
}

interface BranchRow { id: string; name_ar: string }
interface ProductRow { id: string; code: string; name_ar: string; purchase_price?: number }

const damageStatus: Record<string, { label: string; color: string }> = {
  discovered: { label: 'تم اكتشافه', color: 'bg-yellow-100 text-yellow-700' },
  reported: { label: 'تم الإبلاغ', color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'موافق عليه', color: 'bg-green-100 text-green-700' },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
}

const damageTypes: Record<string, string> = {
  physical_damage: 'تلف مادي',
  water_damage: 'تلف بسبب المياه',
  expired: 'منتهي الصلاحية',
  manufacturing_defect: 'عيب صناعة',
  storage_damage: 'تلف بسبب التخزين',
  transit_damage: 'تلف أثناء النقل',
  other: 'أخرى',
}

export default function Damaged() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'damaged' | 'writeoffs'>('damaged')
  const [showDialog, setShowDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedDamaged, setSelectedDamaged] = useState<DamagedItemRow | null>(null)
  const [selectedWriteOff, setSelectedWriteOff] = useState<WriteOffRow | null>(null)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [damageType, setDamageType] = useState('physical_damage')
  const [notes, setNotes] = useState('')
  const [currentPageDamaged, setCurrentPageDamaged] = useState(1)
  const [currentPageWriteOffs, setCurrentPageWriteOffs] = useState(1)
  const itemsPerPage = 10
  const queryClient = useQueryClient()

  const { data: damagedItemsData, isLoading: loadingDamaged } = useQuery({
    queryKey: ['damaged-items', search, currentPageDamaged],
    queryFn: async () => {
      let countQuery = supabase.from('damaged_items').select('*', { count: 'exact', head: true })
      if (search) countQuery = countQuery.ilike('damage_number', `%${search}%`)
      const { count } = await countQuery

      let query = supabase.from('damaged_items')
        .select('*, product:products(code, name, name_ar), branch:branches(name_ar)')
        .order('created_at', { ascending: false })
      if (search) query = query.ilike('damage_number', `%${search}%`)
      
      const from = (currentPageDamaged - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      const { data } = await query.range(from, to)
      
      return {
        items: (data || []) as DamagedItemRow[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage)
      }
    },
    enabled: activeTab === 'damaged',
  })

  const { data: writeOffsData, isLoading: loadingWriteOffs } = useQuery({
    queryKey: ['write-offs', search, currentPageWriteOffs],
    queryFn: async () => {
      let countQuery = supabase.from('write_offs').select('*', { count: 'exact', head: true })
      if (search) countQuery = countQuery.ilike('writeoff_number', `%${search}%`)
      const { count } = await countQuery

      let query = supabase.from('write_offs').select('*, branch:branches(name_ar)')
        .order('created_at', { ascending: false })
      if (search) query = query.ilike('writeoff_number', `%${search}%`)
      
      const from = (currentPageWriteOffs - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      const { data } = await query.range(from, to)
      
      return {
        items: (data || []) as WriteOffRow[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage)
      }
    },
    enabled: activeTab === 'writeoffs',
  })

  const damagedItems = damagedItemsData?.items || []
  const damagedTotalPages = damagedItemsData?.totalPages || 1
  const damagedTotalCount = damagedItemsData?.totalCount || 0

  const writeOffs = writeOffsData?.items || []
  const writeOffsTotalPages = writeOffsData?.totalPages || 1
  const writeOffsTotalCount = writeOffsData?.totalCount || 0

  React.useEffect(() => {
    setCurrentPageDamaged(1)
    setCurrentPageWriteOffs(1)
  }, [search])

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
      const { data } = await supabase.from('products').select('id, code, name_ar, purchase_price').eq('status', 'active')
      return (data || []) as ProductRow[]
    },
  })

  const createDamaged = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.from('users').select('id').limit(1).single()
      const userId = user ? (user as { id: string }).id : null
      const product = products?.find(p => p.id === selectedProduct)
      if (!product) throw new Error('المنتج غير موجود')

      const damageNumber = `DMG-${Date.now()}`
      const totalCost = quantity * (product.purchase_price || 0)

      // Create damaged item record
      const { error } = await supabase.from('damaged_items').insert({
        damage_number: damageNumber,
        damage_date: new Date().toISOString(),
        product_id: selectedProduct,
        branch_id: selectedBranch,
        quantity,
        damage_type: damageType,
        unit_cost: product.purchase_price || 0,
        total_cost: totalCost,
        status: 'approved',
        discovered_by: userId,
        reported_by: userId,
        approved_by: userId,
        notes,
      } as never)

      if (error) throw error

      // Deduct from inventory
      const { data: inv } = await supabase.from('inventory')
        .select('id, quantity').eq('product_id', selectedProduct).eq('branch_id', selectedBranch).single()
      
      if (inv) {
        const invRecord = inv as { id: string; quantity: number }
        await supabase.from('inventory').update({ quantity: Math.max(0, (invRecord.quantity || 0) - quantity) } as never)
          .eq('id', invRecord.id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damaged-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setShowDialog(false)
      resetForm()
      alert('تم تسجيل التالف وخصمه من المخزون!')
    },
    onError: (err) => alert('خطأ: ' + err.message),
  })

  const resetForm = () => {
    setSelectedBranch('')
    setSelectedProduct('')
    setQuantity(1)
    setDamageType('physical_damage')
    setNotes('')
  }

  const handleViewDamaged = (item: DamagedItemRow) => {
    setSelectedDamaged(item)
    setSelectedWriteOff(null)
    setShowViewDialog(true)
  }

  const handleViewWriteOff = (wo: WriteOffRow) => {
    setSelectedWriteOff(wo)
    setSelectedDamaged(null)
    setShowViewDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">التالف والهالك</h1>
          <p className="text-muted-foreground">إدارة المنتجات التالفة وعمليات الشطب</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 ml-2" />
            تسجيل تالف
          </Button>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent onClose={() => setShowDialog(false)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تسجيل منتج تالف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="branch" className="text-sm font-medium">الفرع *</label>
              <select id="branch" title="الفرع" className="w-full h-10 border rounded-md px-3"
                value={selectedBranch} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedBranch(e.target.value)}>
                <option value="">اختر الفرع</option>
                {branches?.map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="product" className="text-sm font-medium">المنتج *</label>
              <select id="product" title="المنتج" className="w-full h-10 border rounded-md px-3"
                value={selectedProduct} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedProduct(e.target.value)}>
                <option value="">اختر المنتج</option>
                {products?.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name_ar}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="text-sm font-medium">الكمية *</label>
                <Input id="quantity" type="number" value={quantity} min={1}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setQuantity(parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <label htmlFor="damage-type" className="text-sm font-medium">نوع التلف *</label>
                <select id="damage-type" title="نوع التلف" className="w-full h-10 border rounded-md px-3"
                  value={damageType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setDamageType(e.target.value)}>
                  {Object.entries(damageTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="notes" className="text-sm font-medium">ملاحظات</label>
              <Input id="notes" value={notes} onChange={(e: ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={() => createDamaged.mutate()}
              disabled={!selectedBranch || !selectedProduct || quantity <= 0 || createDamaged.isPending}>
              {createDamaged.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent onClose={() => setShowViewDialog(false)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDamaged ? `تفاصيل التالف - ${selectedDamaged.damage_number}` : 
               selectedWriteOff ? `تفاصيل الشطب - ${selectedWriteOff.writeoff_number}` : 'تفاصيل'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDamaged && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">المنتج</p>
                  <p className="font-medium">{selectedDamaged.product?.name_ar || selectedDamaged.product?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الفرع</p>
                  <p className="font-medium">{selectedDamaged.branch?.name_ar}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">التاريخ</p>
                  <p className="font-medium">{formatDate(selectedDamaged.damage_date || selectedDamaged.created_at!)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الكمية</p>
                  <p className="font-medium">{selectedDamaged.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">نوع التلف</p>
                  <p className="font-medium">{damageTypes[selectedDamaged.damage_type || 'other']}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">التكلفة</p>
                  <p className="font-medium">{formatCurrency(selectedDamaged.total_cost || 0)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${damageStatus[selectedDamaged.status || 'discovered'].color}`}>
                    {damageStatus[selectedDamaged.status || 'discovered'].label}
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedWriteOff && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">الفرع</p>
                  <p className="font-medium">{selectedWriteOff.branch?.name_ar}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">التاريخ</p>
                  <p className="font-medium">{formatDate(selectedWriteOff.writeoff_date || selectedWriteOff.created_at!)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">السبب</p>
                  <p className="font-medium">{selectedWriteOff.writeoff_reason || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">عدد الأصناف</p>
                  <p className="font-medium">{selectedWriteOff.total_items || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">القيمة الإجمالية</p>
                  <p className="font-medium">{formatCurrency(selectedWriteOff.total_value || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedWriteOff.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {selectedWriteOff.status === 'completed' ? 'مكتمل' : 'معلق'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex gap-2 border-b">
        <button type="button" onClick={() => setActiveTab('damaged')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'damaged' ? 'border-primary text-primary' : 'border-transparent hover:text-primary'}`}>
          <AlertTriangle className="h-4 w-4" />
          المنتجات التالفة
        </button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث..." value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pr-10" />
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'damaged' ? (
            loadingDamaged ? (
              <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
            ) : !damagedItems?.length ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد منتجات تالفة</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b">
                      <th className="text-right py-3 px-2">الرقم</th>
                      <th className="text-right py-3 px-2">التاريخ</th>
                      <th className="text-right py-3 px-2">المنتج</th>
                      <th className="text-right py-3 px-2">الفرع</th>
                      <th className="text-right py-3 px-2">الكمية</th>
                      <th className="text-right py-3 px-2">نوع التلف</th>
                      <th className="text-right py-3 px-2">التكلفة</th>
                      <th className="text-right py-3 px-2">الحالة</th>
                      <th className="text-right py-3 px-2">إجراءات</th>
                    </tr></thead>
                    <tbody>
                      {damagedItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2 font-mono">{item.damage_number}</td>
                          <td className="py-3 px-2">{formatDate(item.damage_date || item.created_at!)}</td>
                          <td className="py-3 px-2">{item.product?.name_ar || item.product?.name}</td>
                          <td className="py-3 px-2">{item.branch?.name_ar}</td>
                          <td className="py-3 px-2">{item.quantity}</td>
                          <td className="py-3 px-2">{damageTypes[item.damage_type || 'other']}</td>
                          <td className="py-3 px-2">{formatCurrency(item.total_cost || 0)}</td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${damageStatus[item.status || 'discovered'].color}`}>
                              {damageStatus[item.status || 'discovered'].label}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <Button variant="ghost" size="icon" title="عرض" onClick={() => handleViewDamaged(item)}><Eye className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination for Damaged Items */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    عرض {((currentPageDamaged - 1) * itemsPerPage) + 1}-{Math.min(currentPageDamaged * itemsPerPage, damagedTotalCount)} من {damagedTotalCount}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageDamaged(p => Math.max(1, p - 1))}
                      disabled={currentPageDamaged === 1}
                    >
                      السابق
                    </Button>
                    {Array.from({ length: Math.min(5, damagedTotalPages) }, (_, i) => {
                      let pageNum
                      if (damagedTotalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPageDamaged <= 3) {
                        pageNum = i + 1
                      } else if (currentPageDamaged >= damagedTotalPages - 2) {
                        pageNum = damagedTotalPages - 4 + i
                      } else {
                        pageNum = currentPageDamaged - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPageDamaged === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPageDamaged(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageDamaged(p => Math.min(damagedTotalPages, p + 1))}
                      disabled={currentPageDamaged === damagedTotalPages}
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              </>
            )
          ) : (
            loadingWriteOffs ? (
              <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
            ) : !writeOffs?.length ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد عمليات شطب</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b">
                      <th className="text-right py-3 px-2">الرقم</th>
                      <th className="text-right py-3 px-2">التاريخ</th>
                      <th className="text-right py-3 px-2">الفرع</th>
                      <th className="text-right py-3 px-2">السبب</th>
                      <th className="text-right py-3 px-2">عدد الأصناف</th>
                      <th className="text-right py-3 px-2">القيمة</th>
                      <th className="text-right py-3 px-2">الحالة</th>
                      <th className="text-right py-3 px-2">إجراءات</th>
                    </tr></thead>
                    <tbody>
                      {writeOffs.map((wo) => (
                        <tr key={wo.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2 font-mono">{wo.writeoff_number}</td>
                          <td className="py-3 px-2">{formatDate(wo.writeoff_date || wo.created_at!)}</td>
                          <td className="py-3 px-2">{wo.branch?.name_ar}</td>
                          <td className="py-3 px-2">{wo.writeoff_reason}</td>
                          <td className="py-3 px-2">{wo.total_items || 0}</td>
                          <td className="py-3 px-2">{formatCurrency(wo.total_value || 0)}</td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              wo.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {wo.status === 'completed' ? 'مكتمل' : 'معلق'}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <Button variant="ghost" size="icon" title="عرض" onClick={() => handleViewWriteOff(wo)}><Eye className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination for Write-Offs */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    عرض {((currentPageWriteOffs - 1) * itemsPerPage) + 1}-{Math.min(currentPageWriteOffs * itemsPerPage, writeOffsTotalCount)} من {writeOffsTotalCount}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageWriteOffs(p => Math.max(1, p - 1))}
                      disabled={currentPageWriteOffs === 1}
                    >
                      السابق
                    </Button>
                    {Array.from({ length: Math.min(5, writeOffsTotalPages) }, (_, i) => {
                      let pageNum
                      if (writeOffsTotalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPageWriteOffs <= 3) {
                        pageNum = i + 1
                      } else if (currentPageWriteOffs >= writeOffsTotalPages - 2) {
                        pageNum = writeOffsTotalPages - 4 + i
                      } else {
                        pageNum = currentPageWriteOffs - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPageWriteOffs === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPageWriteOffs(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageWriteOffs(p => Math.min(writeOffsTotalPages, p + 1))}
                      disabled={currentPageWriteOffs === writeOffsTotalPages}
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              </>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
