import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .order('key')

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ settings: settings ?? [] })
  } catch (err) {
    console.error('Settings GET error:', err)
    return Response.json({ error: '설정을 불러오는데 실패했습니다.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

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

  if (!profile || profile.role !== 'admin') {
    return Response.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { key, value } = body

    // Upsert setting
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', key)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('settings')
        .update({
          value,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('key', key)

      if (error) {
        return Response.json({ error: error.message }, { status: 500 })
      }
    } else {
      const { error } = await supabase
        .from('settings')
        .insert({
          key,
          value,
          updated_by: user.id,
        })

      if (error) {
        return Response.json({ error: error.message }, { status: 500 })
      }
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Settings PUT error:', err)
    return Response.json({ error: '설정 저장에 실패했습니다.' }, { status: 500 })
  }
}
