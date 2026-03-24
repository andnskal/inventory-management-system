import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = request.nextUrl

  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '30', 10)

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

  if (!profile || profile.role !== 'admin') {
    return Response.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  try {
    let query = supabase
      .from('audit_logs')
      .select('*, user:users(id, name, email)', { count: 'exact' })
      .order('changed_at', { ascending: false })

    if (dateFrom) {
      query = query.gte('changed_at', `${dateFrom}T00:00:00`)
    }
    if (dateTo) {
      query = query.lte('changed_at', `${dateTo}T23:59:59`)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: logs, error, count } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      logs: logs ?? [],
      total: count ?? 0,
      page,
      pageSize,
    })
  } catch (err) {
    console.error('Audit GET error:', err)
    return Response.json({ error: '사용 이력을 불러오는데 실패했습니다.' }, { status: 500 })
  }
}
