import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePagination, sanitizeSearchTerm } from '@/lib/api/validation'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PRODUCT_SELECT =
  '*, category:categories(*), options:product_options(*), stock:product_stock(*), custom_field_values(*)'

type ProductRow = {
  safety_stock: number | null
  stock: { normal_stock: number | null }[] | null
}

function isLowStock(p: ProductRow): boolean {
  const totalNormal = (p.stock ?? []).reduce(
    (sum, s) => sum + (s.normal_stock ?? 0),
    0
  )
  return totalNormal < (p.safety_stock ?? 0)
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = request.nextUrl

  const search = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('category_id') ?? ''
  const status = searchParams.get('status') ?? ''
  const { page, pageSize } = parsePagination(
    searchParams.get('page'),
    searchParams.get('pageSize')
  )

  try {
    let query = supabase
      .from('products')
      .select(PRODUCT_SELECT, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (search) {
      const safe = sanitizeSearchTerm(search)
      if (safe) {
        query = query.or(`name.ilike.%${safe}%,product_code.ilike.%${safe}%`)
      }
    }

    if (categoryId) {
      // category_id는 UUID만 허용(검증 실패 시 400 — 리뷰 #11)
      if (!UUID_RE.test(categoryId)) {
        return Response.json(
          { error: 'category_id 형식이 올바르지 않습니다.' },
          { status: 400 }
        )
      }
      query = query.eq('category_id', categoryId)
    }

    const hasStatusFilter = status === 'low' || status === 'normal'

    let products: ProductRow[] = []
    let total = 0
    let warning: string | null = null

    if (hasStatusFilter) {
      // 재고 상태(low/normal)는 집계 재고 vs 안전재고 비교라 PostgREST 컬럼 비교가
      // 불가능 → 전체를 받아 JS에서 필터한 뒤 페이지네이션한다(정확한 total — 리뷰 #21 동류).
      // 무음 절단 금지: 스캔 상한을 명시하고, 기준 결과가 상한을 넘으면 경고를 응답에 포함한다.
      // 확장성: 대량 카탈로그에선 product_stock_summary 기반 DB 뷰/RPC로 이관 권장(후속).
      const STATUS_SCAN_CAP = 10000
      const { data, error, count } = await query.range(0, STATUS_SCAN_CAP - 1)
      if (error) {
        return Response.json({ error: error.message }, { status: 500 })
      }
      const all = (data ?? []) as ProductRow[]
      if ((count ?? 0) > all.length) {
        warning = `상품 수가 많아(${count}건) 상태 필터 집계가 일부(${all.length}건)만 반영됐을 수 있습니다. 검색으로 범위를 좁혀주세요.`
      }
      const matched = all.filter((p) =>
        status === 'low' ? isLowStock(p) : !isLowStock(p)
      )
      total = matched.length
      const from = (page - 1) * pageSize
      products = matched.slice(from, from + pageSize)
    } else {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await query.range(from, to)
      if (error) {
        return Response.json({ error: error.message }, { status: 500 })
      }
      products = (data ?? []) as ProductRow[]
      total = count ?? 0
    }

    // Fetch supporting data
    const { data: customFields } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('target_table', 'products')
      .order('sort_order')

    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')

    const { data: locations } = await supabase
      .from('storage_locations')
      .select('*')
      .order('sort_order')

    return Response.json({
      products,
      total,
      page,
      pageSize,
      warning,
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

    // 입력 검증 (리뷰 #6)
    if (typeof product_code !== 'string' || !product_code.trim()) {
      return Response.json({ error: '상품코드는 필수입니다.' }, { status: 400 })
    }
    if (typeof name !== 'string' || !name.trim()) {
      return Response.json({ error: '상품명은 필수입니다.' }, { status: 400 })
    }
    if (category_id != null && !UUID_RE.test(String(category_id))) {
      return Response.json(
        { error: 'category_id 형식이 올바르지 않습니다.' },
        { status: 400 }
      )
    }
    const safetyStock = safety_stock ?? 0
    const purchasePrice = purchase_price ?? 0
    const sellingPrice = selling_price ?? 0
    const nonNegNumber = (n: unknown) =>
      typeof n === 'number' && Number.isFinite(n) && n >= 0
    if (
      !nonNegNumber(safetyStock) ||
      !nonNegNumber(purchasePrice) ||
      !nonNegNumber(sellingPrice)
    ) {
      return Response.json(
        { error: '안전재고·가격은 0 이상의 숫자여야 합니다.' },
        { status: 400 }
      )
    }

    // Insert product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        product_code: product_code.trim(),
        name: name.trim(),
        category_id: category_id || null,
        unit: unit || '개',
        safety_stock: safetyStock,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
      })
      .select()
      .single()

    if (productError) {
      return Response.json({ error: productError.message }, { status: 500 })
    }

    // 옵션·추가필드 부분 저장 실패는 경고로 응답에 포함(무음 실패 금지 — 리뷰 보강)
    const warnings: string[] = []

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
        warnings.push(`옵션 일부 저장 실패: ${optError.message}`)
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
          warnings.push(`추가 필드 일부 저장 실패: ${cfvError.message}`)
        }
      }
    }

    return Response.json({ product, warnings }, { status: 201 })
  } catch (err) {
    console.error('Products POST error:', err)
    return Response.json({ error: '상품 등록에 실패했습니다.' }, { status: 500 })
  }
}
