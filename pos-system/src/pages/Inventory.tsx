import { useState, ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Search, ArrowLeftRight, ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface InventoryRow {
  id: string
  quantity?: number
  avg_cost?: number
  min_quantity?: number
  product?: { code?: string; name?: string; name_ar?: string; min_stock_level?: number }
  branch?: { name_ar?: string }
}

interface BranchRow { id: string; name_ar: string }

export default function Inventory() {
  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const navigate = useNavigate()

  const { data: branches } = useQuery<BranchRow[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name_ar').eq('status', 'active')
      return (data || []) as BranchRow[]
    },
  })

  const { data: inventory, isLoading } = useQuery<InventoryRow[]>({
    queryKey: ['inventory', search, selectedBranch],
    queryFn: async () => {
      let query = supabase
        .from('inventory')
        .select('*, product:products(code, name, name_ar, min_stock_level), branch:branches(name_ar)')
      
      if (selectedBranch) {
        query = query.eq('branch_id', selectedBranch)
      }
      
      const { data } = await query.order('quantity', { ascending: true }).limit(100)
      let result = (data || []) as InventoryRow[]
      
      if (search) {
        result = result.filter(item => 
          item.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
          item.product?.name_ar?.includes(search) ||
          item.product?.code?.toLowerCase().includes(search.toLowerCase())
        )
      }
      
      return result
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المخزون</h1>
          <p className="text-muted-foreground">متابعة أرصدة المخزون</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/transfers')}>
            <ArrowLeftRight className="h-4 w-4 ml-2" />
            تحويل مخزون
          </Button>
          <Button variant="outline">
            <ClipboardList className="h-4 w-4 ml-2" />
            جرد جديد
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الكود..."
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <select
              id="branch-filter"
              title="فلترة حسب الفرع"
              value={selectedBranch}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedBranch(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background"
            >
              <option value="">كل الفروع</option>
              {branches?.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name_ar}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !inventory?.length ? (
            <p className="text-center py-8 text-muted-foreground">لا توجد بيانات</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-2">الكود</th>
                    <th className="text-right py-3 px-2">المنتج</th>
                    <th className="text-right py-3 px-2">الفرع</th>
                    <th className="text-right py-3 px-2">الكمية</th>
                    <th className="text-right py-3 px-2">الحد الأدنى</th>
                    <th className="text-right py-3 px-2">متوسط التكلفة</th>
                    <th className="text-right py-3 px-2">القيمة</th>
                    <th className="text-right py-3 px-2">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const isLow = (item.quantity || 0) < (item.product?.min_stock_level || 10)
                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-mono text-sm">{item.product?.code}</td>
                        <td className="py-3 px-2">{item.product?.name_ar}</td>
                        <td className="py-3 px-2">{item.branch?.name_ar}</td>
                        <td className="py-3 px-2 font-medium">{item.quantity}</td>
                        <td className="py-3 px-2">{item.product?.min_stock_level || 10}</td>
                        <td className="py-3 px-2">{formatCurrency(item.avg_cost || 0)}</td>
                        <td className="py-3 px-2">{formatCurrency((item.quantity || 0) * (item.avg_cost || 0))}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {isLow ? 'منخفض' : 'متوفر'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
