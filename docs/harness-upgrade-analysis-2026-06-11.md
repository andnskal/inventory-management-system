# 하네스 고도화 분석 — wikidocs 「Claude Code 하네스 엔지니어링 완벽 가이드」 기준

> 작성일 2026-06-11 · 기준 모델 **Opus 4.8** (Fable 5 아님) · 분석 대상 소스: `wikidocs.net/book/20121` (19개 챕터) + 우리 로컬 환경 감사
> 산출 방식: 멀티에이전트 워크플로(가이드 15챕터 병렬 스크랩 → 프로젝트/Skills/MCP 감사 → 영역별 권고 합성 → 적대적 검토)

---

## 0. 결론 (판단)

**고도화 여지 = 매우 큼. 단, "프로젝트 하네스"와 "전역 위생"이 분리된 문제다.**

| 영역 | 현재 상태 | 한 줄 진단 |
|---|---|---|
| **프로젝트 하네스** (inventory-management) | 🔴 거의 백지 | 작동하는 Next16+Supabase 앱·풍부한 설계문서는 있으나, 하네스 핵심 산출물(내용 있는 CLAUDE.md / agents / 공유 settings / hooks / 검증 스크립트)이 **전무** |
| **커스텀 Skills** (4종) | 🟢 양호 | `harness` 스킬은 가이드 원칙(Progressive Disclosure·references 분리·pushy description·500줄)을 **모범적으로 구현**. 잔손질만 필요 |
| **MCP 구성** | 🟡 노이즈+위생 | 프로젝트 전용 `.mcp.json` 없음(재현성 0) + `settings.local.json`에 **anon JWT 평문·`rm -rf` 자동승인** 박제 |

→ "가이드를 보고 우리를 고도화할 수 있나?"의 답은 **명확히 Yes**. 가장 큰 레버리지는 **프로젝트 CLAUDE.md를 실질화**하는 것이고, 가장 시급한 건 **보안 위생 1분 작업**이다. Skills/MCP는 큰 재설계가 아니라 정밀 보정 수준.

---

## 1. 가이드가 말하는 핵심 (우리에게 적용되는 것만)

- **04 CLAUDE.md**: 매 세션 자동 로드되는 영속 컨텍스트. ①200줄 미만 ②검증 가능한 구체성 ③마크다운 구조 ④모순 없음. `@path` import, `.claude/rules/`(YAML `paths`로 경로별 조건 로드). `/init`로 초안 자동 생성. "추측 불가한 것만, 자명한 건 빼라."
- **02 에이전트 루프 / 13 신기능**: 컨텍스트 윈도우가 최우선 자원(1M이어도 차면 성능 저하). **Supabase `apply_migration`/`execute_sql` 같은 외부 변경은 체크포인트로 되돌릴 수 없음** → Plan 모드/DB 브랜치로. Opus 4.8은 거짓 완료 보고가 감소 → 검증 boilerplate는 "모델이 못 하는 것"에만.
- **05 Skills / 06 Subagents**: 반복 지시는 즉시 Skill로. 부작용 워크플로엔 `disable-model-invocation`. subagent는 `.claude/agents/*.md`, `model: inherit`, 읽기전용 리뷰어는 tools 최소화 + "use proactively".
- **07 Hooks**: CLAUDE.md(권고)와 달리 **결정적 강제**. PostToolUse(포맷), PreToolUse(보호경로 차단), Stop(완료 검증). `$CLAUDE_PROJECT_DIR`.
- **08 MCP / 12 Harness**: 팀 공유 MCP는 `.mcp.json`(커밋), 시크릿은 `${VAR}` 확장. 등록한 MCP는 워크플로에 배선해 "죽은 도구"로 두지 말 것. 저장소 = 단일 진실 공급원.

---

## 2. 현황 진단 (감사 결과)

### 2.1 프로젝트 (`inventory-management`)
- **CLAUDE.md 3곳 모두 사실상 비어 있음**: `inventory-management/CLAUDE.md`·`as-dashboard/CLAUDE.md` 둘 다 `@AGENTS.md` 한 줄, 루트엔 CLAUDE.md 없음. 실제 내용은 `AGENTS.md`(332B)의 "Next16은 breaking change 많으니 `node_modules/next/dist/docs/` 읽어라" **경고 한 문장뿐** — 도메인/아키텍처/검증명령 전무.
- 스택: Next.js **16.2.1** App Router, React 19.2, TS5, Tailwind v4, shadcn4+@base-ui, Supabase(@supabase/ssr), recharts, xlsx, npm.
- `package.json` scripts: `dev/build/start/lint` **4개뿐**. `typecheck`(tsc --noEmit)·`format`·`test` 없음. **테스트 프레임워크/파일 0개.**
- `.claude/agents` 0개, 공유 `settings.json` 없음(개인 `settings.local.json`만), hooks 없음, `.mcp.json` 없음.
- **중첩 git**: 루트(`feat/initial-setup`) 아래 `inventory-management/.git`이 별도 존재. 한 폴더에 inventory / as-dashboard / as-dashboard-bundle(+zip) 3개 프로젝트 혼재.
- docs/plans에 설계·구현 계획 4건 존재(미활용 컨텍스트 자산).

