-- Add has_tax and payment_status columns to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS has_tax BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'credit';

-- Add comments to columns
COMMENT ON COLUMN sales.has_tax IS 'هل الفاتورة تشمل ضريبة';
COMMENT ON COLUMN sales.payment_status IS 'حالة الدفع: paid (مدفوع) أو credit (آجل)';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_sales_has_tax ON sales(has_tax);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);

-- Update existing records to set payment_status based on remaining_amount
UPDATE sales 
SET payment_status = CASE 
  WHEN remaining_amount IS NULL OR remaining_amount = 0 THEN 'paid'
  ELSE 'credit'
END
WHERE payment_status IS NULL;
