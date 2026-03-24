# 웹 기반 재고관리 시스템 설계 문서

> 작성일: 2026-03-23

---

## 1. 프로젝트 개요

### 목적
이지어드민(EasyAdmin) 기반으로 관리하던 재고를 웹 기반 시스템으로 전환하여,
10~20명의 사용자가 외부에서 쉽게 접근하고 역할별로 권한을 분리하여 운영한다.

### 핵심 요구사항
- 7단계 기능: 대시보드, 상품관리, 거래처관리, 입출고관리, 매입/매출 내역, 시스템관리, 통합보고서
- 이지어드민 .xls 파일을 통한 초기 데이터 이관 및 대량 등록
- 역할별 권한 분리 (admin, manager, staff)
- 관리자가 커스텀 필드(헤더)를 추가할 수 있는 유연한 구조

---

## 2. 기술 스택

| 영역 | 기술 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 14 (App Router) | 프론트+API 통합, SSR 지원 |
| 스타일링 | Tailwind CSS + shadcn/ui | 빠른 UI 개발, 일관된 디자인 |
| DB / 인증 | Supabase (PostgreSQL) | RLS 권한제어, Auth 내장 |
| 차트 | Recharts | React 네이티브, 커스터마이징 용이 |
| 엑셀 처리 | SheetJS (xlsx) | .xls/.xlsx 파싱 + 내보내기 |
| PDF 생성 | @react-pdf/renderer | 보고서/다운로드용 |
| 배포 | Vercel | git push 자동 배포, 무료 |

---

## 3. 프로젝트 구조

```
inventory-management/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx            # 사이드바 + 헤더 공통 레이아웃
│   │   ├── page.tsx              # 1단계: 대시보드
│   │   ├── products/             # 2단계: 상품 관리
│   │   ├── partners/             # 3단계: 거래처 관리
│   │   ├── inventory/            # 4단계: 입출고 관리
│   │   ├── finance/              # 5단계: 매입/매출 내역
│   │   ├── audit/                # 6단계: 사용 이력
│   │   ├── settings/             # 6단계: 환경 설정
│   │   └── reports/              # 7단계: 통합 보고서
│   ├── api/
│   │   ├── products/
│   │   ├── partners/
│   │   ├── inventory/
│   │   ├── finance/
│   │   ├── upload/
│   │   └── reports/
│   └── layout.tsx
├── components/
│   ├── ui/                       # shadcn/ui 컴포넌트
│   ├── charts/                   # 차트 컴포넌트
│   ├── tables/                   # 데이터 테이블
│   └── forms/                    # 폼 컴포넌트
├── lib/
│   ├── supabase/
│   ├── utils.ts
│   └── constants.ts
├── types/
└── public/
```

---

## 4. 사용자 역할 및 권한

| 역할 | 대시보드 | 상품관리 | 거래처 | 입출고 | 매입매출 | 설정 | 보고서 |
|---|---|---|---|---|---|---|---|
| admin | 전체 | 등록/수정/삭제 | 전체 | 전체 | 전체 | 전체 | 전체 |
| manager | 전체 | 등록/수정 | 조회 | 전체 | 전체 | 불가 | 전체 |
| staff | 조회만 | 조회만 | 조회만 | 등록만 | 불가 | 불가 | 불가 |

---

## 5. 데이터베이스 스키마

### 5.1 users (사용자)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | Supabase Auth 연동 |
| email | varchar | 로그인 이메일 |
| name | varchar | 이름 |
| role | enum('admin','manager','staff') | 역할 |
| is_active | boolean | 활성 여부 |
| created_at | timestamp | 등록일 |

### 5.2 categories (카테고리 - 계층 구조)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| name | varchar | 카테고리명 |
| parent_id | uuid (FK→self) | 상위 카테고리 (NULL=최상위) |
| depth | int | 계층 깊이 |
| sort_order | int | 정렬 순서 |

