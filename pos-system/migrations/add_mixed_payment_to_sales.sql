-- Add mixed payment support to sales table
-- This allows tracking split payments (cash + card)

-- Add cash_amount and card_amount columns
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS cash_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS card_amount DECIMAL(10, 2);

-- Add 'mixed' to payment_method enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        WHERE t.typname = 'payment_method_enum' 
        AND e.enumlabel = 'mixed'
    ) THEN
        ALTER TYPE payment_method_enum ADD VALUE 'mixed';
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN sales.cash_amount IS 'Cash amount for mixed payment (cash + card)';
COMMENT ON COLUMN sales.card_amount IS 'Card amount for mixed payment (cash + card)';
