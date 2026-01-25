// Simplified types for Supabase - auto-generated types are too large
// Using 'any' for flexibility with Supabase queries

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Table row types
export interface Branch {
  id: string
  code: string
  name: string
  name_ar: string
  branch_type?: string
  address?: string
  city?: string
  phone?: string
  email?: string
  status?: string
  is_main_warehouse?: boolean
  created_at?: string
}

export interface User {
  id: string
  username: string
  full_name: string
  full_name_ar?: string
  employee_code: string
  email?: string
  phone?: string
  role_id: string
  branch_id?: string
  status?: string
  last_login?: string
  created_at?: string
}

export interface Role {
  id: string
  code: string
  name: string
  name_ar: string
  permissions?: Json
  is_system_role?: boolean
}

export interface Product {
  id: string
  code: string
  name: string
  name_ar: string
  barcode?: string
  category_id?: string
  brand_id?: string
  unit_id: string
  purchase_price?: number
  selling_price?: number
  wholesale_price?: number
  min_stock_level?: number
  status?: string
  created_at?: string
}

export interface Category {
  id: string
  code: string
  name: string
  name_ar: string
  parent_id?: string
  is_active?: boolean
  sort_order?: number
}

export interface Brand {
  id: string
  code: string
  name: string
  name_ar?: string
  is_active?: boolean
}

export interface Unit {
  id: string
  code: string
  name: string
  name_ar: string
  is_active?: boolean
}

export interface Customer {
  id: string
  code: string
  name: string
  name_ar?: string
  phone: string
  email?: string
  address?: string
  customer_type?: string
  group_id?: string
  credit_limit?: number
  current_balance?: number
  status?: string
  created_at?: string
}

export interface CustomerGroup {
  id: string
  code: string
  name: string
  name_ar: string
  discount_percent?: number
  is_active?: boolean
}

export interface Supplier {
  id: string
  code: string
  name: string
  name_ar?: string
  phone: string
  email?: string
  address?: string
  credit_limit?: number
  current_balance?: number
  rating?: number
  status?: string
  created_at?: string
}

export interface Sale {
  id: string
  invoice_number: string
  invoice_date?: string
  branch_id: string
  cashier_id: string
  customer_id?: string
  customer_name?: string
  subtotal?: number
  discount_amount?: number
  tax_amount?: number
  has_tax?: boolean
  payment_status?: string
  total_amount?: number
  paid_amount?: number
  remaining_amount?: number
  payment_method?: string
  status?: string
  created_at?: string
}

export interface Purchase {
  id: string
  invoice_number: string
  invoice_date?: string
  supplier_invoice_number?: string
  branch_id: string
  supplier_id: string
  subtotal?: number
  discount_amount?: number
  tax_amount?: number
  expenses_usd?: number
  expenses_egp?: number
  has_tax?: boolean
  payment_status?: string
  total_amount?: number
  paid_amount?: number
  remaining_amount?: number
  status?: string
  created_at?: string
}

export interface PurchaseOrder {
  id: string
  order_number: string
  order_date?: string
  branch_id: string
  supplier_id: string
  total_amount?: number
  status?: string
  created_at?: string
}

export interface PurchaseRequest {
  id: string
  request_number: string
  request_date?: string
  branch_id: string
  total_items?: number
  estimated_cost?: number
  status?: string
  created_at?: string
}

export interface SalesReturn {
  id: string
  return_number: string
  return_date?: string
  sale_id: string
  branch_id: string
  customer_id?: string
  total_amount?: number
  refund_amount?: number
  return_reason?: string
  status?: string
  created_at?: string
}

export interface PurchaseReturn {
  id: string
  return_number: string
  return_date?: string
  purchase_id: string
  branch_id: string
  supplier_id: string
  total_amount?: number
  credit_amount?: number
  return_reason?: string
  status?: string
  created_at?: string
}

export interface StockTransfer {
  id: string
  transfer_number: string
  transfer_date?: string
  from_branch_id: string
  to_branch_id: string
  total_items?: number
  total_value?: number
  status?: string
  created_at?: string
}

export interface DamagedItem {
  id: string
  damage_number: string
  damage_date?: string
  product_id: string
  branch_id: string
  quantity: number
  damage_type?: string
  total_cost?: number
  status?: string
  created_at?: string
}

export interface WriteOff {
  id: string
  writeoff_number: string
  writeoff_date?: string
  branch_id: string
  writeoff_reason: string
  total_items?: number
  total_value?: number
  status?: string
  created_at?: string
}

export interface Inventory {
  id: string
  product_id: string
  branch_id: string
  quantity?: number
  reserved_quantity?: number
  min_quantity?: number
  avg_cost?: number
  last_count_date?: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  discount_amount?: number
  total_price: number
  created_at?: string
}

export interface PurchaseItem {
  id: string
  purchase_id: string
  product_id: string
  quantity: number
  unit_price: number
  discount_amount?: number
  total_price: number
  created_at?: string
}

export interface SystemSetting {
  id: string
  key: string
  value?: string
  description?: string
  value_type?: string
  is_public?: boolean
}

// Database type for Supabase client
export type Database = {
  public: {
    Tables: {
      branches: { Row: Branch; Insert: Partial<Branch>; Update: Partial<Branch> }
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> }
      roles: { Row: Role; Insert: Partial<Role>; Update: Partial<Role> }
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> }
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category> }
      brands: { Row: Brand; Insert: Partial<Brand>; Update: Partial<Brand> }
      units: { Row: Unit; Insert: Partial<Unit>; Update: Partial<Unit> }
      customers: { Row: Customer; Insert: Partial<Customer>; Update: Partial<Customer> }
      customer_groups: { Row: CustomerGroup; Insert: Partial<CustomerGroup>; Update: Partial<CustomerGroup> }
      suppliers: { Row: Supplier; Insert: Partial<Supplier>; Update: Partial<Supplier> }
      sales: { Row: Sale; Insert: Partial<Sale>; Update: Partial<Sale> }
      purchases: { Row: Purchase; Insert: Partial<Purchase>; Update: Partial<Purchase> }
      purchase_orders: { Row: PurchaseOrder; Insert: Partial<PurchaseOrder>; Update: Partial<PurchaseOrder> }
      purchase_requests: { Row: PurchaseRequest; Insert: Partial<PurchaseRequest>; Update: Partial<PurchaseRequest> }
      sales_returns: { Row: SalesReturn; Insert: Partial<SalesReturn>; Update: Partial<SalesReturn> }
      purchase_returns: { Row: PurchaseReturn; Insert: Partial<PurchaseReturn>; Update: Partial<PurchaseReturn> }
      stock_transfers: { Row: StockTransfer; Insert: Partial<StockTransfer>; Update: Partial<StockTransfer> }
      damaged_items: { Row: DamagedItem; Insert: Partial<DamagedItem>; Update: Partial<DamagedItem> }
      write_offs: { Row: WriteOff; Insert: Partial<WriteOff>; Update: Partial<WriteOff> }
      inventory: { Row: Inventory; Insert: Partial<Inventory>; Update: Partial<Inventory> }
      sale_items: { Row: SaleItem; Insert: Partial<SaleItem>; Update: Partial<SaleItem> }
      purchase_items: { Row: PurchaseItem; Insert: Partial<PurchaseItem>; Update: Partial<PurchaseItem> }
      system_settings: { Row: SystemSetting; Insert: Partial<SystemSetting>; Update: Partial<SystemSetting> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}