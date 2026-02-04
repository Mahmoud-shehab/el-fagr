import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

interface TransferPrintProps {
  transferId: string
  onClose: () => void
}

export default function TransferPrint({ transferId, onClose }: TransferPrintProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const { data: transfer } = useQuery({
    queryKey: ['transfer-print', transferId],
    queryFn: async () => {
      const { data } = await supabase
        .from('stock_transfers')
        .select(`
          *,
          from_branch:branches!stock_transfers_from_branch_id_fkey(name_ar, address, phone),
          to_branch:branches!stock_transfers_to_branch_id_fkey(name_ar, address, phone)
        `)
        .eq('id', transferId)
        .single()
      return data
    },
  })

  const { data: items } = useQuery({
    queryKey: ['transfer-items-print', transferId],
    queryFn: async () => {
      const { data } = await supabase
        .from('stock_transfer_items')
        .select('*, product:products(code, name_ar)')
        .eq('transfer_id', transferId)
      return data || []
    },
  })

  const { data: companyName } = useQuery({
    queryKey: ['company-name'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'company_name')
        .single()
      return data?.value || 'الفجر الجديد'
    },
  })

  useEffect(() => {
    if (transfer && items) {
      setTimeout(() => {
        window.print()
        onClose()
      }, 500)
    }
  }, [transfer, items, onClose])

  if (!transfer || !items) return null

  return (
    <div ref={printRef} className="print-only fixed inset-0 bg-white z-50 overflow-auto">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { position: fixed; left: 0; top: 0; width: 100%; }
          @page { margin: 1cm; }
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto p-8 text-right" dir="rtl">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 pb-4">
          <h1 className="text-3xl font-bold mb-2">{companyName}</h1>
          <h2 className="text-xl font-semibold">سند تحويل مخزون</h2>
        </div>

        {/* Transfer Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="font-bold">رقم التحويل: <span className="font-normal">{transfer.transfer_number}</span></p>
            <p className="font-bold">التاريخ: <span className="font-normal">{formatDate(transfer.transfer_date || transfer.created_at)}</span></p>
          </div>
          <div>
            <p className="font-bold">الحالة: <span className="font-normal">{transfer.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}</span></p>
          </div>
        </div>

        {/* From/To Branches */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border p-4 rounded">
            <h3 className="font-bold text-lg mb-2">من فرع:</h3>
            <p className="font-semibold">{transfer.from_branch?.name_ar}</p>
            {transfer.from_branch?.address && <p className="text-sm">{transfer.from_branch.address}</p>}
            {transfer.from_branch?.phone && <p className="text-sm">هاتف: {transfer.from_branch.phone}</p>}
          </div>
          <div className="border p-4 rounded">
            <h3 className="font-bold text-lg mb-2">إلى فرع:</h3>
            <p className="font-semibold">{transfer.to_branch?.name_ar}</p>
            {transfer.to_branch?.address && <p className="text-sm">{transfer.to_branch.address}</p>}
            {transfer.to_branch?.phone && <p className="text-sm">هاتف: {transfer.to_branch.phone}</p>}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-right">#</th>
              <th className="border p-2 text-right">كود المنتج</th>
              <th className="border p-2 text-right">اسم المنتج</th>
              <th className="border p-2 text-right">الكمية</th>
              <th className="border p-2 text-right">تكلفة الوحدة</th>
              <th className="border p-2 text-right">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, index: number) => (
              <tr key={item.id}>
                <td className="border p-2">{index + 1}</td>
                <td className="border p-2">{item.product?.code}</td>
                <td className="border p-2">{item.product?.name_ar}</td>
                <td className="border p-2 text-center">{item.received_quantity || item.requested_quantity}</td>
                <td className="border p-2">{formatCurrency(item.unit_cost || 0)}</td>
                <td className="border p-2">{formatCurrency(item.total_value || 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={3} className="border p-2 text-left">الإجمالي</td>
              <td className="border p-2 text-center">{items.reduce((sum: number, item: any) => sum + (item.received_quantity || item.requested_quantity || 0), 0)}</td>
              <td className="border p-2"></td>
              <td className="border p-2">{formatCurrency(transfer.total_value || 0)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t">
          <div className="text-center">
            <div className="border-t-2 border-black pt-2 mt-16">
              <p className="font-bold">المرسل</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-black pt-2 mt-16">
              <p className="font-bold">المستلم</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-black pt-2 mt-16">
              <p className="font-bold">المدير</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>تم الطباعة في: {new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>
    </div>
  )
}
