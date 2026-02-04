import { useState, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Plus, Building2, ArrowUpCircle, ArrowDownCircle, Calendar } from 'lucide-react'

interface BankAccountRow {
  id: string
  account_holder: string
  account_number: string
  bank_name: string
  branch_name?: string
  branch_id?: string
  current_balance: number
  currency: string
  is_active: boolean
  notes?: string
  branch?: { name_ar: string }
}

interface BranchRow {
  id: string
  name_ar: string
  code: string
}

interface BankTransactionRow {
  id: string
  account_id: string
  transaction_date: string
  transaction_type: string
  amount: number
  balance_after: number
  reference_number?: string
  description?: string
  related_account_id?: string
  account?: { account_holder: string; bank_name: string }
  related_account?: { account_holder: string; bank_name: string }
}

export default function BankAccounts() {
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [showStatementDialog, setShowStatementDialog] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<BankAccountRow | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { user } = useAuthStore()

  const [accountForm, setAccountForm] = useState({
    account_holder: '',
    account_number: '',
    bank_name: '',
    branch_name: '',
    branch_id: '',
    current_balance: '',
    currency: 'EGP',
    notes: '',
  })

  const [transactionForm, setTransactionForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: 'deposit',
    amount: '',
    reference_number: '',
    description: '',
    related_account_id: '',
  })

  const queryClient = useQueryClient()

  // Fetch branches
  const { data: branches } = useQuery<BranchRow[]>({
    queryKey: ['branches-for-bank-accounts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('status', 'active')
        .order('name_ar')
      return (data || []) as BranchRow[]
    },
  })

  // Fetch bank accounts - filter by user's branch if they are branch manager
  const { data: accounts, isLoading } = useQuery<BankAccountRow[]>({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      let query = supabase
        .from('bank_accounts')
        .select('*, branch:branches(name_ar)')
        .eq('is_active', true)
        .order('account_holder')
      
      const userRole = user?.role?.name_ar || user?.role?.name
      
      // If user is branch manager, only show accounts for their branch
      if (user?.branch_id) {
        query = query.eq('branch_id', user.branch_id)
      }
      // If user is accountant (محاسب), only show accounts for "الشركة" branch
      else if (userRole === 'محاسب') {
        // Get الشركة branch ID
        const { data: companyBranch } = await supabase
          .from('branches')
          .select('id')
          .eq('name_ar', 'الشركة')
          .single()
        
        if (companyBranch) {
          query = query.eq('branch_id', (companyBranch as { id: string }).id)
        }
      }

      const { data } = await query
      return (data || []) as BankAccountRow[]
    },
  })

  // Fetch transactions for selected account
  const { data: transactions } = useQuery<BankTransactionRow[]>({
    queryKey: ['bank-transactions', selectedAccount?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!selectedAccount) return []
      let query = supabase
        .from('bank_transactions')
        .select('*, account:bank_accounts!bank_transactions_account_id_fkey(account_holder, bank_name), related_account:bank_accounts!bank_transactions_related_account_id_fkey(account_holder, bank_name)')
        .eq('account_id', selectedAccount.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (dateFrom) query = query.gte('transaction_date', dateFrom)
      if (dateTo) query = query.lte('transaction_date', dateTo)

      const { data } = await query.limit(100)
      return (data || []) as BankTransactionRow[]
    },
    enabled: !!selectedAccount,
  })

  // Calculate totals
  const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0
  const totalDeposits = transactions?.filter(t => t.transaction_type === 'deposit').reduce((sum, t) => sum + (t.amount || 0), 0) || 0
  const totalWithdrawals = transactions?.filter(t => t.transaction_type === 'withdrawal').reduce((sum, t) => sum + (t.amount || 0), 0) || 0

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('bank_accounts').insert({
        account_holder: accountForm.account_holder,
        account_number: accountForm.account_number,
        bank_name: accountForm.bank_name,
        branch_name: accountForm.branch_name || null,
        branch_id: accountForm.branch_id || null,
        current_balance: parseFloat(accountForm.current_balance) || 0,
        opening_balance: parseFloat(accountForm.current_balance) || 0,
        currency: accountForm.currency,
        notes: accountForm.notes || null,
        status: 'active',
      } as never)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      setShowAccountDialog(false)
      setAccountForm({
        account_holder: '',
        account_number: '',
        bank_name: '',
        branch_name: '',
        branch_id: '',
        current_balance: '',
        currency: 'EGP',
        notes: '',
      })
      alert('تم إضافة الحساب بنجاح!')
    },
    onError: (err) => alert('خطأ: ' + err.message),
  })

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAccount) throw new Error('لم يتم اختيار حساب')

      const amount = parseFloat(transactionForm.amount)
      let newBalance = selectedAccount.current_balance

      if (transactionForm.transaction_type === 'deposit') {
        newBalance += amount
      } else if (transactionForm.transaction_type === 'withdrawal') {
        newBalance -= amount
      } else if (transactionForm.transaction_type === 'transfer') {
        if (!transactionForm.related_account_id) throw new Error('يجب اختيار الحساب المحول إليه')
        newBalance -= amount
      }

      // Insert transaction
      const { error: transError } = await supabase.from('bank_transactions').insert({
        account_id: selectedAccount.id,
        transaction_date: transactionForm.transaction_date,
        transaction_type: transactionForm.transaction_type,
        amount: amount,
        balance_after: newBalance,
        reference_number: transactionForm.reference_number || null,
        description: transactionForm.description || null,
        related_account_id: transactionForm.related_account_id || null,
      } as never)

      if (transError) throw transError

      // Update account balance
      const { error: balError } = await supabase
        .from('bank_accounts')
        .update({ current_balance: newBalance } as never)
        .eq('id', selectedAccount.id)

      if (balError) throw balError

      // If transfer, create opposite transaction and update related account
      if (transactionForm.transaction_type === 'transfer' && transactionForm.related_account_id) {
        const { data: relatedAccount } = await supabase
          .from('bank_accounts')
          .select('current_balance')
          .eq('id', transactionForm.related_account_id)
          .single()

        if (relatedAccount) {
          const relatedBalance = (relatedAccount as { current_balance: number }).current_balance + amount

          await supabase.from('bank_transactions').insert({
            account_id: transactionForm.related_account_id,
            transaction_date: transactionForm.transaction_date,
            transaction_type: 'deposit',
            amount: amount,
            balance_after: relatedBalance,
            reference_number: transactionForm.reference_number || null,
            description: `تحويل من ${selectedAccount.account_holder}`,
            related_account_id: selectedAccount.id,
          } as never)

          await supabase
            .from('bank_accounts')
            .update({ current_balance: relatedBalance } as never)
            .eq('id', transactionForm.related_account_id)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] })
      setShowTransactionDialog(false)
      setTransactionForm({
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'deposit',
        amount: '',
        reference_number: '',
        description: '',
        related_account_id: '',
      })
      alert('تم تسجيل الحركة بنجاح!')
    },
    onError: (err) => alert('خطأ: ' + err.message),
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">حسابات البنك</h1>
          <p className="text-sm text-muted-foreground">إدارة الحسابات البنكية والحركات المالية</p>
        </div>
        <Button onClick={() => setShowAccountDialog(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 ml-2" />
          إضافة حساب بنكي
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرصدة</CardTitle>
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">{accounts?.length || 0} حساب</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الإيداعات</CardTitle>
            <ArrowUpCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalDeposits)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">السحوبات</CardTitle>
            <ArrowDownCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalWithdrawals)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent onClose={() => setShowAccountDialog(false)} className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">إضافة حساب بنكي جديد</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">اسم الحساب *</label>
              <Input
                value={accountForm.account_holder}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAccountForm({...accountForm, account_holder: e.target.value})}
                placeholder="مثال: حساب جاري"
              />
            </div>
            <div>
              <label className="text-sm font-medium">رقم الحساب *</label>
              <Input
                value={accountForm.account_number}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAccountForm({...accountForm, account_number: e.target.value})}
                placeholder="رقم الحساب البنكي"
              />
            </div>
            <div>
              <label className="text-sm font-medium">اسم البنك *</label>
              <Input
                value={accountForm.bank_name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAccountForm({...accountForm, bank_name: e.target.value})}
                placeholder="مثال: البنك الأهلي المصري"
              />
            </div>
            <div>
              <label className="text-sm font-medium">الفرع *</label>
              <select
                value={accountForm.branch_id}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setAccountForm({...accountForm, branch_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="">اختر الفرع</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name_ar}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">الرصيد الافتتاحي</label>
              <Input
                type="number"
                step="0.01"
                value={accountForm.current_balance}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAccountForm({...accountForm, current_balance: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">العملة</label>
              <select
                value={accountForm.currency}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setAccountForm({...accountForm, currency: e.target.value})}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EUR">يورو (EUR)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="AED">درهم إماراتي (AED)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">ملاحظات</label>
              <Input
                value={accountForm.notes}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAccountForm({...accountForm, notes: e.target.value})}
                placeholder="ملاحظات إضافية"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowAccountDialog(false)} className="w-full sm:w-auto">إلغاء</Button>
            <Button
              onClick={() => createAccountMutation.mutate()}
              disabled={!accountForm.account_holder || !accountForm.account_number || !accountForm.bank_name || !accountForm.branch_id || createAccountMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createAccountMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent onClose={() => setShowTransactionDialog(false)} className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">تسجيل حركة بنكية</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <p className="text-sm font-medium mb-2">الحساب: {selectedAccount?.account_holder} - {selectedAccount?.bank_name}</p>
              <p className="text-sm text-muted-foreground">الرصيد الحالي: {formatCurrency(selectedAccount?.current_balance || 0)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">التاريخ *</label>
              <Input
                type="date"
                value={transactionForm.transaction_date}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTransactionForm({...transactionForm, transaction_date: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium">نوع الحركة *</label>
              <select
                value={transactionForm.transaction_type}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setTransactionForm({...transactionForm, transaction_type: e.target.value})}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="deposit">إيداع</option>
                <option value="withdrawal">سحب</option>
                <option value="transfer">تحويل</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">المبلغ *</label>
              <Input
                type="number"
                step="0.01"
                value={transactionForm.amount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTransactionForm({...transactionForm, amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
            {transactionForm.transaction_type === 'transfer' && (
              <div>
                <label className="text-sm font-medium">التحويل إلى *</label>
                <select
                  value={transactionForm.related_account_id}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setTransactionForm({...transactionForm, related_account_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                >
                  <option value="">اختر الحساب</option>
                  {accounts?.filter(acc => acc.id !== selectedAccount?.id).map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.account_holder} - {acc.bank_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">رقم المرجع</label>
              <Input
                value={transactionForm.reference_number}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTransactionForm({...transactionForm, reference_number: e.target.value})}
                placeholder="رقم الشيك أو الحوالة"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">الوصف</label>
              <Input
                value={transactionForm.description}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTransactionForm({...transactionForm, description: e.target.value})}
                placeholder="وصف الحركة"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowTransactionDialog(false)} className="w-full sm:w-auto">إلغاء</Button>
            <Button
              onClick={() => createTransactionMutation.mutate()}
              disabled={!transactionForm.amount || createTransactionMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createTransactionMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statement Dialog */}
      <Dialog open={showStatementDialog} onOpenChange={setShowStatementDialog}>
        <DialogContent onClose={() => setShowStatementDialog(false)} className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">كشف حساب بنكي</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 sm:p-4 bg-muted rounded-md">
              <p className="font-bold text-sm sm:text-base">{selectedAccount?.account_holder}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{selectedAccount?.bank_name} - {selectedAccount?.account_number}</p>
              <p className="text-sm sm:text-base font-bold mt-2">الرصيد الحالي: {formatCurrency(selectedAccount?.current_balance || 0)}</p>
            </div>

            {/* Date Filter */}
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

            {/* Transactions Table */}
            {!transactions?.length ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد حركات</p>
            ) : (
              <div>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-3 px-2">التاريخ</th>
                        <th className="text-right py-3 px-2">النوع</th>
                        <th className="text-right py-3 px-2">المبلغ</th>
                        <th className="text-right py-3 px-2">الرصيد بعد</th>
                        <th className="text-right py-3 px-2">المرجع</th>
                        <th className="text-right py-3 px-2">الوصف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">{new Date(transaction.transaction_date).toLocaleDateString('ar-EG')}</td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              transaction.transaction_type === 'deposit' ? 'bg-green-100 text-green-700' :
                              transaction.transaction_type === 'withdrawal' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {transaction.transaction_type === 'deposit' && 'إيداع'}
                              {transaction.transaction_type === 'withdrawal' && 'سحب'}
                              {transaction.transaction_type === 'transfer' && 'تحويل'}
                            </span>
                          </td>
                          <td className={`py-3 px-2 font-bold ${
                            transaction.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(transaction.amount || 0)}
                          </td>
                          <td className="py-3 px-2 font-bold">{formatCurrency(transaction.balance_after || 0)}</td>
                          <td className="py-3 px-2 text-xs font-mono">{transaction.reference_number || '-'}</td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">{transaction.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="block md:hidden space-y-3">
                  {transactions.map((transaction) => (
                    <Card key={transaction.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs text-muted-foreground">{new Date(transaction.transaction_date).toLocaleDateString('ar-EG')}</p>
                            <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${
                              transaction.transaction_type === 'deposit' ? 'bg-green-100 text-green-700' :
                              transaction.transaction_type === 'withdrawal' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {transaction.transaction_type === 'deposit' && 'إيداع'}
                              {transaction.transaction_type === 'withdrawal' && 'سحب'}
                              {transaction.transaction_type === 'transfer' && 'تحويل'}
                            </span>
                          </div>
                          <div className="text-left">
                            <p className={`font-bold text-base ${
                              transaction.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(transaction.amount || 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">الرصيد: {formatCurrency(transaction.balance_after || 0)}</p>
                          </div>
                        </div>
                        {transaction.description && (
                          <p className="text-sm text-muted-foreground">{transaction.description}</p>
                        )}
                        {transaction.reference_number && (
                          <p className="text-xs font-mono text-muted-foreground">مرجع: {transaction.reference_number}</p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>الحسابات البنكية</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !accounts?.length ? (
            <p className="text-center py-8 text-muted-foreground">لا توجد حسابات بنكية</p>
          ) : (
            <div>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-2">اسم الحساب</th>
                      <th className="text-right py-3 px-2">البنك</th>
                      <th className="text-right py-3 px-2">رقم الحساب</th>
                      <th className="text-right py-3 px-2">الفرع</th>
                      <th className="text-right py-3 px-2">الرصيد الحالي</th>
                      <th className="text-right py-3 px-2">العملة</th>
                      <th className="text-right py-3 px-2">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{account.account_holder}</td>
                        <td className="py-3 px-2">{account.bank_name}</td>
                        <td className="py-3 px-2 font-mono text-sm">{account.account_number}</td>
                        <td className="py-3 px-2">{account.branch?.name_ar || '-'}</td>
                        <td className="py-3 px-2 font-bold text-primary">{formatCurrency(account.current_balance || 0)}</td>
                        <td className="py-3 px-2">{account.currency}</td>
                        <td className="py-3 px-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAccount(account)
                                setShowTransactionDialog(true)
                              }}
                            >
                              تسجيل حركة
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAccount(account)
                                setShowStatementDialog(true)
                              }}
                            >
                              كشف الحساب
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="block md:hidden space-y-3">
                {accounts.map((account) => (
                  <Card key={account.id} className="p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="font-bold text-base">{account.account_holder}</p>
                        <p className="text-sm text-muted-foreground">{account.bank_name}</p>
                        <p className="text-xs font-mono text-muted-foreground mt-1">{account.account_number}</p>
                        {account.branch?.name_ar && (
                          <p className="text-xs text-muted-foreground mt-1">الفرع: {account.branch.name_ar}</p>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">الرصيد الحالي</p>
                          <p className="font-bold text-lg text-primary">{formatCurrency(account.current_balance || 0)}</p>
                          <p className="text-xs text-muted-foreground">{account.currency}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAccount(account)
                            setShowTransactionDialog(true)
                          }}
                          className="w-full"
                        >
                          تسجيل حركة
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAccount(account)
                            setShowStatementDialog(true)
                          }}
                          className="w-full"
                        >
                          كشف الحساب
                        </Button>
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
