import { useState, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, Phone, Mail, AlertTriangle } from 'lucide-react'

interface CustomerRow {
  id: string
  code: string
  name: string
  name_ar?: string
  phone: string
  email?: string
  address?: string
  tax_card_number?: string
  credit_limit?: number
  current_balance?: number
  status?: string
  branch_id?: string
  branch?: { name_ar?: string }
  group?: { name_ar?: string }
  created_at?: string
  overdueAmount?: number
  daysOverdue?: number
}

interface SaleRow {
  id: string
  customer_id?: string
  remaining_amount?: number
  due_date?: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'معلق', color: 'bg-yellow-100 text-yellow-700' },
  active: { label: 'نشط', color: 'bg-green-100 text-green-700' },
  on_hold: { label: 'موقوف', color: 'bg-orange-100 text-orange-700' },
  blocked: { label: 'محظور', color: 'bg-red-100 text-red-700' },
  closed: { label: 'مغلق', color: 'bg-gray-100 text-gray-700' },
}

export default function Customers() {
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [overdueFilter, setOverdueFilter] = useState<'all' | 'overdue'>('all')
  const [formData, setFormData] = useState({
    name_ar: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: 0,
    branch_id: '',
    tax_card_number: '',
  })
  const queryClient = useQueryClient()

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['customer-branches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('status', 'active')
        .order('name_ar')
      return data || []
    },
  })

  const { data: customers, isLoading } = useQuery<CustomerRow[]>({
    queryKey: ['customers', search, overdueFilter],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*, group:customer_groups(name_ar), branch:branches(name_ar)')
        .order('created_at', { ascending: false })
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,name_ar.ilike.%${search}%,code.ilike.%${search}%,phone.ilike.%${search}%`)
      }
      
      const { data } = await query.limit(50)
      
      // Calculate overdue amounts for each customer
      const today = new Date().toISOString().split('T')[0]
      const customersWithOverdue = await Promise.all(((data || []) as CustomerRow[]).map(async (customer: CustomerRow) => {
        // Get all credit sales with due dates that have passed
        const { data: overdueSales } = await supabase
          .from('sales')
          .select('remaining_amount, due_date')
          .eq('customer_id', customer.id)
          .gt('remaining_amount', 0)
          .not('due_date', 'is', null)
          .lt('due_date', today)
        
        const overdueAmount = ((overdueSales || []) as SaleRow[]).reduce((sum, sale) => sum + (sale.remaining_amount || 0), 0)
        
        // Find the oldest overdue invoice to calculate days overdue
        let daysOverdue = 0
        if (overdueSales && overdueSales.length > 0) {
          const oldestDueDate = (overdueSales as SaleRow[]).reduce((oldest: string, sale: SaleRow) => {
            const saleDate = sale.due_date || ''
            return !oldest || (saleDate && saleDate < oldest) ? saleDate : oldest
          }, '')
          
          if (oldestDueDate) {
            const dueDate = new Date(oldestDueDate)
            const todayDate = new Date(today)
            daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          }
        }
        
        return {
          ...customer,
          overdueAmount,
          daysOverdue
        }
      }))
      
      // Filter by overdue if needed
      if (overdueFilter === 'overdue') {
        return customersWithOverdue.filter((c: CustomerRow) => (c.overdueAmount || 0) > 0)
      }
      
      return customersWithOverdue
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('customers').delete().eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const code = `CUS-${Date.now()}`
      const { error } = await supabase.from('customers').insert({
        code,
        name_ar: formData.name_ar,
        name: formData.name_ar,
        phone: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        tax_card_number: formData.tax_card_number || null,
        credit_limit: formData.credit_limit,
        branch_id: formData.branch_id || null,
        current_balance: 0,
        status: 'active',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setShowDialog(false)
      setFormData({ name_ar: '', phone: '', email: '', address: '', credit_limit: 0, branch_id: '', tax_card_number: '' })
      alert('تم إضافة العميل بنجاح!')
    },
    onError: (err) => alert('خطأ: ' + err.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">العملاء</h1>
          <p className="text-muted-foreground">إدارة بيانات العملاء</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة عميل
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent onClose={() => setShowDialog(false)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة عميل جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium">اسم العميل *</label>
              <Input id="name" value={formData.name_ar} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, name_ar: e.target.value})}
                placeholder="أدخل اسم العميل" />
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
              <label htmlFor="tax_card" className="text-sm font-medium">رقم البطاقة الضريبية</label>
              <Input id="tax_card" value={formData.tax_card_number}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, tax_card_number: e.target.value})}
                placeholder="أدخل رقم البطاقة الضريبية" />
            </div>
            <div>
              <label htmlFor="credit" className="text-sm font-medium">حد الائتمان</label>
              <Input id="credit" type="number" value={formData.credit_limit}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})}
                placeholder="0" />
            </div>
            <div>
              <label htmlFor="branch" className="text-sm font-medium">الفرع *</label>
              <select
                id="branch"
                value={formData.branch_id}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({...formData, branch_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="">اختر الفرع</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name_ar}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={() => createMutation.mutate()}
              disabled={!formData.name_ar || !formData.phone || !formData.branch_id || createMutation.isPending}>
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الكود أو الهاتف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            
            {/* Overdue Filter */}
            <select
              value={overdueFilter}
              onChange={(e) => setOverdueFilter(e.target.value as 'all' | 'overdue')}
              className="px-3 py-2 border rounded-md bg-background"
              aria-label="فلتر المستحقات"
            >
              <option value="all">جميع العملاء</option>
              <option value="overdue">عملاء عليهم مستحقات</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !customers?.length ? (
            <p className="text-center py-8 text-muted-foreground">لا يوجد عملاء</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-2">الكود</th>
                    <th className="text-right py-3 px-2">الاسم</th>
                    <th className="text-right py-3 px-2">الفرع</th>
                    <th className="text-right py-3 px-2">التواصل</th>
                    <th className="text-right py-3 px-2">الرصيد</th>
                    <th className="text-right py-3 px-2">المستحق</th>
                    <th className="text-right py-3 px-2">أيام التأخير</th>
                    <th className="text-right py-3 px-2">حد الائتمان</th>
                    <th className="text-right py-3 px-2">الحالة</th>
                    <th className="text-right py-3 px-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {customers?.map((customer: CustomerRow) => (
                    <tr key={customer.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono text-sm">{customer.code}</td>
                      <td className="py-3 px-2">{customer.name_ar || customer.name}</td>
                      <td className="py-3 px-2">{customer.branch?.name_ar || '-'}</td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>
                          {customer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{customer.email}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={customer.current_balance && customer.current_balance > 0 ? 'text-destructive' : ''}>
                          {formatCurrency(customer.current_balance || 0)}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {(customer.overdueAmount || 0) > 0 ? (
                          <span className="text-destructive font-bold flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            {formatCurrency(customer.overdueAmount || 0)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {(customer.daysOverdue || 0) > 0 ? (
                          <span className="text-destructive font-bold">
                            {customer.daysOverdue} يوم
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2">{formatCurrency(customer.credit_limit || 0)}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${statusLabels[customer.status || 'active'].color}`}>
                          {statusLabels[customer.status || 'active'].label}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(customer.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
