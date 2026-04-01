-- ========================================
-- 1. ENUM 타입 정의
-- ========================================
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff');
CREATE TYPE partner_type AS ENUM ('supplier', 'customer', 'both');
CREATE TYPE transaction_type AS ENUM ('in', 'out');
CREATE TYPE stock_type AS ENUM ('normal', 'pending_shortage');
CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
CREATE TYPE custom_field_type AS ENUM ('text', 'number', 'date', 'select');
CREATE TYPE custom_field_target AS ENUM ('products', 'partners');

-- ========================================
-- 2. users 테이블
-- ========================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ========================================
-- 3. categories 테이블 (계층 구조)
-- ========================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  depth INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read categories"
  ON categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ========================================
-- 4. products 테이블
-- ========================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  unit VARCHAR NOT NULL DEFAULT '개',
  safety_stock INT NOT NULL DEFAULT 0,
  purchase_price DECIMAL(12,2) DEFAULT 0,
  selling_price DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read products"
  ON products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can insert products"
  ON products FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can update products"
  ON products FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ========================================
-- 5. product_options 테이블
-- ========================================
CREATE TABLE product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option_name VARCHAR NOT NULL,
  sku VARCHAR UNIQUE,
  safety_stock INT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read options"
  ON product_options FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage options"
  ON product_options FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ========================================
-- 6. storage_locations 테이블
-- ========================================
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read locations"
  ON storage_locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage locations"
  ON storage_locations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ========================================
-- 7. product_stock 테이블 (위치별 재고)
-- ========================================
CREATE TABLE product_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option_id UUID REFERENCES product_options(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES storage_locations(id) ON DELETE CASCADE,
  normal_stock INT NOT NULL DEFAULT 0,
  pending_shortage_stock INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, option_id, location_id)
);

ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stock"
  ON product_stock FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage stock"
  ON product_stock FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ========================================
-- 8. partners 테이블
-- ========================================
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  type partner_type NOT NULL DEFAULT 'both',
  contact_name VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read partners"
  ON partners FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage partners"
  ON partners FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ========================================
-- 9. inventory_transactions 테이블
-- ========================================
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type transaction_type NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  option_id UUID REFERENCES product_options(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES storage_locations(id) ON DELETE RESTRICT,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  stock_type stock_type NOT NULL DEFAULT 'normal',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read transactions"
  ON inventory_transactions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Staff can read own transactions"
  ON inventory_transactions FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can insert transactions"
  ON inventory_transactions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage transactions"
  ON inventory_transactions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ========================================
-- 10. audit_logs 테이블
-- ========================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR NOT NULL,
  record_id UUID NOT NULL,
  action audit_action NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ========================================
-- 11. settings 테이블
-- ========================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings"
  ON settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 기본 설정 데이터 삽입
INSERT INTO settings (key, value, description) VALUES
  ('default_safety_stock', '10', '기본 안전재고 수량'),
  ('stale_stock_days', '90', '악성재고 판단 기간 (일)'),
  ('units', '["개", "박스", "kg", "set", "EA", "팩"]', '사용 가능한 단위 목록');

-- ========================================
-- 12. custom_fields 테이블
-- ========================================
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_table custom_field_target NOT NULL,
  field_name VARCHAR NOT NULL,
  field_type custom_field_type NOT NULL DEFAULT 'text',
  select_options JSONB,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read custom fields"
  ON custom_fields FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage custom fields"
  ON custom_fields FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ========================================
-- 13. custom_field_values 테이블
-- ========================================
CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  record_id UUID NOT NULL,
  value TEXT
);

ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read custom values"
  ON custom_field_values FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage custom values"
  ON custom_field_values FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ========================================
-- 14. DB 뷰
-- ========================================

-- 매입/매출 일별 집계
CREATE VIEW daily_finance_summary AS
SELECT
  transaction_date,
  SUM(CASE WHEN type = 'in' THEN total_price ELSE 0 END) as purchase_total,
  SUM(CASE WHEN type = 'out' THEN total_price ELSE 0 END) as sales_total,
  SUM(CASE WHEN type = 'out' THEN total_price ELSE 0 END) -
  SUM(CASE WHEN type = 'in' THEN total_price ELSE 0 END) as margin
FROM inventory_transactions
GROUP BY transaction_date
ORDER BY transaction_date DESC;

-- 상품별 총 재고 집계
CREATE VIEW product_stock_summary AS
SELECT
  p.id as product_id,
  p.product_code,
  p.name,
  p.safety_stock,
  COALESCE(SUM(ps.normal_stock), 0) as total_normal_stock,
  COALESCE(SUM(ps.pending_shortage_stock), 0) as total_pending_shortage_stock
FROM products p
LEFT JOIN product_stock ps ON p.id = ps.product_id
WHERE p.is_active = true
GROUP BY p.id, p.product_code, p.name, p.safety_stock;

-- ========================================
-- 15. 자동 audit log 트리거 함수
-- ========================================
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 주요 테이블에 audit 트리거 적용
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_product_stock AFTER INSERT OR UPDATE OR DELETE ON product_stock
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_inventory_transactions AFTER INSERT OR UPDATE OR DELETE ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_partners AFTER INSERT OR UPDATE OR DELETE ON partners
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ========================================
-- 16. updated_at 자동 갱신 트리거
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_product_stock BEFORE UPDATE ON product_stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- 17. 입출고 시 재고 자동 갱신 트리거
-- ========================================
CREATE OR REPLACE FUNCTION update_stock_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_type = 'normal' THEN
    IF NEW.type = 'in' THEN
      INSERT INTO product_stock (product_id, option_id, location_id, normal_stock)
      VALUES (NEW.product_id, NEW.option_id, NEW.location_id, NEW.quantity)
      ON CONFLICT (product_id, option_id, location_id)
      DO UPDATE SET normal_stock = product_stock.normal_stock + NEW.quantity;
    ELSE
      UPDATE product_stock
      SET normal_stock = normal_stock - NEW.quantity
      WHERE product_id = NEW.product_id
        AND (option_id = NEW.option_id OR (option_id IS NULL AND NEW.option_id IS NULL))
        AND location_id = NEW.location_id;
    END IF;
  ELSE -- pending_shortage
    IF NEW.type = 'in' THEN
      INSERT INTO product_stock (product_id, option_id, location_id, pending_shortage_stock)
      VALUES (NEW.product_id, NEW.option_id, NEW.location_id, NEW.quantity)
      ON CONFLICT (product_id, option_id, location_id)
      DO UPDATE SET pending_shortage_stock = product_stock.pending_shortage_stock + NEW.quantity;
    ELSE
      UPDATE product_stock
      SET pending_shortage_stock = pending_shortage_stock - NEW.quantity
      WHERE product_id = NEW.product_id
        AND (option_id = NEW.option_id OR (option_id IS NULL AND NEW.option_id IS NULL))
        AND location_id = NEW.location_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER stock_update_on_transaction AFTER INSERT ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_transaction();
