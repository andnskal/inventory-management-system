# 재고관리 시스템 구현 계획서

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Next.js + Supabase 기반의 웹 재고관리 시스템을 7단계로 나누어 구현한다.

**Architecture:** Next.js 14 App Router로 프론트엔드+API를 통합하고, Supabase(PostgreSQL)를 DB/인증으로 사용한다. Supabase RLS로 역할별 권한을 DB 레벨에서 제어하며, Vercel로 배포한다.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Supabase (@supabase/ssr), Recharts, SheetJS (xlsx), @react-pdf/renderer

---

## Phase 0: 프로젝트 초기 설정

### Task 0-1: Next.js 프로젝트 생성

**Files:**
- Create: `inventory-management/` (프로젝트 루트)

**Step 1: Next.js 프로젝트 생성**

```bash
npx create-next-app@latest inventory-management --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

**Step 2: 프로젝트 디렉토리로 이동 후 동작 확인**

Run: `cd inventory-management && npm run dev`
Expected: http://localhost:3000 에서 Next.js 기본 페이지 확인

**Step 3: 커밋**

```bash
git add .
git commit -m "chore: Next.js 프로젝트 초기 생성"
```

---

### Task 0-2: shadcn/ui 초기화 및 핵심 컴포넌트 설치

**Files:**
- Create: `components/ui/` (자동 생성)
- Create: `components.json`
- Modify: `app/globals.css`

**Step 1: shadcn/ui 초기화**

```bash
npx shadcn@latest init -t next
```

프롬프트 답변:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

**Step 2: 핵심 UI 컴포넌트 설치**

```bash
npx shadcn@latest add button card input label select table dialog dropdown-menu tabs badge separator sheet avatar command toast sonner
```

**Step 3: 설치 확인**

Run: `ls components/ui/`
Expected: button.tsx, card.tsx, input.tsx 등 파일 존재

**Step 4: 커밋**

```bash
git add .
git commit -m "chore: shadcn/ui 초기화 및 핵심 컴포넌트 설치"
```

---

### Task 0-3: Supabase 프로젝트 연결 및 클라이언트 설정

**Files:**
- Create: `.env.local`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`

**Step 1: 핵심 패키지 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Step 2: 환경 변수 파일 생성**

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

> 사용자에게 Supabase 프로젝트 생성 후 URL과 anon key를 입력하도록 안내

**Step 3: 브라우저 클라이언트 생성**

`lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

**Step 4: 서버 클라이언트 생성**

`lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출 시 무시
          }
        },
      },
    }
  )
}
```

**Step 5: 미들웨어 유틸리티 생성**

`lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

**Step 6: Next.js 미들웨어 생성**

`middleware.ts` (프로젝트 루트):
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Step 7: 커밋**

```bash
git add lib/supabase/ middleware.ts .env.local
git commit -m "chore: Supabase 클라이언트 및 미들웨어 설정"
```

---

### Task 0-4: Supabase DB 스키마 생성 (SQL 마이그레이션)

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: SQL 마이그레이션 파일 작성**

`supabase/migrations/001_initial_schema.sql`:
```sql
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
```

**Step 2: Supabase 대시보드에서 SQL 실행**

Supabase 대시보드 → SQL Editor → 위 SQL 전체 붙여넣기 → Run

Expected: 모든 테이블, 뷰, 트리거가 생성됨

**Step 3: 커밋**

```bash
git add supabase/
git commit -m "feat: DB 스키마 초기 마이그레이션 SQL 작성"
```

---

### Task 0-5: TypeScript 타입 정의

**Files:**
- Create: `types/database.ts`
- Create: `types/index.ts`

**Step 1: DB 타입 정의**

