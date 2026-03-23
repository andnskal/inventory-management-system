import { createClient } from '@/lib/supabase/server'
import { InventoryPageClient } from '@/components/inventory/inventory-page-client'
import type { InventoryTransaction, Product, Partner, StorageLocation } from '@/types'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const type = typeof params.type === 'string' ? params.type : ''
  const dateFrom = typeof params.date_from === 'string' ? params.date_from : ''
  const dateTo = typeof params.date_to === 'string' ? params.date_to : ''
  const productSearch = typeof params.product === 'string' ? params.product : ''
  const partnerId = typeof params.partner_id === 'string' ? params.partner_id : ''
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1
  const pageSize = 20

  const supabase = await createClient()

  // Fetch transactions with joins
  let query = supabase
    .from('inventory_transactions')
    .select(
      '*, product:products(id, name, product_code), option:product_options(id, option_name), location:storage_locations(id, name), partner:partners(id, name), creator:users(id, name)',
      { count: 'exact' }
    )
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (type && type !== 'all') {
    query = query.eq('type', type)
  }

  if (dateFrom) {
    query = query.gte('transaction_date', dateFrom)
  }

  if (dateTo) {
    query = query.lte('transaction_date', dateTo)
  }

  if (partnerId) {
    query = query.eq('partner_id', partnerId)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data: rawTransactions, count } = await query

  let transactions = (rawTransactions ?? []) as InventoryTransaction[]

  // Post-filter by product search
  if (productSearch) {
    const lower = productSearch.toLowerCase()
    transactions = transactions.filter((t) => {
      const p = t.product
      if (!p) return false
      return (
        p.name?.toLowerCase().includes(lower) ||
        p.product_code?.toLowerCase().includes(lower)
      )
    })
  }

  // Fetch supporting data for forms
  const { data: products } = await supabase
    .from('products')
    .select('id, name, product_code, options:product_options(id, option_name, is_active)')
    .eq('is_active', true)
    .order('name')

  const { data: partners } = await supabase
    .from('partners')
    .select('id, name, type')
    .eq('is_active', true)
    .order('name')

  const { data: locations } = await supabase
    .from('storage_locations')
    .select('id, name')
    .order('sort_order')

  return (
    <InventoryPageClient
      transactions={transactions}
      total={productSearch ? transactions.length : (count ?? 0)}
      page={page}
      pageSize={pageSize}
      products={(products ?? []) as (Product & { options: { id: string; option_name: string; is_active: boolean }[] })[]}
      partners={(partners ?? []) as (Partner & { type: string })[]}
      locations={(locations ?? []) as StorageLocation[]}
    />
  )
}
