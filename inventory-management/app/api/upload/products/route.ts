import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 한 요청당 행 상한 (대량요청 DoS / N+1 증폭 방지 — 리뷰 #4)
const MAX_ROWS = 5000

// 재고 수량 검증: 유한·정수·음수 아님 (product_stock CHECK 불변식 보호 — 리뷰 #17 후속)
function isValidStock(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0
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
    const { rows } = body as {
      rows: {
        product_code: string
        name: string
        option_name: string
        normal_stock: number
        pending_shortage_stock: number
      }[]
    }

    if (!rows || rows.length === 0) {
      return Response.json({ error: '업로드할 데이터가 없습니다.' }, { status: 400 })
    }

    if (rows.length > MAX_ROWS) {
      return Response.json(
        {
          error: `한 번에 업로드 가능한 행은 최대 ${MAX_ROWS}건입니다 (요청: ${rows.length}건).`,
        },
        { status: 400 }
      )
    }

    let created = 0
    let updated = 0
    const errors: string[] = []

    // NOTE: 행 단위 다중 쓰기가 단일 트랜잭션으로 묶이지 않아(원자성 미보장),
    // 중간 실패 시 일부만 반영될 수 있다(아래에서 errors로 보고). 완전한 원자성은
    // DB 함수(RPC)로의 이관이 필요하다 — 후속 트랙(bundle B).
    for (const row of rows) {
      if (!row.product_code || !row.name) {
        errors.push(`상품코드 또는 상품명이 비어있습니다: ${JSON.stringify(row)}`)
        continue
      }

      // 재고 수량 검증 (음수·비정수·비유한 차단)
      if (
        !isValidStock(row.normal_stock) ||
        !isValidStock(row.pending_shortage_stock)
      ) {
        errors.push(
          `재고 수량이 올바르지 않습니다 (${row.product_code}): normal=${row.normal_stock}, pending=${row.pending_shortage_stock}`
        )
        continue
      }

      // Check if product exists
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('product_code', row.product_code)
        .eq('is_active', true)
        .single()

      let productId: string

      if (existing) {
        productId = existing.id
        // Update product name if needed
        const { error: updateErr } = await supabase
          .from('products')
          .update({ name: row.name, updated_at: new Date().toISOString() })
          .eq('id', productId)
        if (updateErr) {
          errors.push(`상품 수정 실패 (${row.product_code}): ${updateErr.message}`)
          continue
        }
        updated++
      } else {
        // Create new product
        const { data: newProduct, error: insertErr } = await supabase
          .from('products')
          .insert({
            product_code: row.product_code,
            name: row.name,
            unit: '개',
            safety_stock: 0,
            purchase_price: 0,
            selling_price: 0,
          })
          .select('id')
          .single()

        if (insertErr || !newProduct) {
          errors.push(`상품 생성 실패 (${row.product_code}): ${insertErr?.message}`)
          continue
        }
        productId = newProduct.id
        created++
      }

      // Handle option
      if (row.option_name) {
        // Check if option exists
        const { data: existingOpt } = await supabase
          .from('product_options')
          .select('id')
          .eq('product_id', productId)
          .eq('option_name', row.option_name)
          .eq('is_active', true)
          .single()

        if (!existingOpt) {
          const { error: optErr } = await supabase
            .from('product_options')
            .insert({
              product_id: productId,
              option_name: row.option_name,
            })
          if (optErr) {
            errors.push(
              `옵션 생성 실패 (${row.product_code}/${row.option_name}): ${optErr.message}`
            )
          }
        }
      }

      // Update stock if location exists (use first location)
      const { data: firstLocation } = await supabase
        .from('storage_locations')
        .select('id')
        .order('sort_order')
        .limit(1)
        .single()

      if (firstLocation) {
        // Get option_id if applicable
        let optionId: string | null = null
        if (row.option_name) {
          const { data: opt } = await supabase
            .from('product_options')
            .select('id')
            .eq('product_id', productId)
            .eq('option_name', row.option_name)
            .eq('is_active', true)
            .single()
          optionId = opt?.id ?? null
        }

        // Upsert stock
        const { data: existingStock } = await supabase
          .from('product_stock')
          .select('id')
          .eq('product_id', productId)
          .eq('location_id', firstLocation.id)
          .is('option_id', optionId)
          .single()

        if (existingStock) {
          const { error: stockErr } = await supabase
            .from('product_stock')
            .update({
              normal_stock: row.normal_stock,
              pending_shortage_stock: row.pending_shortage_stock,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingStock.id)
          if (stockErr) {
            errors.push(`재고 반영 실패 (${row.product_code}): ${stockErr.message}`)
          }
        } else {
          const { error: stockErr } = await supabase
            .from('product_stock')
            .insert({
              product_id: productId,
              option_id: optionId,
              location_id: firstLocation.id,
              normal_stock: row.normal_stock,
              pending_shortage_stock: row.pending_shortage_stock,
            })
          if (stockErr) {
            errors.push(`재고 반영 실패 (${row.product_code}): ${stockErr.message}`)
          }
        }
      }
    }

    return Response.json({
      success: errors.length === 0,
      created,
      updated,
      errors,
      total: rows.length,
    })
  } catch (err) {
    console.error('Upload products error:', err)
    return Response.json({ error: '상품 업로드에 실패했습니다.' }, { status: 500 })
  }
}
