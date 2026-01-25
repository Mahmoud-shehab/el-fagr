-- Add return_reason column to sales_returns table
ALTER TABLE sales_returns 
ADD COLUMN IF NOT EXISTS return_reason TEXT;

-- Add return_reason column to purchase_returns table
ALTER TABLE purchase_returns 
ADD COLUMN IF NOT EXISTS return_reason TEXT;

-- Add comment to columns
COMMENT ON COLUMN sales_returns.return_reason IS 'سبب إرجاع المبيعات';
COMMENT ON COLUMN purchase_returns.return_reason IS 'سبب إرجاع المشتريات';
