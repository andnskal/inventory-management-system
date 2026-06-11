-- ============================================================
-- 002_stock_integrity.sql
-- 재고 무결성 보강 (2026-06-11 심층 리뷰 #14, #15)
--
-- 문제:
--   - 001의 stock_update_on_transaction 트리거는 AFTER INSERT 뿐 →
--     입출고 내역 DELETE/UPDATE 시 product_stock 미반영(재고·매출 영구 왜곡, #15).
--   - 'out' 분기가 매칭 재고행 부재 시 무음 무반영, 음수 차감 무방비(#14).
--
-- 해법:
--   1) product_stock 음수 차단 CHECK 제약.
--   2) 재고 반영을 단일 함수(apply_stock_delta)로 통합 — 증가는 upsert,
--      감소는 기존 행만 갱신하고 행이 없으면 RAISE(무음 손실 방지).
--   3) INSERT/UPDATE/DELETE를 모두 처리하는 트리거로 교체 —
--      OLD 효과를 역산하고 NEW 효과를 적용(원자적, 단일 진실원천).
--
-- ⚠️ 적용 전 필수 (보안 리뷰 반영):
--   - 적용은 되돌릴 수 없음. **Supabase DB 브랜치에서 검증 후 merge** 권장(prod 직접 금지).
--   - 사전 점검 ①: 기존 음수 재고가 있으면 CHECK 추가가 실패(트랜잭션 전체 롤백)한다:
--       SELECT * FROM product_stock WHERE normal_stock < 0 OR pending_shortage_stock < 0;
--   - 사전 점검 ②: 재고행 없이 생성된 과거 'out' 거래(고아 거래)를 점검한다. 신규 트리거는
--     감소 대상 행이 없으면 RAISE하므로, 그런 거래의 UPDATE나 음수 진입 DELETE가 실패할 수 있다:
--       SELECT it.* FROM inventory_transactions it
--       LEFT JOIN product_stock ps
--         ON ps.product_id = it.product_id
--        AND (ps.option_id = it.option_id OR (ps.option_id IS NULL AND it.option_id IS NULL))
--        AND ps.location_id = it.location_id
--       WHERE it.type = 'out' AND ps.id IS NULL;
--   - 앱의 입출고 DELETE 라우트(app/api/inventory/[id])는 이 트리거 적용 후
--     별도 재고 원복 코드 없이도 자동 원복된다(앱 코드 중복 원복 추가 금지 — 보안리뷰 확인).
--   - 적용 후: get_advisors(security) 점검 + generate_typescript_types로 타입 동기화.
--
-- ⚠️ 별도 후속 마이그레이션 필요 (W1 — 본 파일 범위 밖, 트래킹):
--   product_stock의 UNIQUE(product_id, option_id, location_id)는 Postgres가 NULL을 서로 다르게
--   취급하므로 option_id IS NULL 상품의 'in' 거래가 중복 재고행을 만들 수 있다(001부터 잠재).
--   → 중복 행 정리 후 UNIQUE NULLS NOT DISTINCT(또는 COALESCE 부분 유니크 인덱스)로 교체.
-- ============================================================
-- (트랜잭션은 마이그레이션 러너가 관리하므로 명시적 BEGIN/COMMIT 미포함)

-- 1) 음수 재고 차단 ------------------------------------------------------------
ALTER TABLE product_stock
  ADD CONSTRAINT product_stock_normal_nonneg
    CHECK (normal_stock >= 0),
  ADD CONSTRAINT product_stock_pending_nonneg
    CHECK (pending_shortage_stock >= 0);

-- 2) 단일 재고 반영 함수 -------------------------------------------------------
--    p_delta > 0: 증가(행 없으면 생성). p_delta < 0: 감소(기존 행만, 없으면 에러).
CREATE OR REPLACE FUNCTION apply_stock_delta(
  p_product_id  UUID,
  p_option_id   UUID,
  p_location_id UUID,
  p_stock_type  stock_type,
  p_delta       INT
) RETURNS VOID AS $$
DECLARE
  v_rows INT;
