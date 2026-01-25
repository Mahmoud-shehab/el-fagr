import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = 'https://recvvlrcvowbzqpjyihk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlY3Z2bHJjdm93YnpxcGp5aWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDk3OTIsImV4cCI6MjA4MTk4NTc5Mn0.J-rYLEA1thxGfpLeNS6IAk_ahoRgIwx3RW9Soe5ZqBc'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
