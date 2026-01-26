import { useState, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Plus, DollarSign, Calendar, User, Building2 } from 'lucide-react'

export default function PartnerWithdrawals() {
  const [showDialog, setShowDialog] = useState(false)
  const [formData, setFormData] = useState({
    branch_id: '',
    partner_name: '',
    amount: 0,
    notes: '',
  })
  const queryClient = useQueryClient()

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['withdrawal-branches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('status', 'active')
        .order('name_ar')
      return data || []
    },
  })

  // Fetch withdrawals
  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ['partner-withdrawals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('partner_withdrawals')
        .select('*, branch:branches(name_ar)')
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  // Get current balance for selected branch
  const { data: branchBalance } = useQuery({
    queryKey: ['branch-balance', formData.branch_id],
    queryFn: async () => {
      if (!formData.branch_id) return 0
      
      // Calculate total sales profit for this branch
      const { data: sales } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('branch_id', formData.branch_id)
        .eq('status', 'completed')
      
      const totalSales = sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0
      const estimatedProfit = totalSales * 0.2 // Simplified profit calculation
      
      // Subtract previous withdrawals
      const { data: prevWithdrawals } = await supabase
        .from('partner_withdrawals')
        .select('amount')
        .eq('branch_id', formData.branch_id)
        .eq('status', 'approved')
      
      const totalWithdrawals = prevWithdrawals?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0
      
      return estimatedProfit - totalWithdrawals
    },
    enabled: !!formData.branch_id,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const withdrawalNumber = `WD-${Date.now()}`
      const balanceBefore = branchBalance || 0
      const balanceAfter = balanceBefore - formData.amount
      
      const { error } = await supabase.from('partner_withdrawals').insert({
        withdrawal_number: withdrawalNumber,
        branch_id: formData.branch_id,
        partner_name: formData.partner_name,
        amount: formData.amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        notes: formData.notes || null,
        status: 'approved',
        withdrawal_date: new Date().toISOString(),
      } as never)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-withdrawals'] })
      queryClient.invalidateQueries({ queryKey: ['branch-balance'] })
      setShowDialog(false)
      setFormData({ branch_id: '', partner_name: '', amount: 0, notes: '' })
      alert('تم تسجيل السحب بنجاح!')
    },
    onError: (err) => alert('خطأ: ' + err.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">سحوبات الشركاء</h1>
          <p className="text-muted-foreground">إدارة سحوبات الشركاء من الأرباح</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 ml-2" />
          تسجيل سحب جديد
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent onClose={() => setShowDialog(false)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تسجيل سحب جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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

            {formData.branch_id && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">الرصيد المتاح</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(branchBalance || 0)}</p>
              </div>
            )}

            <div>
              <label htmlFor="partner" className="text-sm font-medium">اسم الشريك *</label>
              <Input 
                id="partner" 
                value={formData.partner_name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, partner_name: e.target.value})}
                placeholder="أدخل اسم الشريك" 
              />
            </div>

            <div>
              <label htmlFor="amount" className="text-sm font-medium">المبلغ *</label>
              <Input 
                id="amount" 
                type="number"
                value={formData.amount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                placeholder="0" 
              />
            </div>

            <div>
              <label htmlFor="notes" className="text-sm font-medium">ملاحظات</label>
              <Input 
                id="notes" 
                value={formData.notes}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, notes: e.target.value})}
                placeholder="ملاحظات إضافية" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button 
              onClick={() => createMutation.mutate()}
              disabled={!formData.branch_id || !formData.partner_name || formData.amount <= 0 || createMutation.isPending}
            >
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>سجل السحوبات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !withdrawals?.length ? (
            <p className="text-center py-8 text-muted-foreground">لا توجد سحوبات</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-2">رقم السحب</th>
                    <th className="text-right py-3 px-2">التاريخ</th>
                    <th className="text-right py-3 px-2">الفرع</th>
                    <th className="text-right py-3 px-2">الشريك</th>
                    <th className="text-right py-3 px-2">المبلغ</th>
                    <th className="text-right py-3 px-2">الرصيد قبل</th>
                    <th className="text-right py-3 px-2">الرصيد بعد</th>
                    <th className="text-right py-3 px-2">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-mono text-sm">{withdrawal.withdrawal_number}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(withdrawal.withdrawal_date || withdrawal.created_at).toLocaleDateString('ar-EG')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(withdrawal.withdrawal_date || withdrawal.created_at).toLocaleTimeString('ar-EG')}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {withdrawal.branch?.name_ar}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {withdrawal.partner_name}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-bold text-destructive">{formatCurrency(withdrawal.amount || 0)}</span>
                      </td>
                      <td className="py-3 px-2">{formatCurrency(withdrawal.balance_before || 0)}</td>
                      <td className="py-3 px-2">{formatCurrency(withdrawal.balance_after || 0)}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          {withdrawal.status === 'approved' ? 'معتمد' : 'معلق'}
                        </span>
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
