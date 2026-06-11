-- ============================================================
-- 004_stock_unique_nulls_not_distinct.sql  (리뷰 W1)
-- option_id IS NULL 상품의 중복 재고행 방지.
--
-- 문제: product_stock의 UNIQUE(product_id, option_id, location_id)는 Postgres가
--   NULL을 서로 다르게 취급하므로, option_id IS NULL 상품의 'in' 거래가 매번
--   새 재고행을 만들어 중복이 쌓일 수 있다(001부터 잠재, 002의 apply_stock_delta
--   ON CONFLICT도 이 때문에 null-option에서 미동작).
-- 해법: UNIQUE를 NULLS NOT DISTINCT로 교체 → NULL 옵션도 동일 키로 취급되어
--   ON CONFLICT upsert가 정상 누적된다. Postgres 15+ 필요(현재 17).
--
-- 안전: product_stock 0행이라 사전 중복 정리 불필요. 제약 이름은 동일하게 재사용해
--   다른 객체(ON CONFLICT는 컬럼 추론이라 이름 비의존)에 영향 없음.
-- ============================================================

ALTER TABLE product_stock
  DROP CONSTRAINT product_stock_product_id_option_id_location_id_key,
  ADD CONSTRAINT product_stock_product_id_option_id_location_id_key
    UNIQUE NULLS NOT DISTINCT (product_id, option_id, location_id);
