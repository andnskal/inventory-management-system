@AGENTS.md

# 재고관리 SaaS — 프로젝트 메모리

6 도메인 + 리포트: **products · inventory(입출고) · partners(거래처) · finance(매입/매출) · audit(사용이력) · settings**.

## 스택 (추측 금지)
- **Next.js 16.2.1 App Router** — ⚠️ breaking changes 多. 코드 전 `node_modules/next/dist/docs/`의 해당 가이드 확인(`@AGENTS.md`).
- React 19.2 · TypeScript 5(strict) · Tailwind v4 · shadcn 4 + @base-ui/react
- **Supabase** `@supabase/ssr` — publishable(anon) 키만, **service-role 미사용 → 모든 접근이 RLS 적용**.
  - 서버: `lib/supabase/server.ts`(`await cookies()`) · 브라우저: `lib/supabase/client.ts` · 세션: `middleware.ts`(전 경로 인증)
- recharts(차트) · xlsx(엑셀) · sonner(토스트) · 패키지매니저 **npm**

## 검증 (커밋 전 필수)
```
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # 프로덕션 빌드
npm run format       # prettier (선택)
```

## 도메인 불변식 — 2026-06-11 리뷰에서 확정된 버그 재발 방지
조용히 장부를 틀어버리는 버그를 막는 규칙. 파일별 상세는 `.claude/rules/`가 해당 파일 작업 시 자동 로드.
1. **재고 변동은 단일 경로로.** `product_stock`은 DB 트리거/RPC로만 원자적 증감. 입출고 INSERT/UPDATE/**DELETE 모두** 재고에 반영(현재 DELETE는 재고 미원복=버그). 음수 재고 금지(CHECK).
2. **조회 error는 삼키지 않는다.** Supabase `{ data, error }`의 `error`를 받지 않거나 로깅만 하고 빈/0 데이터로 200 응답 금지 — "조회 실패"와 "0원/빈값"을 구분해 비-200 또는 `errors` 메타로 전파.
3. **엑셀 숫자는 정제 후 파싱.** `Number(value) || 0` 금지(`"1,000"`·`"₩1000"`→0 둔갑으로 재고 0 덮어씀). 통화·콤마 제거 후 파싱, NaN은 0 강제 말고 행 오류 보고/기존값 보존.
4. **외부 입력은 라우트에서 검증.** body·쿼리 파라미터를 검증 없이 DB로 보내지 않는다. 인증=미들웨어, 인가(역할)=라우트(RLS는 2차 방어선).

## Supabase MCP 워크플로
- 스키마 파악: `list_tables` → (필요 시) `list_migrations`
- 디버깅: `get_logs` → `get_advisors` (코드 수정보다 먼저)
- 스키마 변경: `apply_migration` 후 **반드시** `get_advisors(security)`로 RLS 점검 + `generate_typescript_types`로 `types/database.ts` 갱신
- ⚠️ `execute_sql`/`apply_migration`은 되돌릴 수 없음 → 위험 변경은 `create_branch`(DB 브랜치)에서 검증 후 merge

## 완료
보안·무결성이 걸린 변경은 `supabase-security-reviewer`로 검토 → `/finish` 스킬로 검증 게이트 통과 후 도메인별 부분 커밋.
