import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// API 라우트의 인증 + 역할 인가를 한 곳에서 처리(17개 라우트 boilerplate 단일화 — bundle A).
// 통과 시 AuthContext, 실패 시 NextResponse(401/403/500)를 반환한다.
// 사용:
//   const auth = await requireRole(supabase, ['admin', 'manager'])
//   if (isAuthError(auth)) return auth
//   // auth.userId, auth.role 사용
export type AuthContext = { userId: string; role: string }

export async function requireRole(
  supabase: SupabaseClient,
  roles?: string[]
): Promise<AuthContext | NextResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: '사용자 정보 조회에 실패했습니다.' },
      { status: 500 }
    )
  }

  if (!profile) {
    return NextResponse.json(
      { error: '사용자 정보를 찾을 수 없습니다.' },
      { status: 403 }
    )
  }

  if (roles && roles.length > 0 && !roles.includes(profile.role)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  return { userId: user.id, role: profile.role }
}

// 타입 가드: requireRole 결과가 에러 응답인지 판별
export function isAuthError(
  result: AuthContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}
