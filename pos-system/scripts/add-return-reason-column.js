// Script to add return_reason column to database
import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from environment or config
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addReturnReasonColumn() {
  console.log('Adding return_reason column to sales_returns...')
  
  const { error: error1 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS return_reason TEXT'
  })
  
  if (error1) {
    console.error('Error adding column to sales_returns:', error1)
  } else {
    console.log('✓ Added return_reason to sales_returns')
  }

  console.log('Adding return_reason column to purchase_returns...')
  
  const { error: error2 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS return_reason TEXT'
  })
  
  if (error2) {
    console.error('Error adding column to purchase_returns:', error2)
  } else {
    console.log('✓ Added return_reason to purchase_returns')
  }

  console.log('\nDone! You can now use return_reason in your returns.')
}

addReturnReasonColumn()
