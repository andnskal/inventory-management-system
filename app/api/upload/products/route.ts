import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    let created = 0
    let updated = 0
    const errors: string[] = []

    for (const row of rows) {
      if (!row.product_code || !row.name) {
        errors.push(`상품코드 또는 상품명이 비어있습니다: ${JSON.stringify(row)}`)
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
        await supabase
          .from('products')
          .update({ name: row.name, updated_at: new Date().toISOString() })
          .eq('id', productId)
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
          await supabase.from('product_options').insert({
            product_id: productId,
            option_name: row.option_name,
          })
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
          await supabase
            .from('product_stock')
            .update({
              normal_stock: row.normal_stock,
              pending_shortage_stock: row.pending_shortage_stock,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingStock.id)
        } else {
          await supabase.from('product_stock').insert({
            product_id: productId,
            option_id: optionId,
            location_id: firstLocation.id,
            normal_stock: row.normal_stock,
            pending_shortage_stock: row.pending_shortage_stock,
          })
        }
      }
    }

    return Response.json({
      success: true,
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
