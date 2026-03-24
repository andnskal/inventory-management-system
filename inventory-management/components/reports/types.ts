export type ReportSection =
  | 'stock_summary'
  | 'transactions'
  | 'finance'
  | 'partners'
  | 'low_stock'

export interface StockSummaryData {
  totalProducts: number
  lowStockCount: number
  totalStockQuantity: number
}

export interface TransactionItem {
  type: 'in' | 'out'
  quantity: number
  total_price: number
  transaction_date: string
  product_name: string
  product_code: string
  partner_name: string
}

export interface TransactionsData {
  totalIn: number
  totalOut: number
  totalInAmount: number
  totalOutAmount: number
  count: number
  items: TransactionItem[]
}

export interface FinanceItem {
  transaction_date: string
  purchase_total: number
  sales_total: number
  margin: number
}

export interface FinanceData {
  totalPurchase: number
  totalSales: number
  margin: number
  items: FinanceItem[]
}

export interface PartnersData {
  total: number
  supplierCount: number
  customerCount: number
  bothCount: number
}

export interface LowStockItem {
  product_id: string
  product_code: string
  name: string
  safety_stock: number
  current_stock: number
  shortage: number
}

export interface LowStockData {
  count: number
  items: LowStockItem[]
}

export interface ReportData {
  stockSummary?: StockSummaryData
  transactions?: TransactionsData
  finance?: FinanceData
  partners?: PartnersData
  lowStock?: LowStockData
}
