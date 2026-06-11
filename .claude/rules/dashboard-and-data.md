---
paths:
  - "inventory-management/app/(dashboard)/**"
  - "inventory-management/components/**"
  - "inventory-management/lib/supabase/**"
---

# 대시보드·데이터 접근 규칙

## Server / Client 경계
- 기본은 Server Component. `'use client'`는 상호작용(폼·다이얼로그·차트 인터랙션)에만.
- 서버 전용 모듈(`lib/supabase/server.ts`, env, service 로직)을 클라이언트 컴포넌트로 import하지 말 것.
- Next 16: `params`/`searchParams`/`cookies()`는 **비동기 → 반드시 `await`**. (현재 코드는 준수 중 — 유지)

## 데이터 fetch
- 서버 컴포넌트에서 직접 async fetch 우선. 클라이언트 fetch는 상호작용에 필요한 경우만.
- **N+1 금지**: 항목마다 개별 `await` 조회(예: 상품별 마지막 출고일) 대신 집계 쿼리/뷰/RPC 또는 `Promise.all` 병렬화. (대시보드 확정 이슈)

## 폼·UX 견고성
- 숫자 입력은 `Number()` + `Number.isFinite()` 검사. `parseInt(...) || 0`로 빈 입력/소수를 묵살하지 말 것(미입력과 0을 구분).
- 폼 제출 실패 시 `sonner` 토스트로 사용자 피드백. 낙관적 업데이트는 실패 시 롤백.

## Supabase 클라이언트
- 서버는 `createClient()`(server.ts), 브라우저는 client.ts. 키는 publishable(anon)만 — 모든 쿼리가 RLS 적용 대상임을 전제로 작성(RLS를 신뢰하되 라우트 인가도 병행).
