import { formatCurrency, formatDate } from '@/lib/utils'

interface InvoiceItem {
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface InvoiceData {
  invoice_number: string
  invoice_date: string
  customer_name?: string
  customer_phone?: string
  customer_previous_balance?: number
  items: InvoiceItem[]
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  remaining_amount: number
  payment_method: string
  cashier_name: string
  branch_name: string
}

export function printInvoice(data: InvoiceData) {
  const printWindow = window.open('', '_blank', 'width=400,height=600')
  if (!printWindow) return

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة ${data.invoice_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
          font-size: 12px; 
          padding: 10px;
          max-width: 80mm;
          margin: 0 auto;
        }
        .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
        .header h1 { font-size: 18px; margin-bottom: 5px; }
        .header p { font-size: 10px; color: #666; }
        .info { margin-bottom: 10px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .items { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .items th, .items td { padding: 5px 3px; text-align: right; border-bottom: 1px solid #ddd; }
        .items th { background: #f5f5f5; font-size: 11px; }
        .totals { border-top: 1px dashed #000; padding-top: 10px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .total-row.grand { font-size: 16px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
        .footer { text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; font-size: 10px; }
        @media print {
          body { padding: 0; }
          @page { margin: 5mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>إذن استلام</h1>
      </div>
      
      <div class="info">
        <div class="info-row"><span>رقم الفاتورة:</span><span>${data.invoice_number}</span></div>
        <div class="info-row"><span>التاريخ:</span><span>${formatDate(data.invoice_date)}</span></div>
        ${data.customer_name ? `<div class="info-row"><span>العميل:</span><span>${data.customer_name}</span></div>` : ''}
        ${data.customer_phone ? `<div class="info-row"><span>الهاتف:</span><span>${data.customer_phone}</span></div>` : ''}
        <div class="info-row"><span>الكاشير:</span><span>${data.cashier_name}</span></div>
      </div>

      <table class="items">
        <thead>
          <tr>
            <th>الصنف</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>${item.product_name}</td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.unit_price)}</td>
              <td>${formatCurrency(item.total_price)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        ${data.customer_previous_balance && data.customer_previous_balance > 0 ? `
          <div class="total-row" style="color: #d97706; font-weight: bold; border-bottom: 1px dashed #ccc; padding-bottom: 5px; margin-bottom: 5px;">
            <span>الرصيد السابق:</span>
            <span>${formatCurrency(data.customer_previous_balance)}</span>
          </div>
        ` : ''}
        <div class="total-row"><span>المجموع الفرعي:</span><span>${formatCurrency(data.subtotal)}</span></div>
        ${data.discount_amount > 0 ? `<div class="total-row"><span>الخصم:</span><span>-${formatCurrency(data.discount_amount)}</span></div>` : ''}
        ${data.tax_amount > 0 ? `<div class="total-row"><span>الضريبة:</span><span>${formatCurrency(data.tax_amount)}</span></div>` : ''}
        <div class="total-row grand"><span>الإجمالي:</span><span>${formatCurrency(data.total_amount)}</span></div>
        <div class="total-row"><span>المدفوع:</span><span>${formatCurrency(data.paid_amount)}</span></div>
        ${data.remaining_amount > 0 ? `<div class="total-row"><span>المتبقي:</span><span>${formatCurrency(data.remaining_amount)}</span></div>` : ''}
        ${data.customer_previous_balance && data.customer_previous_balance > 0 ? `
          <div class="total-row" style="color: #dc2626; font-weight: bold; font-size: 14px; border-top: 2px solid #000; padding-top: 5px; margin-top: 5px;">
            <span>إجمالي المديونية:</span>
            <span>${formatCurrency(data.customer_previous_balance + (data.remaining_amount || 0))}</span>
          </div>
        ` : ''}
        <div class="total-row"><span>طريقة الدفع:</span><span>${data.payment_method === 'cash' ? 'نقدي' : 'آجل'}</span></div>
      </div>

      <div class="footer">
        <p>شكراً لتعاملكم معنا</p>
        <p>البضاعة المباعة لا ترد ولا تستبدل</p>
      </div>

      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}