`types/database.ts`:
```typescript
export type UserRole = 'admin' | 'manager' | 'staff'
export type PartnerType = 'supplier' | 'customer' | 'both'
export type TransactionType = 'in' | 'out'
export type StockType = 'normal' | 'pending_shortage'
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'
export type CustomFieldType = 'text' | 'number' | 'date' | 'select'
export type CustomFieldTarget = 'products' | 'partners'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  parent_id: string | null
  depth: number
  sort_order: number
  children?: Category[]
}

export interface Product {
  id: string
  product_code: string
  name: string
  category_id: string | null
  unit: string
  safety_stock: number
  purchase_price: number
  selling_price: number
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  category?: Category
  options?: ProductOption[]
  stock?: ProductStock[]
  custom_field_values?: CustomFieldValue[]
}

export interface ProductOption {
  id: string
  product_id: string
  option_name: string
  sku: string | null
  safety_stock: number | null
  is_active: boolean
}

export interface StorageLocation {
  id: string
  name: string
  description: string | null
  sort_order: number
}

export interface ProductStock {
  id: string
  product_id: string
  option_id: string | null
  location_id: string
  normal_stock: number
  pending_shortage_stock: number
  updated_at: string
  // joined
  location?: StorageLocation
  option?: ProductOption
}

export interface Partner {
  id: string
  name: string
  type: PartnerType
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface InventoryTransaction {
  id: string
  transaction_date: string
  type: TransactionType
  product_id: string
  option_id: string | null
  location_id: string
  partner_id: string
  quantity: number
  unit_price: number
  total_price: number
  stock_type: StockType
  notes: string | null
  created_by: string
  created_at: string
  // joined
  product?: Product
  option?: ProductOption
  location?: StorageLocation
  partner?: Partner
  creator?: User
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: AuditAction
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  changed_by: string | null
  changed_at: string
  // joined
  user?: User
}

export interface Setting {
  id: string
  key: string
  value: unknown
  description: string | null
  updated_by: string | null
  updated_at: string
}

export interface CustomField {
  id: string
  target_table: CustomFieldTarget
  field_name: string
  field_type: CustomFieldType
  select_options: string[] | null
  is_required: boolean
  sort_order: number
  created_by: string | null
  created_at: string
}

export interface CustomFieldValue {
  id: string
  field_id: string
  record_id: string
  value: string | null
  // joined
  field?: CustomField
}

// 뷰 타입
export interface DailyFinanceSummary {
  transaction_date: string
  purchase_total: number
  sales_total: number
  margin: number
}

export interface ProductStockSummary {
  product_id: string
  product_code: string
  name: string
  safety_stock: number
  total_normal_stock: number
  total_pending_shortage_stock: number
}
```

**Step 2: 인덱스 파일**

`types/index.ts`:
```typescript
export * from './database'
```

**Step 3: 커밋**

```bash
git add types/
git commit -m "feat: TypeScript 타입 정의"
```

---

### Task 0-6: 공통 레이아웃 구성 (사이드바 + 헤더)

**Files:**
- Create: `components/layout/sidebar.tsx`
- Create: `components/layout/header.tsx`
- Create: `components/layout/sidebar-nav.tsx`
- Create: `app/(dashboard)/layout.tsx`
- Modify: `app/layout.tsx`

**Step 1: 추가 패키지 설치**

```bash
npm install lucide-react
```

**Step 2: 사이드바 네비게이션 데이터**

`lib/constants.ts`:
```typescript
import {
  LayoutDashboard,
  Package,
  Building2,
  ArrowLeftRight,
  DollarSign,
  ClipboardList,
  Settings,
  FileText,
} from 'lucide-react'

export const NAV_ITEMS = [
  { title: '대시보드', href: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'staff'] },
  { title: '상품 관리', href: '/products', icon: Package, roles: ['admin', 'manager', 'staff'] },
  { title: '거래처 관리', href: '/partners', icon: Building2, roles: ['admin', 'manager', 'staff'] },
  { title: '입출고 관리', href: '/inventory', icon: ArrowLeftRight, roles: ['admin', 'manager', 'staff'] },
  { title: '매입/매출', href: '/finance', icon: DollarSign, roles: ['admin', 'manager'] },
  { title: '사용 이력', href: '/audit', icon: ClipboardList, roles: ['admin'] },
  { title: '환경 설정', href: '/settings', icon: Settings, roles: ['admin'] },
  { title: '통합 보고서', href: '/reports', icon: FileText, roles: ['admin', 'manager'] },
] as const
```

