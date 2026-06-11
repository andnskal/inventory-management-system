/**
 * 엑셀 셀 값을 재고 수량 숫자로 안전하게 파싱한다.
 *
 * 기존 `Number(value) || 0` 패턴은 "1,000"·"₩1,000"·"1 000" 같은 서식 숫자를
 * NaN → 0 으로 둔갑시켜 재고를 0으로 덮어쓰는 데이터 손상 버그였다(2026-06-11 리뷰 #17).
 * 콤마·통화기호·공백 등 숫자가 아닌 문자를 제거한 뒤 파싱한다.
 *
 * 빈 값/공백/null/undefined 및 파싱 불가 값은 0으로 폴백한다(빈 셀 = 재고 0).
 * 음수 차단·"명백한 오타 셀 거부" 같은 정책은 호출부(API 검증)에서 별도로 적용한다.
 */
export function parseStockNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (value == null) return 0

  const cleaned = String(value).replace(/[^0-9.\-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0

  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}
