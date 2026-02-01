import React, { useState, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, Phone, Mail, Star } from 'lucide-react'

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: 'نشط', color: 'bg-green-100 text-green-700' },
  inactive: { label: 'غير نشط', color: 'bg-gray-100 text-gray-700' },
  blocked: { label: 'محظور', color: 'bg-red-100 text-red-700' },
}

export default function Suppliers() {
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [formData, setFormData] = useState({
    name_ar: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: 0,
  })
  const queryClient = useQueryClient()

  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ['suppliers', search, currentPage],
    queryFn: async () => {
      let countQuery = supabase.from('suppliers').select('*', { count: 'exact', head: true })
      if (search) {
        countQuery = countQuery.or(`name.ilike.%${search}%,name_ar.ilike.%${search}%,code.ilike.%${search}%,phone.ilike.%${search}%`)
      }
      const { count } = await countQuery

      let query = supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,name_ar.ilike.%${search}%,code.ilike.%${search}%,phone.ilike.%${search}%`)
      }
      
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      const { data } = await query.range(from, to)
      
      return {
        suppliers: data || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage)
      }
    },
  })

  const suppliers = suppliersData?.suppliers || []
  const totalPages = suppliersData?.totalPages || 1
  const totalCount = suppliersData?.totalCount || 0

  React.useEffect(() => { setCurrentPage(1) }, [search])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('suppliers').delete().eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const code = `SUP-${Date.now()}`
      const { error } = await supabase.from('suppliers').insert({
        code,
        name_ar: formData.name_ar,
        name: formData.name_ar,
        phone: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        credit_limit: formData.credit_limit,
        current_balance: 0,
        status: 'active',
        rating: 0,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setShowDialog(false)
      setFormData({ name_ar: '', phone: '', email: '', address: '', credit_limit: 0 })
      alert('تم إضافة المورد بنجاح!')
    },
    onError: (err) => alert('خطأ: ' + err.message),
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">الموردين</h1>
          <p className="text-sm text-muted-foreground">إدارة بيانات الموردين</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 ml-2" />
          إضافة مورد
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent onClose={() => setShowDialog(false)} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة مورد جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium">اسم المورد *</label>
              <Input id="name" value={formData.name_ar}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, name_ar: e.target.value})}
                placeholder="أدخل اسم المورد" />
            </div>
            <div>
              <label htmlFor="phone" className="text-sm font-medium">رقم الهاتف *</label>
              <Input id="phone" value={formData.phone}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})}
                placeholder="أدخل رقم الهاتف" />
            </div>
            <div>
              <label htmlFor="email" className="text-sm font-medium">البريد الإلكتروني</label>
              <Input id="email" type="email" value={formData.email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})}
                placeholder="أدخل البريد الإلكتروني" />
            </div>
            <div>
              <label htmlFor="address" className="text-sm font-medium">العنوان</label>
              <Input id="address" value={formData.address}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, address: e.target.value})}
                placeholder="أدخل العنوان" />
            </div>
            <div>
              <label htmlFor="credit" className="text-sm font-medium">حد الائتمان</label>
              <Input id="credit" type="number" value={formData.credit_limit}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})}
                placeholder="0" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={() => createMutation.mutate()}
              disabled={!formData.name_ar || !formData.phone || createMutation.isPending}>
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الكود أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !suppliers?.length ? (
            <p className="text-center py-8 text-muted-foreground">لا يوجد موردين</p>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} من {totalCount} مورد
              </div>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-2">الكود</th>
                    <th className="text-right py-3 px-2">الاسم</th>
                    <th className="text-right py-3 px-2">التواصل</th>
                    <th className="text-right py-3 px-2">الرصيد</th>
                    <th className="text-right py-3 px-2">حد الائتمان</th>
                    <th className="text-right py-3 px-2">التقييم</th>
                    <th className="text-right py-3 px-2">الحالة</th>
                    <th className="text-right py-3 px-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono text-sm">{supplier.code}</td>
                      <td className="py-3 px-2">{supplier.name_ar || supplier.name}</td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{supplier.phone}</span>
                          {supplier.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{supplier.email}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={supplier.current_balance && supplier.current_balance > 0 ? 'text-destructive' : ''}>
                          {formatCurrency(supplier.current_balance || 0)}
                        </span>
                      </td>
                      <td className="py-3 px-2">{formatCurrency(supplier.credit_limit || 0)}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${star <= (supplier.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${statusLabels[supplier.status || 'active'].color}`}>
                          {statusLabels[supplier.status || 'active'].label}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(supplier.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
