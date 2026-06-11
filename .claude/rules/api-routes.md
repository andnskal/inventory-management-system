---
paths:
  - "inventory-management/app/api/**/*.ts"
---

# API Route 규칙 (재고 앱)

입력검증·인가·에러전파를 표준화해 리뷰에서 확정된 버그(무음 에러, 인가 불일치, 입력 미검증, 필터 인젝션)를 막는다.

## 인증·인가
- 미들웨어가 전 `/api` 경로 인증을 강제하므로 익명 접근은 차단됨. 그러나 **GET 포함 모든 핸들러에서 역할(role) 인가는 라우트가 직접** 한다. RLS는 2차 방어선이지 1차 인가가 아니다.
- 쓰기(POST/PUT/DELETE)와 민감 조회(finance/audit/inventory의 금액·거래처)는 `users.role`(admin/manager) 확인.
- 17개 핸들러에 복붙된 인증 보일러플레이트는 `lib/api/`의 공통 가드 헬퍼(`requireRole(roles)`)로 추출 권장 — 한 곳에서 에러·상태코드 통일.

## 입력 검증
- body·쿼리 파라미터(`category_id`, `search`, `pageSize`, 날짜 등)는 **사용 전 타입/범위 검증**. 실패 → `400 { error }`.
- `pageSize`에 상한(예: 100)을 둔다(무제한 응답 방지).
- 검색어를 PostgREST `.or()` 템플릿 문자열에 직접 보간 금지(필터 인젝션). 개별 `.ilike()`나 이스케이프 사용.
- 날짜 필터는 타임존 명시 후 비교(경계 누락/중복 방지).

## 에러 응답
- 모든 Supabase 호출은 `const { data, error } = await ...`로 받고 **error를 검사**한다. error 무시·로깅만 하고 빈/0 데이터로 200 응답 금지.
- 다중 쓰기(product+option+custom_field, 입출고+재고)는 부분 실패를 응답에 명시하거나 RPC 트랜잭션으로 원자화.
- 응답 통일: 성공 `{ data }`, 실패 `{ error }` + 적절 status(단건 생성 201). DB `error.message`를 프로덕션 응답에 그대로 노출하지 말 것.

## 검색·집계 ↔ 페이지네이션
- 필터(재고 상태·상품명 검색)는 **DB 쿼리(`.eq`/`.ilike`/`.in` + `count: 'exact'`)로 내려서** 적용한다. JS로 현재 페이지만 후필터하면 total/합계가 틀린다(확정 버그).