BEGIN
  IF p_delta = 0 THEN
    RETURN;
  END IF;

  IF p_delta > 0 THEN
    -- 증가: upsert
    IF p_stock_type = 'normal' THEN
      INSERT INTO product_stock (product_id, option_id, location_id, normal_stock)
      VALUES (p_product_id, p_option_id, p_location_id, p_delta)
      ON CONFLICT (product_id, option_id, location_id)
      DO UPDATE SET normal_stock = product_stock.normal_stock + p_delta;
    ELSE
      INSERT INTO product_stock (product_id, option_id, location_id, pending_shortage_stock)
      VALUES (p_product_id, p_option_id, p_location_id, p_delta)
      ON CONFLICT (product_id, option_id, location_id)
      DO UPDATE SET pending_shortage_stock = product_stock.pending_shortage_stock + p_delta;
    END IF;
  ELSE
    -- 감소: 기존 행만 갱신(없으면 에러). 결과 음수는 CHECK 제약이 롤백.
    IF p_stock_type = 'normal' THEN
      UPDATE product_stock
      SET normal_stock = normal_stock + p_delta
      WHERE product_id = p_product_id
        AND (option_id = p_option_id OR (option_id IS NULL AND p_option_id IS NULL))
        AND location_id = p_location_id;
    ELSE
      UPDATE product_stock
      SET pending_shortage_stock = pending_shortage_stock + p_delta
      WHERE product_id = p_product_id
        AND (option_id = p_option_id OR (option_id IS NULL AND p_option_id IS NULL))
        AND location_id = p_location_id;
    END IF;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION '재고 차감 실패: 대상 재고행이 없습니다 (product_id=%, option_id=%, location_id=%)',
        p_product_id, p_option_id, p_location_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) INSERT/UPDATE/DELETE 통합 트리거 함수 -------------------------------------
--    'in'  => +quantity, 'out' => -quantity. UPDATE/DELETE는 OLD를 역산.
CREATE OR REPLACE FUNCTION sync_stock_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- OLD 효과 되돌리기 (UPDATE / DELETE)
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM apply_stock_delta(
      OLD.product_id, OLD.option_id, OLD.location_id, OLD.stock_type,
      CASE WHEN OLD.type = 'in' THEN -OLD.quantity ELSE OLD.quantity END
    );
  END IF;

  -- NEW 효과 적용 (INSERT / UPDATE)
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM apply_stock_delta(
      NEW.product_id, NEW.option_id, NEW.location_id, NEW.stock_type,
      CASE WHEN NEW.type = 'in' THEN NEW.quantity ELSE -NEW.quantity END
    );
  END IF;

  RETURN NULL; -- AFTER 트리거이므로 반환값 무시
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4) 기존 INSERT-only 트리거를 교체 -------------------------------------------
DROP TRIGGER IF EXISTS stock_update_on_transaction ON inventory_transactions;
DROP FUNCTION IF EXISTS update_stock_on_transaction();

CREATE TRIGGER stock_sync_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION sync_stock_on_transaction();

-- 5) SECURITY DEFINER 함수의 직접 호출 차단 (RLS 우회 방지 — 보안리뷰 W2 + advisor 확인) --
--    트리거는 정의자(owner) 컨텍스트로 실행되므로 REVOKE해도 트리거 동작엔 영향 없음.
--    ⚠️ Supabase는 anon·authenticated 역할에 EXECUTE를 PUBLIC과 별개로 부여하므로
--       PUBLIC만 REVOKE하면 advisor(anon/authenticated_security_definer_function_executable)가
--       남는다 → anon·authenticated도 함께 REVOKE해야 RPC(/rest/v1/rpc/...) 노출이 닫힌다.
REVOKE EXECUTE ON FUNCTION apply_stock_delta(UUID, UUID, UUID, stock_type, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_stock_on_transaction() FROM PUBLIC, anon, authenticated;
