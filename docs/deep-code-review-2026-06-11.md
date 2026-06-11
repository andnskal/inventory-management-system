# 재고관리 앱 심층 코드 리뷰 — 종합 (2026-06-11)

> 기준 모델 **Opus 4.8** · 멀티에이전트 리뷰(5개 차원: 보안·Next16·데이터무결성·에러처리·API계약) → **발견별 적대적 검증**(false positive 제거) → 완전성 비평
> 규모: 리뷰 에이전트 56 × 2회(검증 재실행 포함), 검증된 **확정 37건 / 기각 8건**
> 상세 표: [deep-code-review-findings-2026-06-11.md](deep-code-review-findings-2026-06-11.md) · 하네스/설정 분석: [harness-upgrade-analysis-2026-06-11.md](harness-upgrade-analysis-2026-06-11.md)

---

## 0. 핵심 결론

**앱은 동작하고 구조는 양호하나, "조용히 장부를 틀어버리는" 데이터 무결성 지뢰가 핵심 위험이다. 보안은 통념과 달리 활짝 열려 있지 않다.**

검증으로 드러난 진짜 그림(인상과 다름):

| 차원 | 판정 | 근거 |
|---|---|---|
| **Next.js 16 / React 19 정확성** | 🟢 **양호** | 3건 *기각* — async `params`/`cookies()` 올바르게 await, `'use client'` 경계 정상, 캐싱 정상(cookies()로 자동 동적). `AGENTS.md`의 Next16 경고가 코드에 실제로 반영됨. (확정은 N+1 1건뿐) |
| **보안/인증** | 🟡 **열려있지 않음** | 보안 발견 11건 중 **8건이 LOW로 강등**. 검증 결과 미들웨어가 `/api` 포함 전 경로에 인증 강제 + 13개 테이블 RLS ENABLE + service-role 키 0건. 익명 노출 시나리오 불성립. 남은 건 "라우트 간 역할 인가 불일치"(심층방어) |
| **데이터 무결성** | 🔴 **핵심 위험** | 재고/매출이 조용히 영구 왜곡되는 high급 4건. 비가역. |
| **에러 견고성** | 🟠 **무음 손실** | 재무·보고서·엑셀이 조회 실패를 0/빈값으로 둔갑시켜 200 응답 |
| **API 계약** | 🟡 **유지보수성** | 17개 핸들러 boilerplate 복붙, envelope·상태코드·검증 제각각 |
| **인프라/저장소** | 🔴 **선결 필요** | 이중 git 저장소, autocrlf 가짜변경 46, 테스트 0 |

→ "이슈가 더 없나?"의 답: **있다. 그러나 예상과 다른 곳에.** 보안 구멍보다 **재고·재무 계산의 무음 오류**와 **엑셀 업로드 파이프라인**이 실질 위험이다.

---

## 1. P0 — 구조적 선결 (코드 한 줄 고치기 전에)

코드 수정의 **선결 인프라**다. 경쟁 작업이 아니라 게이트.

1. **이중 git 저장소 정리** 🔴 — 루트 `.git`(`feat/initial-setup`, 12커밋)과 중첩 `inventory-management/.git`(`feat/full-implementation`, 2커밋)이 **독립 히스토리로 같은 코드를 추적**. 어느 쪽이 정본인지 결정 → 하나로 통합(또는 명시적 서브모듈화). ⚠️ 미커밋(M) 상태에서 `.git` 제거는 위험 → **먼저 양쪽 현 상태 백업/커밋 후** 진행.
2. **autocrlf 가짜변경 46개 제거** — `git diff`가 완전히 비어 있음(실변경 0). `core.autocrlf=true` + `.gitattributes` 부재가 원인. **`.gitattributes`에 `* text=auto eol=lf` 추가 → `git add --renormalize .`** 로 노이즈를 0으로. 이걸 안 하면 이후 무결성 수정의 실제 diff가 노이즈에 묻혀 리뷰·bisect·롤백 불가.
3. **최소 회귀 테스트 그물** — 테스트 0개 상태에서 트랜잭션·재고 로직 수술은 무방비. 최소 **재고 변동(묶음 E)·엑셀 파싱(묶음 B)** 에 대한 특성화 테스트(vitest)부터.

