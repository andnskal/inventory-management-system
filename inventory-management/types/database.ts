export type UserRole = 'admin' | 'manager' | 'staff'
export type PartnerType = 'supplier' | 'customer' | 'both'
export type TransactionType = 'in' | 'out'
export type StockType = 'normal' | 'pending_shortage'
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'
export type CustomFieldType = 'text' | 'number' | 'date' | 'select'
export type CustomFieldTarget = 'products' | 'partners'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  parent_id: string | null
  depth: number
  sort_order: number
  children?: Category[]
}

export interface Product {
  id: string
  product_code: string
  name: string
  category_id: string | null
  unit: string
  safety_stock: number
  purchase_price: number
  selling_price: number
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  category?: Category
  options?: ProductOption[]
  stock?: ProductStock[]
  custom_field_values?: CustomFieldValue[]
}

export interface ProductOption {
  id: string
  product_id: string
  option_name: string
  sku: string | null
  safety_stock: number | null
  is_active: boolean
}

export interface StorageLocation {
  id: string
  name: string
  description: string | null
  sort_order: number
}

export interface ProductStock {
  id: string
  product_id: string
  option_id: string | null
  location_id: string
  normal_stock: number
  pending_shortage_stock: number
  updated_at: string
  // joined
  location?: StorageLocation
  option?: ProductOption
}

export interface Partner {
  id: string
  name: string
  type: PartnerType
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface InventoryTransaction {
  id: string
  transaction_date: string
  type: TransactionType
  product_id: string
  option_id: string | null
  location_id: string
  partner_id: string
  quantity: number
  unit_price: number
  total_price: number
  stock_type: StockType
  notes: string | null
  created_by: string
  created_at: string
  // joined
  product?: Product
  option?: ProductOption
  location?: StorageLocation
  partner?: Partner
  creator?: User
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: AuditAction
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  changed_by: string | null
  changed_at: string
  // joined
  user?: User
}

export interface Setting {
  id: string
  key: string
  value: unknown
  description: string | null
  updated_by: string | null
  updated_at: string
}

export interface CustomField {
  id: string
  target_table: CustomFieldTarget
  field_name: string
  field_type: CustomFieldType
  select_options: string[] | null
  is_required: boolean
  sort_order: number
  created_by: string | null
  created_at: string
}

export interface CustomFieldValue {
  id: string
  field_id: string
  record_id: string
  value: string | null
  // joined
  field?: CustomField
}

// 뷰 타입
export interface DailyFinanceSummary {
  transaction_date: string
  purchase_total: number
  sales_total: number
  margin: number
}

export interface ProductStockSummary {
  product_id: string
  product_code: string
  name: string
  safety_stock: number
  total_normal_stock: number
  total_pending_shortage_stock: number
}
