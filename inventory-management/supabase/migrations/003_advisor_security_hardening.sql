-- ============================================================
-- 003_advisor_security_hardening.sql
-- Supabase 보안 advisor 대응 (2026-06-11) — 기존 001 스키마 객체 대상.
--
-- 적용(안전):
--   1) SECURITY DEFINER 뷰 2개 → security_invoker=on (뷰의 RLS 우회 제거).
--      product_stock/inventory_transactions는 'authenticated 전체 읽기' RLS라
--      집계 결과는 동일(공유 재고 데이터). Postgres 15+ 필요(현재 17).
--   2) 함수 search_path 고정(function_search_path_mutable 경고 해소).
--   3) audit_trigger_func의 RPC(/rest/v1/rpc) 노출 차단 — 트리거 전용 함수.
--   4) #8: inventory_transactions INSERT 정책 WITH CHECK(true) →
--      created_by=auth.uid()로 created_by 위조 차단(API는 이미 user.id 주입).
--
-- 미적용(의도/위험 — 별도 판단 필요):
--   - get_user_role EXECUTE 회수: RLS 정책 내부에서 호출될 수 있어, 회수 시
--     authenticated 쿼리의 RLS 평가가 'permission denied'로 깨질 위험 → 보류.
--   - increment_notice_view EXECUTE 회수: 앱의 조회수 증가 기능으로 추정 → 보류.
--   - Auth 유출 비밀번호 보호(HaveIBeenPwned): SQL이 아닌 대시보드 Auth 설정.
-- ============================================================

-- 1) SECURITY DEFINER 뷰 → security_invoker
ALTER VIEW product_stock_summary SET (security_invoker = on);
ALTER VIEW daily_finance_summary SET (security_invoker = on);

-- 2) 함수 search_path 고정
ALTER FUNCTION audit_trigger_func() SET search_path = public;
ALTER FUNCTION update_updated_at() SET search_path = public;
ALTER FUNCTION get_user_role(uuid) SET search_path = public;

-- 3) 트리거 전용 함수의 RPC 노출 차단
REVOKE EXECUTE ON FUNCTION audit_trigger_func() FROM PUBLIC, anon, authenticated;

-- 4) #8: 입출고 INSERT created_by 위조 차단
ALTER POLICY "Authenticated users can insert transactions"
  ON inventory_transactions
  WITH CHECK (created_by = auth.uid());