> 비평 결론: P0는 반나절급 저비용. 건너뛰면 모든 후속 수정의 검증 비용이 배가된다.

---

## 2. 최우선 코드 이슈 (high급 — 비가역/무음 손실)

### 🔴 단일 최대 위험: 엑셀 업로드 라우트 `app/api/upload/products/route.ts`
한 라우트에 확정 발견 5건이 집중 + 외부 취약점이 교차한다.
- **숫자 파싱이 `"1,000"`·`"₩1000"`·공백을 0으로 둔갑** → 재고를 0으로 덮어씀 ([lib/excel.ts:36](inventory-management/lib/excel.ts))
- **UPDATE/옵션/재고 INSERT의 error를 전부 무시** → 부분 실패가 `success:true`로 집계(무음 손실)
- **원자성 없음** — 중간 실패 시 일부만 반영된 채 200
- **rows 개수 무제한** → 행당 5~6회 순차 await 곱연산 DoS / N+1
- **중복 product_code 멱등성 결여** → 마지막 행 값으로 덮어쓰기
- ⚠️ **xlsx@0.18.5 공급망 취약점** — 신뢰불가 파일을 파싱하는 그 라이브러리가 Prototype Pollution(GHSA-4r6h-8v6p-xvw6)·ReDoS(GHSA-5pgg-2g8v-p4x9) **미패치**. npm판은 유지보수 중단 → **SheetJS 공식 CDN 0.20+ 로 교체** 필요(npm audit/patch로 못 고침).

### 🔴 재고 무결성 (비가역)
- **입출고 내역 DELETE 시 재고 미원복** → 거래 삭제해도 `product_stock` 안 돌아옴, 재고·매출 영구 왜곡 ([api/inventory/[id]/route.ts:30](inventory-management/app/api/inventory/[id]/route.ts))
- **출고 음수 차감 무방비 + 보관위치 불일치 시 무반영** ([migrations/001_initial_schema.sql:426](inventory-management/supabase/migrations/001_initial_schema.sql))
- → 근본 해법: 재고 변동을 **DB 트리거/RPC로 단일화**(INSERT/UPDATE/DELETE 모두 원자적 증감) + `CHECK(normal_stock>=0)` 제약.

### 🟠 무음 에러 (잘못된 0을 진실로 표시)
- **통합 보고서 5개 섹션 전부 error 미수신** → 조회 실패를 0/빈값으로 둔갑 ([api/reports/route.ts:36](inventory-management/app/api/reports/route.ts))
- **재무 집계 error를 로깅만 하고 빈데이터 200** → "0원"과 "조회 실패"를 구분 못 함 ([api/finance/route.ts:44](inventory-management/app/api/finance/route.ts))

*(medium 10건·low 21건은 부록 표 참조 — 페이지네이션 후필터 버그 3건, RLS WITH CHECK(true), 마진 정의 모호, N+1 등)*

---

## 3. 실행 묶음 (산발 수정 금지 — 근본원인별로)

| 묶음 | 내용 | 단일 해법 |
|---|---|---|
| **A. 인증/인가 표준화** | GET 인증 누락·역할인가 비일관·17핸들러 boilerplate 복붙 | `lib/api/auth.ts`에 `requireRole(roles)` 가드 1개 + 미들웨어 역할 게이트 정책화 |
| **B. 입력검증 스키마** | 핵심필드 무검증·`.eq` 직접전달·pageSize 무상한·날짜 보간·엑셀 rows·NaN | 라우트별 **zod 스키마**(경계·상한·타입·ISO날짜) 일괄 도입 |
| **C. 페이지네이션 후필터 버그** | products 상태필터·inventory 검색이 "현재 페이지에만" 적용돼 total/count 오류 3건 | 필터를 **DB 쿼리로 내림**(`.in`/`.ilike` + `count:exact`) |
| **D. 무음 에러 처리** | 엑셀·finance·reports·settings·products 부분실패 무시 | "조회/쓰기 error를 받아 부분실패 시 비-200 또는 명시적 `errors` 반환" 원칙 |
| **E. 재고 원자성/무결성** | 음수차감·위치불일치·DELETE미원복·엑셀원자성·멱등성·0둔갑 | **DB 트랜잭션/RPC + CHECK 제약 + 음수 가드** |
| **F. 응답 표준화** | envelope 제각각·201/200 불일치·DB error.message 노출 | 공통 래퍼 `{data}`/`{error}` + 일관 상태코드 + 프로덕션 메시지 마스킹 |

