import { forwardRef } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PurchaseInvoicePrintProps {
  purchase: any
  items: any[]
  supplier: any
  branch: any
}

const PurchaseInvoicePrint = forwardRef<HTMLDivElement, PurchaseInvoicePrintProps>(
  ({ purchase, items, supplier, branch }, ref) => {
    return (
      <div ref={ref} className="p-8 bg-white text-black" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b-2 pb-4">
          <div>
            <img src="/el-fagr/logo.jpg" alt="الفجر الجديدة" className="w-24 h-24 object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary">الفجر الجديدة</h1>
            <p className="text-lg">للاستيراد والتجارة</p>
            <p className="text-sm">73 عمارات استثمار رابعة، مدينة نصر</p>
            <p className="text-sm">ت: 02-24156242 / 02-24142417</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold">فاتورة شراء</h2>
            <p className="text-sm">Purchase Invoice</p>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p><strong>رقم الفاتورة:</strong> {purchase.invoice_number}</p>
            <p><strong>التاريخ:</strong> {formatDate(purchase.invoice_date)}</p>
            <p><strong>الفرع:</strong> {branch?.name_ar}</p>
          </div>
          <div className="text-right">
            <p><strong>المورد:</strong> {supplier?.name_ar || supplier?.name}</p>
            <p><strong>الهاتف:</strong> {supplier?.phone}</p>
            {supplier?.address && <p><strong>العنوان:</strong> {supplier.address}</p>}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 text-right">#</th>
              <th className="border p-2 text-right">الصنف</th>
              <th className="border p-2 text-center">الكمية</th>
              <th className="border p-2 text-right">سعر الوحدة</th>
              <th className="border p-2 text-right">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td className="border p-2">{index + 1}</td>
                <td className="border p-2">{item.product?.name_ar || item.product?.name}</td>
                <td className="border p-2 text-center">{item.quantity}</td>
                <td className="border p-2">{formatCurrency(item.unit_price)}</td>
                <td className="border p-2">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64">
            <div className="flex justify-between py-2 border-b">
              <span>المجموع الفرعي:</span>
              <span>{formatCurrency(purchase.subtotal || 0)}</span>
            </div>
            {purchase.discount_amount > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span>الخصم:</span>
                <span>({formatCurrency(purchase.discount_amount)})</span>
              </div>
            )}
            {purchase.tax_amount > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span>الضريبة:</span>
                <span>{formatCurrency(purchase.tax_amount)}</span>
              </div>
            )}
            {purchase.expenses_egp > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span>المصاريف:</span>
                <span>{formatCurrency(purchase.expenses_egp)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 font-bold text-lg border-t-2">
              <span>الإجمالي:</span>
              <span className="text-primary">{formatCurrency(purchase.total_amount || 0)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>المدفوع:</span>
              <span>{formatCurrency(purchase.paid_amount || 0)}</span>
            </div>
            {purchase.remaining_amount > 0 && (
              <div className="flex justify-between py-2 text-red-600 font-bold">
                <span>المتبقي:</span>
                <span>{formatCurrency(purchase.remaining_amount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {purchase.notes && (
          <div className="mb-6">
            <p><strong>ملاحظات:</strong></p>
            <p className="text-sm">{purchase.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 pt-4 mt-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="mb-8">_______________</p>
              <p>المستلم</p>
            </div>
            <div>
              <p className="mb-8">_______________</p>
              <p>المحاسب</p>
            </div>
            <div>
              <p className="mb-8">_______________</p>
              <p>المدير</p>
            </div>
          </div>
        </div>

        {/* Print Date */}
        <div className="text-center text-xs text-gray-500 mt-4">
          <p>تاريخ الطباعة: {formatDate(new Date().toISOString())}</p>
        </div>
      </div>
    )
  }
)

PurchaseInvoicePrint.displayName = 'PurchaseInvoicePrint'

export default PurchaseInvoicePrint
