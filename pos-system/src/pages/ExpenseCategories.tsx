import { useState, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, Tag } from 'lucide-react'

export default function ExpenseCategories() {
  const [showDialog, setShowDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    description: '',
  })
  const queryClient = useQueryClient()

  // Fetch categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name_ar')
      return data || []
    },
  })

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingCategory) {
        // Update
        const { error } = await supabase
          .from('expense_categories')
          .update({
            name_ar: formData.name_ar,
            name_en: formData.name_en || null,
            description: formData.description || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id)
        if (error) throw error
      } else {
        // Create
        const code = `EXP_${Date.now()}`
        const { error } = await supabase
          .from('expense_categories')
          .insert({
            code,
            name_ar: formData.name_ar,
            name_en: formData.name_en || null,
            description: formData.description || null,
            is_system: false,
          } as never)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      setShowDialog(false)
      setEditingCategory(null)
      setFormData({ name_ar: '', name_en: '', description: '' })
      alert(editingCategory ? 'تم تحديث النوع بنجاح!' : 'تم إضافة النوع بنجاح!')
    },
    onError: (err) => alert('خطأ: ' + err.message),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      alert('تم حذف النوع بنجاح!')
    },
    onError: (err) => alert('خطأ: ' + err.message),
  })

  const handleEdit = (category: any) => {
    setEditingCategory(category)
    setFormData({
      name_ar: category.name_ar,
      name_en: category.name_en || '',
      description: category.description || '',
    })
    setShowDialog(true)
  }

  const handleDelete = (category: any) => {
    if (category.is_system) {
      alert('لا يمكن حذف الأنواع الافتراضية')
      return
    }
    if (confirm(`هل أنت متأكد من حذف "${category.name_ar}"؟`)) {
      deleteMutation.mutate(category.id)
    }
  }

  const handleCloseDialog = () => {
    setShowDialog(false)
    setEditingCategory(null)
    setFormData({ name_ar: '', name_en: '', description: '' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">أنواع المصروفات</h1>
          <p className="text-muted-foreground">إدارة تصنيفات المصروفات</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة نوع جديد
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent onClose={handleCloseDialog} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'تعديل نوع المصروف' : 'إضافة نوع مصروف جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="name_ar" className="text-sm font-medium">الاسم بالعربية *</label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, name_ar: e.target.value})}
                placeholder="مثال: كهرباء"
              />
            </div>
            <div>
              <label htmlFor="name_en" className="text-sm font-medium">الاسم بالإنجليزية</label>
              <Input
                id="name_en"
                value={formData.name_en}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, name_en: e.target.value})}
                placeholder="Example: Electricity"
              />
            </div>
            <div>
              <label htmlFor="description" className="text-sm font-medium">الوصف</label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, description: e.target.value})}
                placeholder="وصف اختياري"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>إلغاء</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!formData.name_ar || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الأنواع</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !categories?.length ? (
            <p className="text-center py-8 text-muted-foreground">لا توجد أنواع</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="p-4 border rounded-lg hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-bold">{category.name_ar}</p>
                        {category.name_en && (
                          <p className="text-sm text-muted-foreground">{category.name_en}</p>
                        )}
                        {category.description && (
                          <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                        )}
                        {category.is_system && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            افتراضي
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!category.is_system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(category)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