**Step 3: 사이드바 컴포넌트 작성**

`components/layout/sidebar.tsx`:
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import type { UserRole } from '@/types'

interface SidebarProps {
  userRole: UserRole
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  )

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Package className="h-6 w-6" />
          <span>재고관리</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

**Step 4: 헤더 컴포넌트 작성**

`components/layout/header.tsx`:
```typescript
'use client'

import { Bell, LogOut, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'

interface HeaderProps {
  user: User
  lowStockCount?: number
}

export function Header({ user, lowStockCount = 0 }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div />
      <div className="flex items-center gap-4">
        {lowStockCount > 0 && (
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {lowStockCount}
            </Badge>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <UserIcon className="h-4 w-4" />
              <span className="text-sm">{user.name}</span>
              <Badge variant="outline" className="text-xs">
                {user.role}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
```

**Step 5: 대시보드 레이아웃**

`app/(dashboard)/layout.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import type { User } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // 재고 부족 상품 수 조회
  const { count: lowStockCount } = await supabase
    .from('product_stock_summary')
    .select('*', { count: 'exact', head: true })
    .lt('total_normal_stock', supabase.rpc ? 0 : 0) // 이후 safety_stock 비교로 개선

  return (
    <div className="flex h-screen">
      <Sidebar userRole={profile.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={profile as User} lowStockCount={lowStockCount ?? 0} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**Step 6: 커밋**

```bash
git add components/layout/ app/(dashboard)/ lib/constants.ts
git commit -m "feat: 공통 레이아웃 (사이드바 + 헤더) 구현"
```

---

## Phase 1: 인증 (로그인/회원가입)

### Task 1-1: 로그인 페이지 구현

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/layout.tsx`

**Step 1: 인증 레이아웃**

`app/(auth)/layout.tsx`:
```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      {children}
    </div>
  )
}
```

**Step 2: 로그인 페이지**

