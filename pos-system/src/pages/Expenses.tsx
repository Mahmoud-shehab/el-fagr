import { useState, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Plus, Calendar, DollarSign, Settings as SettingsIcon } from 'lucide-react'

interface ExpenseRow {
  id: string
  expense_number: string
  expense_date: string
  branch_id: string
  category_id: string
  amount: number
  payment_method: string
  payment_status: string
  reference_number?: string
  notes?: string
  branch?: { name_ar: string }
  category?: { name_ar: string }
  created_by_user?: { full_name_ar?: string; full_name?: string }
}

interface BranchRow {
  id: string
  name_ar: string
  status: string
}

interface CategoryRow {
  id: string
  name_ar: string
  is_active: boolean
}

export default function Expenses() {
  const [showDialog, setShowDialog] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    branch_id: '',
    category_id: '',
    amount: '',
    payment_method: 'cash',
    payment_status: 'paid',
    reference_number: '',
    notes: '',
  })
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Fetch branches
  const { data: branches } = useQuery<BranchRow[]>({
    queryKey: ['expense-branches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('status', 'active')
        .order('name_ar')
      return (data || []) as BranchRow[]
    },
  })

  // Fetch categories
  const { data: categories } = useQuery<CategoryRow[]>({
    queryKey: ['expense-categories-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name_ar')
      return (data || []) as CategoryRow[]
    },
  })

  // Fetch expenses
  const { data: expenses, isLoading } = useQuery<ExpenseRow[]>({
    queryKey: ['expenses', dateFrom, dateTo, branchFilter, categoryFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*, branch:branches(name_ar), category:expense_categories(name_ar), created_by_user:users!expenses_created_by_fkey(full_name_ar, full_name)')
        .order('expense_date', { ascending: false })

      if (dateFrom) query = query.gte('expense_date', dateFrom)
      if (dateTo) query = query.lte('expense_date', dateTo)
      if (branchFilter !== 'all') query = query.eq('branch_id', branchFilter)
      if (categoryFilter !== 'all') query = query.eq('category_id', categoryFilter)
      if (statusFilter !== 'all') query = query.eq('payment_status', statusFilter)

      const { data } = await query.limit(100)
      return (data || []) as ExpenseRow[]
    },
  })

  // Calculate totals
  const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
  const paidExpenses = expenses?.filter(exp => exp.payment_status === 'paid').reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
  const pendingExpenses = expenses?.filter(exp => exp.payment_status === 'pending').reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

  // Create expense mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const expenseNumber = `EXP-${Date.now()}`
      
      // Get current user
      const { data: users } = await supabase.from('users').select('id').limit(1)
      const userId = (users as { id: string }[] | null)?.[0]?.id

      const { error } = await supabase.from('expenses').insert({
        expense_number: expenseNumber,
        expense_date: formData.expense_date,
        branch_id: formData.branch_id,
        category_id: formData.category_id,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
        created_by: userId,
      } as never)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setShowDialog(false)
      setFormData({
        expense_date: new Date().toISOString().split('T')[0],
        branch_id: '',
        category_id: '',
        amount: '',
        payment_method: 'cash',
        payment_status: 'paid',
        reference_number: '',
        notes: '',
      })
      alert('تم إضافة المصروف بنجاح!')
    },
    onError: (err) => alert('خطأ: ' + err.message),
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">المصروفات</h1>
          <p className="text-sm text-muted-foreground">إدارة مصروفات الشركة</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => navigate('/expense-categories')} className="w-full sm:w-auto">
            <SettingsIcon className="h-4 w-4 ml-2" />
            إدارة الأنواع
          </Button>
          <Button onClick={() => setShowDialog(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 ml-2" />
            إضافة مصروف
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">{expenses?.length || 0} مصروف</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المدفوع</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(paidExpenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المعلق</CardTitle>
            <DollarSign className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingExpenses)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent onClose={() => setShowDialog(false)} className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">إضافة مصروف جديد</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">التاريخ *</label>
              <Input
                type="date"
                value={formData.expense_date}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, expense_date: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium">الفرع *</label>
              <select
                value={formData.branch_id}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({...formData, branch_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="">اختر الفرع</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name_ar}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">نوع المصروف *</label>
              <select
                value={formData.category_id}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({...formData, category_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="">اختر النوع</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name_ar}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">المبلغ *</label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">طريقة الدفع</label>
              <select
                value={formData.payment_method}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({...formData, payment_method: e.target.value})}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="cash">نقدي</option>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="check">شيك</option>
                <option value="credit_card">بطاقة ائتمان</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">حالة الدفع</label>
              <select
                value={formData.payment_status}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({...formData, payment_status: e.target.value})}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="paid">مدفوع</option>
                <option value="pending">معلق</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">رقم المرجع</label>
              <Input
                value={formData.reference_number}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, reference_number: e.target.value})}
                placeholder="رقم الفاتورة أو المرجع"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">ملاحظات</label>
              <Input
                value={formData.notes}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, notes: e.target.value})}
                placeholder="ملاحظات إضافية"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="w-full sm:w-auto">إلغاء</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!formData.branch_id || !formData.category_id || !formData.amount || createMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            {/* Date Range */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">الفترة:</span>
              </div>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
                className="flex-1 sm:w-40"
                placeholder="من"
              />
              <span className="text-center sm:text-right text-sm">إلى</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
                className="flex-1 sm:w-40"
                placeholder="إلى"
              />
            </div>
            
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="all">جميع الفروع</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name_ar}</option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="all">جميع الأنواع</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name_ar}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="all">جميع الحالات</option>
                <option value="paid">مدفوع</option>
                <option value="pending">معلق</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !expenses?.length ? (
            <p className="text-center py-8 text-muted-foreground">لا توجد مصروفات</p>
          ) : (
            <div>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-2">الرقم</th>
                    <th className="text-right py-3 px-2">التاريخ</th>
                    <th className="text-right py-3 px-2">الفرع</th>
                    <th className="text-right py-3 px-2">النوع</th>
                    <th className="text-right py-3 px-2">المبلغ</th>
                    <th className="text-right py-3 px-2">طريقة الدفع</th>
                    <th className="text-right py-3 px-2">الحالة</th>
                    <th className="text-right py-3 px-2">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono text-sm">{expense.expense_number}</td>
                      <td className="py-3 px-2">{new Date(expense.expense_date).toLocaleDateString('ar-EG')}</td>
                      <td className="py-3 px-2">{expense.branch?.name_ar}</td>
                      <td className="py-3 px-2">{expense.category?.name_ar}</td>
                      <td className="py-3 px-2 font-bold">{formatCurrency(expense.amount || 0)}</td>
                      <td className="py-3 px-2">
                        <span className="text-sm">
                          {expense.payment_method === 'cash' && 'نقدي'}
                          {expense.payment_method === 'bank_transfer' && 'تحويل بنكي'}
                          {expense.payment_method === 'check' && 'شيك'}
                          {expense.payment_method === 'credit_card' && 'بطاقة'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          expense.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                          expense.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {expense.payment_status === 'paid' && 'مدفوع'}
                          {expense.payment_status === 'pending' && 'معلق'}
                          {expense.payment_status === 'cancelled' && 'ملغي'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">{expense.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden space-y-3">
              {expenses.map((expense) => (
                <Card key={expense.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono text-sm font-bold">{expense.expense_number}</p>
                        <p className="text-xs text-muted-foreground">{new Date(expense.expense_date).toLocaleDateString('ar-EG')}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        expense.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                        expense.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {expense.payment_status === 'paid' && 'مدفوع'}
                        {expense.payment_status === 'pending' && 'معلق'}
                        {expense.payment_status === 'cancelled' && 'ملغي'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الفرع:</span>
                        <span className="font-medium">{expense.branch?.name_ar}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">النوع:</span>
                        <span className="font-medium">{expense.category?.name_ar}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المبلغ:</span>
                        <span className="font-bold text-primary">{formatCurrency(expense.amount || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">طريقة الدفع:</span>
                        <span className="font-medium">
                          {expense.payment_method === 'cash' && 'نقدي'}
                          {expense.payment_method === 'bank_transfer' && 'تحويل بنكي'}
                          {expense.payment_method === 'check' && 'شيك'}
                          {expense.payment_method === 'credit_card' && 'بطاقة'}
                        </span>
                      </div>
                      {expense.notes && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">{expense.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
