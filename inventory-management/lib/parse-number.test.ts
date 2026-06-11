import { describe, it, expect } from 'vitest'
import { parseStockNumber } from './parse-number'

// 회귀 테스트: 2026-06-11 리뷰 확정 #17.
// 기존 `Number(value) || 0` 은 "1,000"·"₩1,000" 같은 서식 숫자를 0으로 둔갑시켜
// 재고를 0으로 덮어쓰는 데이터 손상 버그였다. 아래가 그 재발을 막는다.
describe('parseStockNumber', () => {
  it('천 단위 콤마가 포함된 숫자를 보존한다 ("1,000" → 1000, 기존엔 0으로 손상됨)', () => {
    expect(parseStockNumber('1,000')).toBe(1000)
    expect(parseStockNumber('1,234,567')).toBe(1234567)
  })

  it('통화기호·공백을 제거하고 파싱한다', () => {
    expect(parseStockNumber('₩1,000')).toBe(1000)
    expect(parseStockNumber('1 000')).toBe(1000)
    expect(parseStockNumber(' 42 ')).toBe(42)
  })

  it('이미 숫자면 그대로 반환한다', () => {
    expect(parseStockNumber(1500)).toBe(1500)
    expect(parseStockNumber(12.5)).toBe(12.5)
  })

  it('빈 값/공백/null/undefined는 0으로 처리한다', () => {
    expect(parseStockNumber('')).toBe(0)
    expect(parseStockNumber('   ')).toBe(0)
    expect(parseStockNumber(null)).toBe(0)
    expect(parseStockNumber(undefined)).toBe(0)
  })

  it('일반 정수/소수 문자열을 파싱한다', () => {
    expect(parseStockNumber('50')).toBe(50)
    expect(parseStockNumber('12.5')).toBe(12.5)
  })

  it('비유한값(Infinity/NaN 숫자)은 0으로 폴백한다', () => {
    expect(parseStockNumber(Infinity)).toBe(0)
    expect(parseStockNumber(NaN)).toBe(0)
    expect(parseStockNumber('abc')).toBe(0)
  })
})
