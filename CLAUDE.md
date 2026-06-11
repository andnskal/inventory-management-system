# 작업공간 오리엔테이션

이 폴더(`D:\임시 프로젝트\재고관련`)에는 **별개 프로젝트가 섞여 있다.** 작업 대상을 혼동하지 말 것.

- **`inventory-management/`** = 메인 재고관리 SaaS (작업 기본 위치). 상세 규칙은 `inventory-management/CLAUDE.md`.
- `as-dashboard/`, `as-dashboard-bundle/`, `*.zip` = 별개 프로젝트. **명시적 지시 없으면 건드리지 않는다.**

## 하네스 로딩 규칙 (중요)
- 이 루트의 `.claude/`(agents·rules·skills)가 프로젝트 하네스다. **Claude Code를 이 루트에서 실행하라.** `inventory-management/`로 cd해서 열면 루트 `.claude/`가 로드되지 않아 리뷰어 에이전트·경로 규칙이 비활성된다.
- 경로 스코프 규칙(`.claude/rules/`)은 `inventory-management/...` 경로의 파일을 읽을 때만 자동 로드된다.
- 전문 에이전트: `supabase-security-reviewer`(보안·무결성 리뷰, API/마이그레이션 수정 후 자동 위임), `nextjs16-implementer`(Next16 구현). 완료는 `/finish` 스킬.

## 저장소 주의 (미해결 — 별도 P0 트랙)
- ⚠️ **이중 git 저장소**: 루트 `.git`과 `inventory-management/.git`이 독립 히스토리로 같은 코드를 추적한다. 커밋 전 어느 저장소가 대상인지 확인하라.
- `git status`의 대량 ` M`은 대부분 `core.autocrlf` 줄바꿈 잡음(`git diff`는 비어 있음). 루트 `.gitattributes`(eol=lf)는 추가했으나, 기존 잡음 제거는 `git add --renormalize .`를 별도로 실행해야 한다.

## 분석 산출물
- `docs/deep-code-review-2026-06-11.md` (코드 리뷰 확정 37건) · `docs/deep-code-review-findings-2026-06-11.md` (발견 표)
- `docs/harness-upgrade-analysis-2026-06-11.md` (하네스/Skills/MCP 고도화)