### 2.2 커스텀 Skills (전역 `~/.claude/skills/`)
- `harness`(284줄 + references 6파일 1,694줄) — **4종 중 최고 완성도.** `sheets-dashboard`(225줄, 단일) 충실하나 서버 절대경로·서비스계정·버전 하드코딩. `channeltalk-cs-reference`(116줄)·`cs-response-advisor`(94줄) 양호(500줄 내라 분리 불필요).
- **전역 CLAUDE.md(28줄)에 4개 중 2개(`channeltalk-cs-reference`, `cs-response-advisor`)가 미등재** → 발견성 결손.
- CLAUDE.md ↔ SKILL.md 규칙 **중복 기재**(읽기2회·model:opus·500줄·commands 금지) → 드리프트 위험.

### 2.3 MCP / Hooks
- 프로젝트 `.mcp.json` 없음 → 모든 MCP를 전역 상속, 재현성 0. Supabase 백엔드 앱인데 Supabase MCP가 프로젝트에 바인딩 안 됨.
- 전역 14 플러그인 + Desktop stdio 3(pyhub 엑셀/sequential-thinking/google-sheets) + 원격 커넥터 40+개 활성. 다수가 재고 앱과 무관(bio-research·legal·sales·hr·stitch·pdf 등) → 도구 노이즈.
- Hooks는 전역 `context-mode` PreToolUse/SessionStart 2개뿐(이 세션의 ctx 안내 주입 주체). 프로젝트 품질 게이트 hook 없음.
- 🔴 **보안**: `D:\…\.claude\settings.local.json`의 allow 배열에 **Supabase anon JWT를 printf로 평문 출력**하는 항목 + **`rm -rf …/inventory-management`** 자동 승인 항목. allow 50개 중 절반이 1회성 명령 잔재.

---

## 3. 권고안 (적대적 검토 반영·dedupe·우선순위)

> 검토에서 잡힌 원시 권고의 오류를 **교정**해 반영함. 표기: ⭐레버리지 / 🧹즉시 잡일 / ⚠️주의.

### P0 — 보안·위생 (1분, 지금)
1. 🧹 `settings.local.json`에서 **anon JWT printf·`rm -rf` 자동승인·1회성 명령 전반** 청소. 검토 지적대로 3개만이 아니라 재사용 불가 잔재 전체를 비우고, 재사용 패턴(`Bash(npm run:*)` 등)만 남긴다. `/permissions`나 `fewer-permission-prompts` 스킬 활용. ⚠️ `.env.local`이 `.gitignore`에 있는지 **먼저 확인**(감사는 미확인 상태로 표시) → 있으면 노출된 anon 키 로테이션 권장.

### P1 — 토대 (⭐ 최고 레버리지, 한 PR로 묶기)
2. ⭐ **`/init` 먼저 실행** → 자동 초안 위에 손질로 `inventory-management/CLAUDE.md`를 실질화. (검토 핵심 지적: 영역 제목에 `/init`가 있는데 원안엔 실행 단계가 빠졌었음. 작동 앱+docs/plans 4건이 있으니 백지 손작성보다 `/init`가 정석.)
   - **반드시 `package.json` 스크립트 추가와 같은 PR로 묶을 것.** `typecheck`(`tsc --noEmit`)·`format`(prettier) 없이 "커밋 전 `npm run typecheck` 필수"라고 CLAUDE.md에 적으면 **존재하지 않는 명령을 참조하는 거짓 약속**(04장 "검증 불가능 규칙"). → 두 작업은 분리 불가.
   - CLAUDE.md엔 도메인 6+1·스택·검증명령·Supabase 클라 규약(server/client/middleware)·Next16 경고(AGENTS.md 흡수)만. ⚠️ "Server Component 기본" 같은 **자명한 것은 빼라**(200줄 예산). docs/plans 4건은 `@import` 포인터로 연결.