`app/(auth)/login/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error('로그인 실패: ' + error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">재고관리 시스템</CardTitle>
        <CardDescription>로그인하여 시작하세요</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 3: 커밋**

```bash
git add app/(auth)/
git commit -m "feat: 로그인 페이지 구현"
```

---

## Phase 2: 대시보드 (1단계)

### Task 2-1: 대시보드 요약 카드

**Files:**
- Create: `app/(dashboard)/page.tsx`
- Create: `components/dashboard/summary-cards.tsx`

**Step 1: 요약 카드 컴포넌트**

`components/dashboard/summary-cards.tsx`:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'

interface SummaryCardsProps {
  totalProducts: number
  lowStockCount: number
  totalPurchase: number
  totalSales: number
}

export function SummaryCards({
  totalProducts,
  lowStockCount,
  totalPurchase,
  totalSales,
}: SummaryCardsProps) {
  const cards = [
    {
      title: '전체 상품',
      value: `${totalProducts.toLocaleString()}개`,
      icon: Package,
      color: 'text-blue-600',
    },
    {
      title: '재고 부족',
      value: `${lowStockCount.toLocaleString()}개`,
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      title: '총 매입액',
      value: `₩${totalPurchase.toLocaleString()}`,
      icon: TrendingDown,
      color: 'text-orange-600',
    },
    {
      title: '총 매출액',
      value: `₩${totalSales.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-green-600',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

**Step 2: 대시보드 페이지**

`app/(dashboard)/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { SummaryCards } from '@/components/dashboard/summary-cards'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 전체 상품 수
  const { count: totalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // 재고 부족 상품 수 (RPC 또는 직접 쿼리)
  const { data: stockData } = await supabase
    .from('product_stock_summary')
    .select('*')

  const lowStockCount = stockData?.filter(
    (item) => item.total_normal_stock < item.safety_stock
  ).length ?? 0

  // 이번 달 매입/매출 합계
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  const monthStart = startOfMonth.toISOString().split('T')[0]

  const { data: financeData } = await supabase
    .from('daily_finance_summary')
    .select('*')
    .gte('transaction_date', monthStart)

  const totalPurchase = financeData?.reduce((sum, d) => sum + Number(d.purchase_total), 0) ?? 0
  const totalSales = financeData?.reduce((sum, d) => sum + Number(d.sales_total), 0) ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">대시보드</h1>
      <SummaryCards
        totalProducts={totalProducts ?? 0}
        lowStockCount={lowStockCount}
        totalPurchase={totalPurchase}
        totalSales={totalSales}
      />
      {/* 차트, 안전재고 알림, 악성재고 목록은 후속 Task에서 추가 */}
    </div>
  )
}
```

**Step 3: 커밋**

```bash
git add app/(dashboard)/page.tsx components/dashboard/
git commit -m "feat: 대시보드 요약 카드 구현"
```

---

### Task 2-2: 대시보드 차트 (입출고 추이 + 매입/매출 추이)

**Files:**
- Create: `components/dashboard/inventory-trend-chart.tsx`
- Create: `components/dashboard/finance-trend-chart.tsx`
- Modify: `app/(dashboard)/page.tsx`

**Step 1: Recharts 설치**

```bash
npm install recharts
```

**Step 2: 입출고 수량 추이 차트 컴포넌트**

`components/dashboard/inventory-trend-chart.tsx`:
```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface TrendData {
  date: string
  in_qty: number
  out_qty: number
}

interface InventoryTrendChartProps {
  data: TrendData[]
}

export function InventoryTrendChart({ data }: InventoryTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">입출고 수량 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="in_qty" stroke="#3b82f6" name="입고" />
            <Line type="monotone" dataKey="out_qty" stroke="#ef4444" name="출고" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

**Step 3: 매입/매출 현황 추이 차트 컴포넌트**

`components/dashboard/finance-trend-chart.tsx`:
```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface FinanceData {
  date: string
  purchase: number
  sales: number
}

interface FinanceTrendChartProps {
  data: FinanceData[]
}

export function FinanceTrendChart({ data }: FinanceTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">매입/매출 현황 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v) => `₩${(v / 10000).toFixed(0)}만`} />
            <Tooltip formatter={(value: number) => `₩${value.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="purchase" fill="#f97316" name="매입" />
            <Bar dataKey="sales" fill="#22c55e" name="매출" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

**Step 4: 대시보드 페이지에 차트 추가 (page.tsx 수정)**

차트 데이터 쿼리 및 컴포넌트를 대시보드 페이지에 통합

**Step 5: 커밋**

```bash
git add components/dashboard/ app/(dashboard)/page.tsx
git commit -m "feat: 대시보드 입출고/매입매출 추이 차트 구현"
```

---

### Task 2-3: 대시보드 안전재고 알림 + 악성재고 테이블

**Files:**
- Create: `components/dashboard/low-stock-table.tsx`
- Create: `components/dashboard/stale-stock-table.tsx`
- Modify: `app/(dashboard)/page.tsx`

**Step 1~3:** 안전재고 미만 상품 목록 테이블, 악성재고 목록 테이블 구현 후 대시보드에 통합

**Step 4: 커밋**

```bash
git add components/dashboard/ app/(dashboard)/page.tsx
git commit -m "feat: 대시보드 안전재고 알림 및 악성재고 테이블 구현"
```

---

## Phase 3: 상품 관리 (2단계)

### Task 3-1: 상품 목록 페이지

**Files:**
- Create: `app/(dashboard)/products/page.tsx`
- Create: `components/products/product-table.tsx`
- Create: `components/products/product-filters.tsx`

안전재고 미만 시 빨간색 강조, 검색/필터 기능 포함

### Task 3-2: 상품 등록/수정 모달

**Files:**
- Create: `components/products/product-form-dialog.tsx`
- Create: `app/api/products/route.ts`

상품 등록 폼 (상품코드, 상품명, 카테고리, 단위, 안전재고, 단가, 옵션 동적 추가, 커스텀 필드)

### Task 3-3: 엑셀 업로드/다운로드

**Files:**
- Create: `app/api/upload/products/route.ts`
- Create: `components/products/excel-upload-dialog.tsx`
- Create: `lib/excel.ts`

```bash
npm install xlsx
```

이지어드민 .xls 파일 파싱 → 상품코드/상품명/옵션명/정상재고/작업대기부속부족 매핑

---

## Phase 4: 거래처 관리 (3단계)

### Task 4-1: 거래처 목록 + CRUD

**Files:**
- Create: `app/(dashboard)/partners/page.tsx`
- Create: `components/partners/partner-table.tsx`
- Create: `components/partners/partner-form-dialog.tsx`
- Create: `app/api/partners/route.ts`

거래처 등록/수정/삭제, 유형별(매입/매출/양쪽) 필터

---

## Phase 5: 입출고 관리 (4단계)

### Task 5-1: 입출고 내역 목록 + 필터

**Files:**
- Create: `app/(dashboard)/inventory/page.tsx`
- Create: `components/inventory/transaction-table.tsx`
- Create: `components/inventory/transaction-filters.tsx`

기간, 유형, 상품, 거래처별 필터링

### Task 5-2: 입고/출고 등록 모달

**Files:**
- Create: `components/inventory/transaction-form-dialog.tsx`
- Create: `app/api/inventory/route.ts`

상품 선택 시 옵션 자동 필터, 거래처는 유형에 따라 필터 (입고→매입처, 출고→매출처)
등록 시 DB 트리거로 재고 자동 갱신

---

## Phase 6: 매입/매출 내역 (5단계)

### Task 6-1: 매입/매출 집계 페이지

**Files:**
- Create: `app/(dashboard)/finance/page.tsx`
- Create: `components/finance/daily-summary-table.tsx`
- Create: `components/finance/purchase-ranking.tsx`
- Create: `components/finance/margin-analysis.tsx`

3개 탭: 일별 집계, 매입 누계 순위, 마진율 분석
기간 필터, 엑셀/PDF 다운로드

---

## Phase 7: 시스템 관리 (6단계)

### Task 7-1: 사용 이력 페이지

**Files:**
- Create: `app/(dashboard)/audit/page.tsx`
- Create: `components/audit/audit-log-table.tsx`

audit_logs 테이블 데이터 조회, 변경 전/후 비교 표시

### Task 7-2: 환경 설정 페이지

**Files:**
- Create: `app/(dashboard)/settings/page.tsx`
- Create: `components/settings/category-manager.tsx`
- Create: `components/settings/unit-manager.tsx`
- Create: `components/settings/location-manager.tsx`
- Create: `components/settings/stock-settings.tsx`
- Create: `components/settings/custom-field-manager.tsx`

카테고리 계층 관리, 단위/위치 등록, 안전/악성 재고 기준 설정, 커스텀 필드 관리

---

## Phase 8: 통합 보고서 (7단계)

### Task 8-1: 보고서 생성 페이지

**Files:**
- Create: `app/(dashboard)/reports/page.tsx`
- Create: `components/reports/report-generator.tsx`
- Create: `components/reports/report-preview.tsx`
- Create: `app/api/reports/pdf/route.ts`

```bash
npm install @react-pdf/renderer
```

기간 선택 + 포함 항목 체크 → 미리보기 → PDF 다운로드

---

## Phase 9: 마무리

### Task 9-1: 반응형 디자인 점검

모바일/태블릿 대응 확인 및 수정

### Task 9-2: Vercel 배포

```bash
npm install -g vercel
vercel
```

Supabase 환경변수 Vercel 프로젝트에 설정
