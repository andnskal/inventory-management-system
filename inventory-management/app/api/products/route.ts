import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = request.nextUrl

  const search = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('category_id') ?? ''
  const status = searchParams.get('status') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10)

  try {
    // Build query for products
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

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: products, error, count } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Fetch custom fields for product target
    const { data: customFields } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('target_table', 'products')
      .order('sort_order')

    // Fetch categories for filter
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')

    // Fetch storage locations
    const { data: locations } = await supabase
      .from('storage_locations')
      .select('*')
      .order('sort_order')

    // Post-filter by status (low stock)
    let filteredProducts = products ?? []
    if (status === 'low') {
      filteredProducts = filteredProducts.filter((p) => {
        const totalNormal = (p.stock ?? []).reduce(
          (sum: number, s: { normal_stock: number }) => sum + (s.normal_stock ?? 0),
          0
        )
        return totalNormal < (p.safety_stock ?? 0)
      })
    } else if (status === 'normal') {
      filteredProducts = filteredProducts.filter((p) => {
        const totalNormal = (p.stock ?? []).reduce(
          (sum: number, s: { normal_stock: number }) => sum + (s.normal_stock ?? 0),
          0
        )
        return totalNormal >= (p.safety_stock ?? 0)
      })
    }

    return Response.json({
      products: filteredProducts,
      total: count ?? 0,
      page,
      pageSize,
      customFields: customFields ?? [],
      categories: categories ?? [],
      locations: locations ?? [],
    })
  } catch (err) {
    console.error('Products GET error:', err)
    return Response.json({ error: '상품 목록을 불러오는데 실패했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // Check role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return Response.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      product_code,
      name,
      category_id,
      unit,
      safety_stock,
      purchase_price,
      selling_price,
      options,
      custom_field_values,
    } = body

    // Insert product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        product_code,
        name,
        category_id: category_id || null,
        unit: unit || '개',
        safety_stock: safety_stock ?? 0,
        purchase_price: purchase_price ?? 0,
        selling_price: selling_price ?? 0,
      })
      .select()
      .single()

    if (productError) {
      return Response.json({ error: productError.message }, { status: 500 })
    }

    // Insert options
    if (options && options.length > 0) {
      const optionRows = options.map(
        (opt: { option_name: string; sku: string }) => ({
          product_id: product.id,
          option_name: opt.option_name,
          sku: opt.sku || null,
        })
      )
      const { error: optError } = await supabase
        .from('product_options')
        .insert(optionRows)

      if (optError) {
        console.error('Option insert error:', optError)
      }
    }

    // Insert custom field values
    if (custom_field_values && custom_field_values.length > 0) {
      const cfvRows = custom_field_values
        .filter((cfv: { field_id: string; value: string }) => cfv.value)
        .map((cfv: { field_id: string; value: string }) => ({
          field_id: cfv.field_id,
          record_id: product.id,
          value: cfv.value,
        }))
      if (cfvRows.length > 0) {
        const { error: cfvError } = await supabase
          .from('custom_field_values')
          .insert(cfvRows)

        if (cfvError) {
          console.error('Custom field value insert error:', cfvError)
        }
      }
    }

    return Response.json({ product }, { status: 201 })
  } catch (err) {
    console.error('Products POST error:', err)
    return Response.json({ error: '상품 등록에 실패했습니다.' }, { status: 500 })
  }
}
