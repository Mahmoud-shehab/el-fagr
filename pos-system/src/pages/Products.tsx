import React, { useState, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'

interface ProductRow {
  id: string
  code: string
  name: string
  name_ar: string
  barcode?: string
  category_id?: string
  brand_id?: string
  unit_id?: string
  purchase_price?: number
  selling_price?: number
  status?: string
  category?: { name_ar?: string }
  brand?: { name?: string }
  unit?: { name_ar?: string }
}

interface CategoryRow { id: string; name_ar: string }
interface BrandRow { id: string; name: string }
interface UnitRow { id: string; name_ar: string }

const emptyProduct = {
  code: '', name: '', name_ar: '', barcode: '',
  category_id: '', brand_id: '', unit_id: '',
  purchase_price: 0, selling_price: 0
}

export default function Products() {
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<typeof emptyProduct>(emptyProduct)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const queryClient = useQueryClient()

  const { data: productsData, isLoading } = useQuery<{ products: ProductRow[]; totalCount: number; totalPages: number }>({
    queryKey: ['products', search, currentPage],
    queryFn: async () => {
      let countQuery = supabase.from('products').select('*', { count: 'exact', head: true })
      if (search) {
        countQuery = countQuery.or(`name.ilike.%${search}%,name_ar.ilike.%${search}%,code.ilike.%${search}%,barcode.ilike.%${search}%`)
      }
      const { count } = await countQuery

      let query = supabase
        .from('products')
        .select('*, category:categories(name_ar), brand:brands(name), unit:units(name_ar)')
        .order('created_at', { ascending: false })
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,name_ar.ilike.%${search}%,code.ilike.%${search}%,barcode.ilike.%${search}%`)
      }
      
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      const { data } = await query.range(from, to)
      
      return {
        products: (data || []) as ProductRow[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage)
      }
    },
  })

  const products = productsData?.products || []
  const totalPages = productsData?.totalPages || 1
  const totalCount = productsData?.totalCount || 0

  React.useEffect(() => { setCurrentPage(1) }, [search])

  const { data: categories } = useQuery<CategoryRow[]>({
    queryKey: ['categories-list'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name_ar').eq('is_active', true)
      return (data || []) as CategoryRow[]
    },
  })

  const { data: brands } = useQuery<BrandRow[]>({
    queryKey: ['brands-list'],
    queryFn: async () => {
      const { data } = await supabase.from('brands').select('id, name').eq('is_active', true)
      return (data || []) as BrandRow[]
    },
  })

  const { data: units } = useQuery<UnitRow[]>({
    queryKey: ['units-list'],
    queryFn: async () => {
      const { data } = await supabase.from('units').select('id, name_ar').eq('is_active', true)
      return (data || []) as UnitRow[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await supabase.from('products').update(editingProduct as never).eq('id', editingId)
      } else {
        await supabase.from('products').insert({ ...editingProduct, status: 'active' } as never)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setShowDialog(false)
      setEditingProduct(emptyProduct)
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('products').delete().eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })

  const openEdit = (product: ProductRow) => {
    setEditingId(product.id)
    setEditingProduct({
      code: product.code,
      name: product.name,
      name_ar: product.name_ar,
      barcode: product.barcode || '',
      category_id: product.category_id || '',
      brand_id: product.brand_id || '',
      unit_id: product.unit_id || '',
      purchase_price: product.purchase_price || 0,
      selling_price: product.selling_price || 0,
    })
    setShowDialog(true)
  }

  const openNew = () => {
    setEditingId(null)
    setEditingProduct(emptyProduct)
    setShowDialog(true)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">المنتجات</h1>
          <p className="text-sm text-muted-foreground">إدارة المنتجات والأصناف</p>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 ml-2" />
          إضافة منتج
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent onClose={() => setShowDialog(false)} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل منتج' : 'إضافة منتج جديد'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">الكود *</label>
              <Input value={editingProduct.code} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingProduct({...editingProduct, code: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium">الباركود</label>
              <Input value={editingProduct.barcode} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingProduct({...editingProduct, barcode: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium">الاسم بالإنجليزية *</label>
              <Input value={editingProduct.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingProduct({...editingProduct, name: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium">الاسم بالعربية *</label>
              <Input value={editingProduct.name_ar} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingProduct({...editingProduct, name_ar: e.target.value})} />
            </div>
            <div>
              <label htmlFor="category-select" className="text-sm font-medium">التصنيف</label>
              <select id="category-select" title="التصنيف" className="w-full h-10 border rounded-md px-3 text-sm" value={editingProduct.category_id} onChange={(e: ChangeEvent<HTMLSelectElement>) => setEditingProduct({...editingProduct, category_id: e.target.value})}>
                <option value="">اختر التصنيف</option>
                {categories?.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="brand-select" className="text-sm font-medium">الماركة</label>
              <select id="brand-select" title="الماركة" className="w-full h-10 border rounded-md px-3 text-sm" value={editingProduct.brand_id} onChange={(e: ChangeEvent<HTMLSelectElement>) => setEditingProduct({...editingProduct, brand_id: e.target.value})}>
                <option value="">اختر الماركة</option>
                {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="unit-select" className="text-sm font-medium">الوحدة *</label>
              <select id="unit-select" title="الوحدة" className="w-full h-10 border rounded-md px-3 text-sm" value={editingProduct.unit_id} onChange={(e: ChangeEvent<HTMLSelectElement>) => setEditingProduct({...editingProduct, unit_id: e.target.value})}>
                <option value="">اختر الوحدة</option>
                {units?.map(u => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">سعر الشراء</label>
              <Input type="number" value={editingProduct.purchase_price} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingProduct({...editingProduct, purchase_price: parseFloat(e.target.value) || 0})} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">سعر البيع</label>
              <Input type="number" value={editingProduct.selling_price} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingProduct({...editingProduct, selling_price: parseFloat(e.target.value) || 0})} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="w-full sm:w-auto">إلغاء</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full sm:w-auto">
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-full sm:max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الكود أو الباركود..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !products?.length ? (
            <p className="text-center py-8 text-muted-foreground">لا توجد منتجات</p>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} من {totalCount} منتج
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-2 text-xs sm:text-sm">الكود</th>
                    <th className="text-right py-3 px-2 text-xs sm:text-sm">الاسم</th>
                    <th className="text-right py-3 px-2 text-xs sm:text-sm hidden md:table-cell">التصنيف</th>
                    <th className="text-right py-3 px-2 text-xs sm:text-sm hidden lg:table-cell">الماركة</th>
                    <th className="text-right py-3 px-2 text-xs sm:text-sm">سعر الشراء</th>
                    <th className="text-right py-3 px-2 text-xs sm:text-sm">سعر البيع</th>
                    <th className="text-right py-3 px-2 text-xs sm:text-sm hidden sm:table-cell">الحالة</th>
                    <th className="text-right py-3 px-2 text-xs sm:text-sm">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono text-xs sm:text-sm">{product.code}</td>
                      <td className="py-3 px-2 text-xs sm:text-sm">{product.name_ar}</td>
                      <td className="py-3 px-2 text-xs sm:text-sm hidden md:table-cell">{product.category?.name_ar || '-'}</td>
                      <td className="py-3 px-2 text-xs sm:text-sm hidden lg:table-cell">{product.brand?.name || '-'}</td>
                      <td className="py-3 px-2 text-xs sm:text-sm">{formatCurrency(product.purchase_price || 0)}</td>
                      <td className="py-3 px-2 text-xs sm:text-sm">{formatCurrency(product.selling_price || 0)}</td>
                      <td className="py-3 px-2 hidden sm:table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {product.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(product)} title="تعديل" className="h-8 w-8">
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(product.id)} title="حذف" className="h-8 w-8">
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-full sm:w-auto">السابق</Button>
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i
                    return <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(pageNum)} className="w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm">{pageNum}</Button>
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-full sm:w-auto">التالي</Button>
              </div>
            )}
          </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
