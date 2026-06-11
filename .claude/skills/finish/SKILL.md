---
name: finish
description: 재고 앱 작업 완료 게이트. 코드 변경을 끝낸 뒤 typecheck+lint+build 검증을 통과시키고, 도메인 불변식(재고·에러전파·입력검증)을 점검한 후 도메인별로 부분 커밋한다. "끝내줘", "마무리", "커밋해줘", "완료", "finish" 등 작업 마감 요청 시 사용. 검증 없이 완료를 선언하지 않기 위한 단일 완료 경로.
---

# 작업 완료 게이트

코드 변경을 "완료"로 선언하기 전의 단일 경로. 검증을 통과하지 못하면 커밋하지 않는다.

## 절차
1. **범위 확인** — `inventory-management`에서 `git diff --stat`로 변경 파일을 본다. ⚠️ 이중 저장소 주의: 어느 `.git`이 대상인지 확인.
2. **검증 게이트** (`inventory-management`에서 실행):
   ```
   npm run typecheck && npm run lint && npm run build
   ```
   하나라도 실패하면 **중단하고 원인을 보고**한다. 통과할 때까지 커밋 금지.
3. **도메인 점검** — 변경에 해당하면:
   - API route: 입력검증·역할 인가·에러 전파(무음 200 금지)를 포함했는가
   - 재고 관련: 입출고 변동이 `product_stock`에 반영되는가(**DELETE 포함**)
   - 엑셀: 숫자 정제 파싱·rows 상한·원자성
   - DB 스키마 변경 시 `generate_typescript_types`로 `types/database.ts` 동기화
   - 보안/무결성 변경이면 `supabase-security-reviewer`로 검토
4. **부분 커밋** — 도메인 단위로 `feat({domain}): {요약}` 또는 `fix({domain}): {요약}`. 무관한 변경을 한 커밋에 섞지 않는다.

## 하지 말 것
- 검증 실패를 무시하고 "완료" 보고.
- autocrlf 줄바꿈 잡음(`git diff`가 비어 있는 ` M`)을 실제 변경처럼 커밋. 먼저 `.gitattributes`+`git add --renormalize .`로 정리.