### 5.3 products (상품 마스터)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| product_code | varchar (unique) | 이지어드민 상품코드 |
| name | varchar | 상품명 |
| category_id | uuid (FK) | 카테고리 |
| unit | varchar | 단위 (개, 박스, kg 등) |
| safety_stock | int | 안전 재고 수량 |
| purchase_price | decimal | 기본 매입단가 |
| selling_price | decimal | 기본 매출단가 |
| is_active | boolean | 활성 여부 |
| created_at | timestamp | |
| updated_at | timestamp | |

### 5.4 product_options (상품 옵션)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| product_id | uuid (FK) | 상품 |
| option_name | varchar | 이지어드민 옵션명 |
| sku | varchar (unique) | 옵션별 고유코드 |
| safety_stock | int | 옵션별 안전재고 (NULL이면 상품 기본값) |
| is_active | boolean | |

### 5.5 storage_locations (보관 위치)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| name | varchar | 위치명 |
| description | text | 설명 |
| sort_order | int | |

### 5.6 product_stock (위치별 재고 현황)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| product_id | uuid (FK) | 상품 |
| option_id | uuid (FK, nullable) | 옵션 |
| location_id | uuid (FK) | 보관 위치 |
| normal_stock | int | 정상재고 |
| pending_shortage_stock | int | 작업대기부속부족 |
| updated_at | timestamp | |
| unique constraint | | (product_id, option_id, location_id) |

### 5.7 partners (거래처)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| name | varchar | 거래처명 |
| type | enum('supplier','customer','both') | 유형 |
| contact_name | varchar | 담당자명 |
| phone | varchar | 연락처 |
| email | varchar | 이메일 |
| address | text | 주소 |
| notes | text | 비고 |
| is_active | boolean | |
| created_at | timestamp | |

### 5.8 inventory_transactions (입출고 내역)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| transaction_date | date | 입출고 일자 |
| type | enum('in','out') | 입고=매입, 출고=매출 |
| product_id | uuid (FK) | 상품 |
| option_id | uuid (FK, nullable) | 옵션 |
| location_id | uuid (FK) | 보관 위치 |
| partner_id | uuid (FK) | 거래처 |
| quantity | int | 수량 |
| unit_price | decimal | 단가 |
| total_price | decimal (generated) | 수량 x 단가 자동계산 |
| stock_type | enum('normal','pending_shortage') | 재고유형 |
| notes | text | 비고 |
| created_by | uuid (FK→users) | 등록자 |
| created_at | timestamp | |

### 5.9 audit_logs (변경 이력)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| table_name | varchar | 변경된 테이블명 |
| record_id | uuid | 변경된 레코드 ID |
| action | enum('INSERT','UPDATE','DELETE') | 작업 유형 |
| old_values | jsonb | 변경 전 값 |
| new_values | jsonb | 변경 후 값 |
| changed_by | uuid (FK→users) | 변경한 사용자 |
| changed_at | timestamp | |

### 5.10 settings (시스템 설정)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| key | varchar (unique) | 설정 키 |
| value | jsonb | 설정 값 |
| description | text | 설명 |
| updated_by | uuid (FK) | |
| updated_at | timestamp | |

기본 설정: `default_safety_stock`, `stale_stock_days`, `units`

### 5.11 custom_fields (커스텀 필드 정의)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| target_table | enum('products','partners') | 대상 테이블 |
| field_name | varchar | 필드명 |
| field_type | enum('text','number','date','select') | 타입 |
| select_options | jsonb | 선택지 목록 |
| is_required | boolean | 필수 여부 |
| sort_order | int | 표시 순서 |
| created_by | uuid (FK) | |
| created_at | timestamp | |

### 5.12 custom_field_values (커스텀 필드 값)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| field_id | uuid (FK→custom_fields) | 필드 |
| record_id | uuid | 대상 레코드 ID |
| value | text | 저장된 값 |

### DB 뷰