---

## 4. 아직 점검 못 한 영역 (비평이 지목 — 추가 리스크)

- 🔴 **의존성 취약점(SCA)** — xlsx CVE(위 B 참조)가 대표. `npm audit` 미수행, next 16.2.1/react 19.2.4 핀 버전 CVE 미확인.
- 🟠 **동시성/경쟁** — `product_stock` read-then-write(TOCTOU)에 락 없음 → 동시 입출고 시 lost update. 낙관적 락/원자연산/`SELECT FOR UPDATE` 부재.
- 🟠 **미들웨어 역할 게이트 부재** — 인증만 하고 role 검사 없음. admin 라우트도 엣지에서 무차별 통과 후 각 핸들러 위임. API에 HTML 리다이렉트(401 JSON 아님) 적절성도 미검토.
- 🟡 **env/시크릿** — `.env.local` 워킹트리 존재(`.gitignore` 포함·과거 추적이력 미확인), 보안 헤더(CSP/HSTS/X-Frame) 전무.
- 🟡 **파일 업로드 하드닝** — 바이트 한도, MIME/확장자, 시트/셀 폭탄, `XLSX.read` 옵션(cellFormula 비활성) 미점검.
- 🟡 **레이트리밋·관측성·a11y·i18n/타임존·빌드 위생(.next/zip 혼입)·CI 게이트** — 전부 미점검(상세 부록/비평).

---

## 5. 권장 실행 순서

```
P0  구조 정리: 이중 git 통합 + .gitattributes(eol=lf)+renormalize(가짜변경 0) + 핵심경로 특성화 테스트
P1  묶음 E 재고 무결성 (비가역 #DELETE·음수차감)  ⊕  묶음 B 엑셀 + xlsx→SheetJS 교체 (무음 0덮어쓰기+CVE+DoS)
P2  묶음 D 무음 에러 (finance/reports 0원 둔갑)
P3  묶음 A 인증/인가 표준화 + 미들웨어 역할게이트  (RLS 2차 방어선 있어 상대적 후순위)
P4  묶음 C 페이지네이션 버그 · 묶음 F 응답 표준화 · 동시성 락
상시 SCA(npm audit)·보안헤더·a11y·관측성
```
**우선순위 원칙: 비가역(영구 왜곡) > 무음 손실(조용한 0) > 인가(2차 방어선 존재, 복구가능) > 품질.**

---

## 6. 하네스 분석과의 연결 (왜 이 이슈들이 생겼나)

이 코드 이슈들은 1차 [하네스 분석](harness-upgrade-analysis-2026-06-11.md)이 지적한 공백의 **직접적 증상**이다:
- **테스트 0개 + 검증 게이트 부재** → 무음 에러·재고 왜곡이 잡히지 않고 누적 (→ P0 테스트, package.json `typecheck`/`test`, `/finish` 게이트)
- **`.claude/rules` 부재** → 엑셀 컬럼매핑·API 입력검증·에러응답 규칙이 코드에 강제되지 않음 (→ `rules/api-routes.md`, `rules/excel-upload.md`)
- **`supabase-security-reviewer` 서브에이전트 부재** → RLS·인가 불일치가 리뷰 없이 통과 (→ "use proactively" 에이전트)
- **빈 CLAUDE.md** → "재고 변동은 DB 트리거로 단일화", "조회 error는 반드시 전파" 같은 도메인 규칙이 매 세션 유실

즉 **하네스 고도화(1차) = 이런 버그의 재발 방지 장치**, **코드 수정(2차) = 현존 버그 제거**. 둘은 짝이다.

---

## 부록: 통계
- 확정 37건 = high 6 · medium 10 · low 21 / 기각(거짓양성) 8건
- 기각 사례(검증 엄밀성): "GET 인증부재 = 치명 노출"(미들웨어+RLS 방어로 LOW 강등), Next16 async 규약 위반(0건), `'use client'` 누수(없음) 등 — 전체 표는 [부록 파일](deep-code-review-findings-2026-06-11.md)