### P2 — 결정적 강제 (토대 위에)
3. **`.claude/rules/`** 경로별 규칙: `api-routes.md`(paths `app/api/**`: 입력검증·표준 에러응답·서버 클라이언트), `excel-upload.md`(컬럼매핑·빈행·중복 SKU), `dashboard-pages.md`(Server/Client 경계). 본문 비대화 없이 도메인 규칙 제공.
4. **`.claude/agents/`** 2종: `supabase-security-reviewer`(tools 최소·`model: inherit`·"use proactively after API route edits": RLS 누락/키 노출/입력검증 스캔) + `nextjs16-implementer`(Next16 docs 선독 강제). ⚠️ 사용자 글로벌 규칙대로 `.md` 파일로 정의.
5. **공유 `.claude/settings.json` + hooks**: PostToolUse(편집 후 prettier+eslint --fix), PreToolUse(`.env`/migrations/lock/next.config 보호경로 차단). ⚠️ 검토 지적 반영: (a) prettier **설치 후** hook 켜기(미설치 상태로 켜면 매 편집 에러 스팸), (b) Windows이므로 `shell: bash` 고정하지 말고 **`node` 직접 호출**, (c) 새 hook 얹기 전에 기존 전역 `context-mode` hook과 신호/소음·충돌 점검.
6. **프로젝트 `.mcp.json`**(검토에서 두 영역 중복 → **단일 항목으로 dedupe**): `supabase`+`context7`만 project 스코프 고정, 시크릿 `${VAR}`. `github`는 이미 전역 플러그인 활성이므로 **중복 등록하지 않음**(재현성 꼭 필요할 때만 추가). ⚠️ **권한 allowlist의 MCP 도구 ID 주의** — 이 환경의 Supabase는 `mcp__c5b2e7d6-…__list_tables`(UUID 네임스페이스), Context7은 `mcp__Context7__…`(대문자)라서 원안의 `mcp__supabase__*`/`mcp__context7__*`는 **매칭 안 됨**. `/permissions`로 실제 노출 ID를 확인해 등록.

### P3 — 동작 검증·완료 단일경로
7. ⚠️ **테스트 누락 보완**(검토가 "통째로 빠졌다"고 지적): typecheck/lint는 타입·스타일만 잡고 "finance 집계가 틀린" 류의 **조용한 버그는 못 잡음**. 최소 vitest 스모크 테스트(finance 집계·xlsx 파싱 순수 로직)라도 도입.
8. **`/finish` 완료 단일 경로**를 `.claude/skills/finish/`로(⚠️ 글로벌 규칙이 `commands/` 생성 금지 → `commands/finish.md`는 **선택지에서 제외**): typecheck+lint+build 게이트 통과 후 도메인별 부분 커밋, 스키마 변경 시 `generate_typescript_types` 동기화.

### Skills 보정 (큰 재설계 불필요)
- 🧹 전역 CLAUDE.md에 누락된 CS 스킬 2개 등재 + CLAUDE.md는 **포인터/트리거만**, 상세는 SKILL.md를 단일 진실원천으로(중복 제거).
- `harness`의 `model:"opus"` 하드코딩 → **`model: inherit` 기반으로 재검토**. ⚠️ 단, "Opus 4.8로 검증 boilerplate 30~40% 제거"는 가이드 13장 주장의 재인용일 뿐 **우리 하네스에 실측(ablation) 안 됨** → 결론 선취 말고 "점검 항목"으로. **Fable 5 관점**: `inherit`면 세션 모델을 따르므로 지금은 Opus 4.8, 나중에 Fable 5 테스트 시 강제 충돌 없음.
- `sheets-dashboard`: 하드코딩 경로/서비스계정/버전을 `references/setup.md`로 분리 + `allowed-tools` 명시.
- ⚠️ **바퀴 재발명 회피**(검토 지적): Supabase 전용 스킬을 손으로 새로 만들기 전에, 이미 사용 가능한 공식 **`supabase:supabase` 스킬**(+ MCP가 권하는 `npx skills add supabase/agent-skills`)을 먼저 채택/참조.

### ⚠️ 보류 권고 (지금 하지 말 것)
- **중첩 git 정리**: 하위 `.git` 제거/통합은 **미커밋 대량 변경(M) 상태에서 이력 소실 위험**이 큰 파괴 작업. 지금은 손대지 말고 → 먼저 현재 변경 커밋/백업 → 그 다음 별도 안전 절차로. 당장은 루트 CLAUDE.md에 "작업 기본 위치 = `inventory-management/`, 나머지는 별개 프로젝트" **스코프 명시**만으로 혼동을 막는다.

---

## 4. 실행 로드맵

```
P0 (지금, 1분)   보안 위생: settings.local.json 청소 + .gitignore 확인 + 키 로테이션
P1 (토대, 1 PR)  /init → CLAUDE.md 실질화  ⊕  package.json typecheck/format 스크립트 (+prettier 설치)
P2 (강제 레이어)  .claude/rules ×3 · agents ×2 · 공유 settings.json+hooks · .mcp.json(supabase+context7)
P3 (검증·완료)   vitest 스모크 테스트 · /finish 스킬 · (선택) harness Outer 컴포넌트
보류            중첩 git 정리(커밋/백업 후 별도 진행)
```

## 5. 핵심 주의사항
1. **P1을 한 PR로 묶지 않으면 CLAUDE.md가 거짓 약속이 된다.**
2. **MCP 권한 allowlist는 실제 도구 ID(UUID/대문자 네임스페이스)로 검증 후 작성** — 복붙하면 안 됨.
3. **prettier 설치 전 format hook 금지**, Windows에선 hook을 `node` 직접 호출.
4. **중첩 git은 미커밋 상태에서 건드리지 말 것.**
5. **Fable 5 대비**: 모델 하드코딩(`"opus"`)을 `inherit`로 옮기면 "현재 Opus 4.8 고정 + 추후 Fable 5 전환"이 한 줄 변경으로 끝난다.