```sql
-- 매입/매출 일별 집계
CREATE VIEW daily_finance_summary AS
SELECT
  transaction_date,
  SUM(CASE WHEN type='in' THEN total_price ELSE 0 END) as purchase_total,
  SUM(CASE WHEN type='out' THEN total_price ELSE 0 END) as sales_total,
  SUM(CASE WHEN type='out' THEN total_price ELSE 0 END) -
  SUM(CASE WHEN type='in' THEN total_price ELSE 0 END) as margin
FROM inventory_transactions
GROUP BY transaction_date;

-- 악성재고 (설정 기간 이상 출고 없는 상품)
CREATE VIEW stale_stock AS
SELECT p.*, ps.normal_stock,
  MAX(it.transaction_date) as last_out_date
FROM products p
JOIN product_stock ps ON p.id = ps.product_id
LEFT JOIN inventory_transactions it
  ON p.id = it.product_id AND it.type = 'out'
GROUP BY p.id, ps.normal_stock
HAVING MAX(it.transaction_date) < NOW() - INTERVAL '...'
   OR MAX(it.transaction_date) IS NULL;
```

---

## 6. 이지어드민 데이터 매핑

| 이지어드민 컬럼 | 시스템 매핑 |
|---|---|
| 상품코드 | products.product_code |
| 상품명 | products.name |
| 옵션명 | product_options.option_name |
| 정상재고 | product_stock.normal_stock |
| 작업대기부속부족 | product_stock.pending_shortage_stock |

.xls 파일 업로드 시 SheetJS로 파싱하여 자동 매핑 처리.

---

## 7. 페이지별 화면 구성

### 공통 레이아웃
- 좌측 사이드바: 네비게이션 메뉴 (역할별 메뉴 필터링)
- 상단 헤더: 검색바, 재고부족 알림 벨, 사용자 프로필

### 1단계: 대시보드
- 요약 카드 4개: 전체 상품 수, 재고 부족 수, 총 매입액, 총 매출액
- 차트 2개: 입출고 수량 추이 (꺾은선), 매입/매출 현황 추이 (막대)
- 주별/월별/연도별 토글
- 안전 재고 알림 테이블 (안전재고 미만 상품 목록)
- 악성 재고 테이블 (설정 기간 이상 출고 없는 상품)

### 2단계: 상품 관리
- 상품 목록 테이블 (검색, 카테고리/위치/상태 필터)
- 안전재고 미만 시 수량 빨간색 강조
- 상품 등록/수정 모달 (옵션 동적 추가, 커스텀 필드 포함)
- 엑셀 업로드 (.xls/.xlsx) 및 다운로드, PDF 다운로드

### 3단계: 거래처 관리
- 거래처 목록 테이블 (유형별 필터)
- 등록/수정 모달
- 입출고 페이지에서 드롭다운으로 연동

### 4단계: 입출고 관리
- 입출고 내역 테이블 (기간, 유형, 상품, 거래처 필터)
- 입고/출고 등록 모달 (상품 선택 시 옵션 자동 필터)
- 입고→매입, 출고→매출 자동 연동

### 5단계: 매입/매출 내역
- 3개 탭: 일별 집계, 매입 누계 순위, 마진율
- 기간 필터
- 엑셀/PDF 다운로드

### 6단계: 사용 이력 & 환경 설정
- 사용 이력: 전체 변경 로그 테이블 (시간, 사용자, 작업, 변경내용)
- 환경 설정: 카테고리 계층 관리, 단위 관리, 보관 위치, 재고 기준, 커스텀 필드 관리

### 7단계: 통합 보고서
- 기간 선택 + 포함 항목 체크박스
- 미리보기 + PDF 다운로드

---

## 8. 배포 및 인프라

| 항목 | 내용 |
|---|---|
| 호스팅 | Vercel (무료 플랜) |
| DB | Supabase (무료: 500MB, 10~20명 충분) |
| 도메인 | Vercel 기본 도메인 또는 커스텀 도메인 |
| CI/CD | git push → Vercel 자동 배포 |
| 백업 | Supabase 자동 백업 (7일) |
