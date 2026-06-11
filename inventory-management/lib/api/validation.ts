// API 라우트 공통 입력 검증/정제 헬퍼.
// 검색어 인젝션 방지·날짜 검증·페이지네이션 클램프를 한 곳에서 관리해 라우트 간 드리프트를 막는다.

/**
 * PostgREST `.or()` 필터에 사용자 검색어를 넣기 전 구조 문자를 제거한다.
 * `,` `(` `)` `*` `\` `:` `%` 는 PostgREST/LIKE 구조 문자라, 그대로 보간하면
 * 필터 논리를 변조하는 인젝션 표면이 된다(2026-06-11 리뷰 #3).
 */
export function sanitizeSearchTerm(input: string): string {
  return input.replace(/[%,()*\\:]/g, '').trim()
}

/** YYYY-MM-DD 형식이며 실제 유효한 날짜인지 검증한다(리뷰 #9/#23). */
export function isValidDateString(input: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false
  const d = new Date(`${input}T00:00:00Z`)
  return !Number.isNaN(d.getTime())
}

/**
 * page/pageSize 쿼리 파라미터를 파싱하고 안전 범위로 클램프한다(NaN·0·음수·상한 — 리뷰 #10).
 */
export function parsePagination(
  pageRaw: string | null,
  pageSizeRaw: string | null,
  opts: { defaultPageSize?: number; maxPageSize?: number } = {}
): { page: number; pageSize: number } {
  const defaultPageSize = opts.defaultPageSize ?? 20
  const maxPageSize = opts.maxPageSize ?? 100
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1)
  const pageSize = Math.min(
    maxPageSize,
    Math.max(
      1,
      parseInt(pageSizeRaw ?? String(defaultPageSize), 10) || defaultPageSize
    )
  )
  return { page, pageSize }
}
