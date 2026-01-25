-- Add expenses columns to purchases table
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS expenses_usd DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS expenses_egp DECIMAL(10, 2);

-- Add USD exchange rate to system_settings if not exists
INSERT INTO system_settings (key, value, description, value_type, is_public)
VALUES ('usd_exchange_rate', '50.00', 'سعر صرف الدولار مقابل الجنيه المصري', 'number', true)
ON CONFLICT (key) DO NOTHING;

-- Add comment to columns
COMMENT ON COLUMN purchases.expenses_usd IS 'إجمالي المصاريف بالدولار الأمريكي';
COMMENT ON COLUMN purchases.expenses_egp IS 'إجمالي المصاريف بالجنيه المصري (محسوبة تلقائياً)';
