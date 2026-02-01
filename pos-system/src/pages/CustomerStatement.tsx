import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Printer, Search, User, Calendar } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'

export default function CustomerStatement() {
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // Fetch customers for search
  const { data: customers } = useQuery({
    queryKey: ['statement-customers', customerSearch],
    queryFn: async () => {
      if (!customerSearch) return []
      const { data } = await supabase
        .from('customers')
        .select('*')
        .or(`code.ilike.%${customerSearch}%,name_ar.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`)
        .limit(10)
      return data || []
    },
    enabled: customerSearch.length > 0,
  })

  // Fetch customer transactions
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['customer-transactions', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return []
      
      const transactions: any[] = []
      
      // Get sales
      const { data: sales } = await supabase
        .from('sales')
        .select('*')
        .eq('customer_id', selectedCustomer.id)
        .order('created_at', { ascending: true })
      
      sales?.forEach(sale => {
        transactions.push({
          date: sale.created_at,
          type: 'sale',
          reference: sale.invoice_number,
          description: 'فاتورة مبيعات',
          debit: sale.payment_method === 'credit' ? sale.total_amount : 0,
          credit: 0,
        })
        
        // If there was a payment
        if (sale.paid_amount && sale.paid_amount > 0) {
          transactions.push({
            date: sale.created_at,
            type: 'payment',
            reference: sale.invoice_number,
            description: 'دفعة على الفاتورة',
            debit: 0,
            credit: sale.paid_amount,
          })
        }
      })
      
      // Get returns
      const { data: returns } = await supabase
        .from('returns')
        .select('*')
        .eq('customer_id', selectedCustomer.id)
        .order('created_at', { ascending: true })
      
      returns?.forEach(ret => {
        transactions.push({
          date: ret.created_at,
          type: 'return',
          reference: ret.return_number,
          description: 'مرتجع',
          debit: 0,
          credit: ret.total_amount || 0,
        })
      })
      
      // Sort by date
      transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      // Calculate running balance
      let balance = 0
      transactions.forEach(t => {
        balance += (t.debit || 0) - (t.credit || 0)
        t.balance = balance
      })
      
      return transactions
    },
    enabled: !!selectedCustomer,
  })

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `كشف حساب - ${selectedCustomer?.name_ar || selectedCustomer?.name}`,
  })

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">كشف حساب العملاء</h1>
          <p className="text-sm text-muted-foreground">عرض كشف حساب تفصيلي لكل عميل</p>
        </div>
      </div>

      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle>اختر العميل</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div 
              className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-muted"
              onClick={() => setShowCustomerSearch(!showCustomerSearch)}
            >
              <User className="h-5 w-5 text-primary" />
              <span className="flex-1">
                {selectedCustomer ? selectedCustomer.name_ar || selectedCustomer.name : 'اختر عميل...'}
              </span>
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {showCustomerSearch && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 p-2">
                <input
                  type="text"
                  placeholder="بحث عن عميل..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md mb-2"
                  autoFocus
                />
                <div className="max-h-60 overflow-auto">
                  {customers?.map((customer) => (
                    <button
                      type="button"
                      key={customer.id}
                      className="w-full p-2 text-right hover:bg-muted rounded"
                      onClick={() => { 
                        setSelectedCustomer(customer)
                        setShowCustomerSearch(false)
                        setCustomerSearch('')
                      }}
                    >
                      <p className="font-medium">{customer.name_ar || customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.phone} - {customer.code}</p>
                    </button>
                  ))}
                  {customerSearch && customers?.length === 0 && (
                    <p className="text-center py-4 text-muted-foreground text-sm">لا توجد نتائج</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statement */}
      {selectedCustomer && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-lg">كشف الحساب</CardTitle>
              <Button onClick={handlePrint} disabled={!transactions?.length} className="w-full sm:w-auto">
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={printRef} className="space-y-4">
              {/* Header for print */}
              <div className="print-only mb-6">
                <div className="text-center mb-4">
                  <h1 className="text-2xl font-bold">الفجر الجديدة للاستيراد والتجارة</h1>
                  <p className="text-lg mt-2">كشف حساب عميل</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>العميل:</strong> {selectedCustomer.name_ar || selectedCustomer.name}</p>
                    <p><strong>الكود:</strong> {selectedCustomer.code}</p>
                  </div>
                  <div>
                    <p><strong>الهاتف:</strong> {selectedCustomer.phone}</p>
                    <p><strong>التاريخ:</strong> {new Date().toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>
                <hr className="my-4" />
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted rounded-md no-print">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">اسم العميل</p>
                  <p className="font-bold text-sm sm:text-base">{selectedCustomer.name_ar || selectedCustomer.name}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">رقم الهاتف</p>
                  <p className="font-bold text-sm sm:text-base">{selectedCustomer.phone}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">الكود</p>
                  <p className="font-bold text-sm sm:text-base">{selectedCustomer.code}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">الرصيد الحالي</p>
                  <p className={`font-bold text-base sm:text-lg ${(selectedCustomer.current_balance || 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(selectedCustomer.current_balance || 0)}
                  </p>
                </div>
              </div>

              {/* Transactions Table */}
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
              ) : !transactions?.length ? (
                <p className="text-center py-8 text-muted-foreground">لا توجد حركات</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-2 px-1 sm:px-2">التاريخ</th>
                        <th className="text-right py-2 px-1 sm:px-2">المرجع</th>
                        <th className="text-right py-2 px-1 sm:px-2 hidden sm:table-cell">البيان</th>
                        <th className="text-right py-2 px-1 sm:px-2">مدين</th>
                        <th className="text-right py-2 px-1 sm:px-2">دائن</th>
                        <th className="text-right py-2 px-1 sm:px-2">الرصيد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-1 sm:px-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 hidden sm:inline" />
                              <span className="text-xs">{new Date(transaction.date).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' })}</span>
                            </div>
                          </td>
                          <td className="py-2 px-1 sm:px-2 font-mono text-xs">{transaction.reference}</td>
                          <td className="py-2 px-1 sm:px-2 hidden sm:table-cell">{transaction.description}</td>
                          <td className="py-2 px-1 sm:px-2 text-destructive text-xs sm:text-sm">
                            {transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}
                          </td>
                          <td className="py-2 px-1 sm:px-2 text-green-600 text-xs sm:text-sm">
                            {transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}
                          </td>
                          <td className="py-2 px-1 sm:px-2 font-bold text-xs sm:text-sm">
                            <span className={transaction.balance > 0 ? 'text-destructive' : 'text-green-600'}>
                              {formatCurrency(transaction.balance)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td colSpan={2} className="py-3 px-1 sm:px-2 text-right text-xs sm:text-sm">الإجمالي</td>
                        <td className="py-3 px-1 sm:px-2 text-destructive text-xs sm:text-sm hidden sm:table-cell">
                          {formatCurrency(transactions.reduce((sum, t) => sum + (t.debit || 0), 0))}
                        </td>
                        <td className="py-3 px-1 sm:px-2 text-destructive text-xs sm:text-sm sm:hidden">
                          {formatCurrency(transactions.reduce((sum, t) => sum + (t.debit || 0), 0))}
                        </td>
                        <td className="py-3 px-1 sm:px-2 text-green-600 text-xs sm:text-sm">
                          {formatCurrency(transactions.reduce((sum, t) => sum + (t.credit || 0), 0))}
                        </td>
                        <td className="py-3 px-1 sm:px-2 text-xs sm:text-sm">
                          <span className={transactions[transactions.length - 1]?.balance > 0 ? 'text-destructive' : 'text-green-600'}>
                            {formatCurrency(transactions[transactions.length - 1]?.balance || 0)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>
    </div>
  )
}
