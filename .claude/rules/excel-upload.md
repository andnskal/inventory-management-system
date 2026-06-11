---
paths:
  - "inventory-management/lib/excel.ts"
  - "inventory-management/app/api/upload/products/**"
  - "inventory-management/components/products/excel-upload-dialog.tsx"
---

# 엑셀 업로드 규칙

이 경로는 리뷰에서 **단일 최대 위험**으로 지목됨(데이터 무결성 + xlsx CVE + DoS 교차). 아래를 지킨다.

## 숫자 파싱 (`lib/excel.ts`)
- **`Number(value) || 0` 패턴 금지** — `"1,000"`·`"₩1,000"`·`" "`이 **0으로 둔갑해 재고를 0으로 덮어쓴다**(확정 버그 #17, `lib/excel.ts:36`).
- 문자열이면 `replace(/[^0-9.\-]/g, '')` 후 파싱. 결과가 NaN이면 0으로 강제하지 말고 **해당 행을 errors로 보고하거나 기존 재고를 보존(update 스킵)**. 음수 결과도 거부.
- `XLSX.read`/`sheet_to_json`는 try/catch + 빈 워크북/시트 가드. 컬럼 매핑 결과 0건(헤더 불일치)도 구분된 에러로 안내.

## 서버 검증 (`app/api/upload/products`)
- 파싱은 클라이언트에서 일어나므로 서버는 임의 JSON을 신뢰하지 말 것. **`rows.length` 상한**(예: 1000~5000) + 본문 크기 한도 + 각 숫자 필드 타입/음수 검증.
- 행당 다중 순차 `await`(products·options·stock 조회/쓰기) = N+1/DoS. 가능하면 **배치 upsert** 또는 단일 RPC.
- **원자성**: 중간 실패 시 부분 반영 금지 — RPC 트랜잭션으로 묶거나, 모든 update/insert의 `error`를 누적해 `created/updated` 카운트는 성공 건만 증가시키고 부분 실패를 응답에 명시.
- 중복 `product_code` 행 멱등성: 업로드 전 키 기준 그룹/합산하거나 누적 정책 명시(`.single()` 대신 `maybeSingle()`).

## 의존성 (공급망)
- ⚠️ `xlsx@0.18.5`(npm 레지스트리판)은 Prototype Pollution·ReDoS 미패치 + 유지보수 중단. 신뢰불가 파일을 파싱하므로 **SheetJS 공식 0.20+** 로 교체 검토. `XLSX.read` 옵션에서 수식/HTML 비활성.
