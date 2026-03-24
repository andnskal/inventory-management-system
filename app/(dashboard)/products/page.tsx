import { createClient } from '@/lib/supabase/server'
import { ProductsPageClient } from '@/components/products/products-page-client'
import type { Product, Category, CustomField } from '@/types'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const search = typeof params.search === 'string' ? params.search : ''
  const categoryId =
    typeof params.category_id === 'string' ? params.category_id : ''
  const status = typeof params.status === 'string' ? params.status : ''
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1
  const pageSize = 20

  const supabase = await createClient()

  // Fetch products with joins
  let query = supabase
    .from('products')
    .select(
      '*, category:categories(*), options:product_options(*), stock:product_stock(*), custom_field_values(*)',
      { count: 'exact' }
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`name.ilike.%${search}%,product_code.ilike.%${search}%`)
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data: rawProducts, count } = await query

  let products: Product[] = (rawProducts ?? []) as Product[]

  // Post-filter by stock status
  if (status === 'low') {
    products = products.filter((p) => {
      const totalNormal = (p.stock ?? []).reduce(
        (sum, s) => sum + (s.normal_stock ?? 0),
        0
      )
      return totalNormal < (p.safety_stock ?? 0)
    })
  } else if (status === 'normal') {
    products = products.filter((p) => {
      const totalNormal = (p.stock ?? []).reduce(
        (sum, s) => sum + (s.normal_stock ?? 0),
        0
      )
      return totalNormal >= (p.safety_stock ?? 0)
    })
  }

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')

  // Fetch custom fields for products
  const { data: customFields } = await supabase
    .from('custom_fields')
    .select('*')
    .eq('target_table', 'products')
    .order('sort_order')

  return (
    <ProductsPageClient
      products={products}
      total={count ?? 0}
      page={page}
      pageSize={pageSize}
      categories={(categories ?? []) as Category[]}
      customFields={(customFields ?? []) as CustomField[]}
    />
  )
}
