-- Add transport_fee and tax_rate columns to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS transport_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 2) DEFAULT 14;

-- Update existing records to have default tax_rate of 14%
UPDATE sales SET tax_rate = 14 WHERE tax_rate IS NULL OR tax_rate = 0;
