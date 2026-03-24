import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Update product
    const { data: product, error: productError } = await supabase
      .from('products')
      .update({
        product_code,
        name,
        category_id: category_id || null,
        unit: unit || '개',
        safety_stock: safety_stock ?? 0,
        purchase_price: purchase_price ?? 0,
        selling_price: selling_price ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (productError) {
      return Response.json({ error: productError.message }, { status: 500 })
    }

    // Update options: delete old, insert new
    if (options !== undefined) {
      // Soft delete existing options
      await supabase
        .from('product_options')
        .update({ is_active: false })
        .eq('product_id', id)

      if (options.length > 0) {
        const optionRows = options.map(
          (opt: { option_name: string; sku: string }) => ({
            product_id: id,
            option_name: opt.option_name,
            sku: opt.sku || null,
            is_active: true,
          })
        )
        const { error: optError } = await supabase
          .from('product_options')
          .insert(optionRows)

        if (optError) {
          console.error('Option update error:', optError)
        }
      }
    }

    // Update custom field values: delete old, insert new
    if (custom_field_values !== undefined) {
      await supabase
        .from('custom_field_values')
        .delete()
        .eq('record_id', id)

      const cfvRows = custom_field_values
        .filter((cfv: { field_id: string; value: string }) => cfv.value)
        .map((cfv: { field_id: string; value: string }) => ({
          field_id: cfv.field_id,
          record_id: id,
          value: cfv.value,
        }))
      if (cfvRows.length > 0) {
        const { error: cfvError } = await supabase
          .from('custom_field_values')
          .insert(cfvRows)

        if (cfvError) {
          console.error('Custom field value update error:', cfvError)
        }
      }
    }

    return Response.json({ product })
  } catch (err) {
    console.error('Products PUT error:', err)
    return Response.json({ error: '상품 수정에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    // Soft delete
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Products DELETE error:', err)
    return Response.json({ error: '상품 삭제에 실패했습니다.' }, { status: 500 })
  }
}
