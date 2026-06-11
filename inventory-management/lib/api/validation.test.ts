import { describe, it, expect } from 'vitest'
import {
  sanitizeSearchTerm,
  isValidDateString,
  parsePagination,
} from './validation'

describe('sanitizeSearchTerm', () => {
  it('PostgREST 구조 문자를 제거한다(필터 인젝션 방지)', () => {
    // 구조 문자(% ,)를 제거하면 토큰이 이어 붙어 단일 ilike 값이 된다 → or 조건 주입 불가
    expect(sanitizeSearchTerm('name.ilike.%a%,is_active.eq.false')).toBe(
      'name.ilike.ais_active.eq.false'
    )
    expect(sanitizeSearchTerm('foo(bar)*')).toBe('foobar')
    expect(sanitizeSearchTerm('a,b,c')).toBe('abc')
  })

  it('일반 한글/영문 검색어는 보존한다', () => {
    expect(sanitizeSearchTerm('  볼펜 ')).toBe('볼펜')
    expect(sanitizeSearchTerm('SKU-1234')).toBe('SKU-1234')
  })

  it('구조 문자만 있으면 빈 문자열', () => {
    expect(sanitizeSearchTerm('%,()*')).toBe('')
  })
})

describe('isValidDateString', () => {
  it('유효한 YYYY-MM-DD를 통과시킨다', () => {
    expect(isValidDateString('2026-06-11')).toBe(true)
    expect(isValidDateString('2000-01-01')).toBe(true)
  })

  it('형식 위반·무효 날짜를 거부한다', () => {
    expect(isValidDateString('2026-13-01')).toBe(false)
    expect(isValidDateString('2026-6-1')).toBe(false)
    expect(isValidDateString('not-a-date')).toBe(false)
    expect(isValidDateString("2026-06-11'; DROP")).toBe(false)
    expect(isValidDateString('')).toBe(false)
  })
})

describe('parsePagination', () => {
  it('정상 값을 파싱한다', () => {
    expect(parsePagination('2', '50')).toEqual({ page: 2, pageSize: 50 })
  })

  it('NaN·0·음수·빈값을 안전 기본으로 보정한다', () => {
    expect(parsePagination(null, null)).toEqual({ page: 1, pageSize: 20 })
    expect(parsePagination('abc', 'xyz')).toEqual({ page: 1, pageSize: 20 })
    expect(parsePagination('0', '0')).toEqual({ page: 1, pageSize: 20 })
    expect(parsePagination('-5', '-9')).toEqual({ page: 1, pageSize: 1 })
  })

  it('pageSize 상한을 적용한다', () => {
    expect(parsePagination('1', '9999').pageSize).toBe(100)
    expect(parsePagination('1', '9999', { maxPageSize: 200 }).pageSize).toBe(200)
  })

  it('기본 pageSize를 옵션으로 바꿀 수 있다', () => {
    expect(parsePagination(null, null, { defaultPageSize: 30 }).pageSize).toBe(30)
  })
})
