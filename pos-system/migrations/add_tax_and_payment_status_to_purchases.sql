-- Add has_tax and payment_status columns to purchases table
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS has_tax BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'credit';

-- Add comments to columns
COMMENT ON COLUMN purchases.has_tax IS 'هل الفاتورة تشمل ضريبة';
COMMENT ON COLUMN purchases.payment_status IS 'حالة الدفع: paid (مدفوع) أو credit (آجل)';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_purchases_has_tax ON purchases(has_tax);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);

-- Update existing records to set payment_status based on remaining_amount
UPDATE purchases 
SET payment_status = CASE 
  WHEN remaining_amount IS NULL OR remaining_amount = 0 THEN 'paid'
  ELSE 'credit'
END
WHERE payment_status IS NULL;
