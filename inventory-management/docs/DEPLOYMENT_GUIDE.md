# 재고관리 시스템 배포 가이드 (초보자용)

이 문서는 Supabase + Vercel을 사용하여 재고관리 시스템을 배포하는 전체 과정을 설명합니다.

---

## 전체 순서

1. Supabase 프로젝트 생성
2. DB 테이블 생성 (SQL 실행)
3. 첫 번째 관리자 계정 생성
4. 프로젝트에 Supabase 키 설정
5. Vercel 배포
6. 배포 확인 및 로그인 테스트

---

## Step 1: Supabase 프로젝트 생성

1. **https://supabase.com** 에 접속
2. **Sign Up** 또는 **Sign In** (GitHub 계정으로 로그인 가능)
3. 대시보드에서 **"New Project"** 버튼 클릭
4. 아래 항목을 입력:
   - **Organization**: 기본값 사용 (처음이면 자동 생성됨)
   - **Name**: `inventory-management`
   - **Database Password**: 안전한 비밀번호 입력 (**반드시 메모!**)
   - **Region**: `Northeast Asia (Tokyo)` 선택
5. **"Create new project"** 클릭
6. **2~3분 기다리면** 프로젝트가 생성됩니다

### Supabase 키 확인하기

프로젝트 생성 후:
1. 왼쪽 메뉴에서 **⚙️ Settings** (톱니바퀴) 클릭
2. **API** 메뉴 클릭
3. 아래 두 가지를 메모:
   - **Project URL**: `https://xxxxxxxx.supabase.co` 형태
   - **anon / public** 키: `eyJhbGciOiJIUzI1NiIs...` 형태의 긴 문자열

---

## Step 2: DB 테이블 생성

1. Supabase 대시보드 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **"New query"** 클릭
3. `supabase/migrations/001_initial_schema.sql` 파일의 **전체 내용**을 복사하여 붙여넣기
4. **"Run"** 버튼 클릭
5. "Success. No rows returned" 메시지가 나오면 성공!

> 만약 에러가 나면: 이미 실행한 적이 있다면 테이블이 이미 존재할 수 있습니다.
> 그 경우 SQL Editor에서 `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` 실행 후 다시 시도하세요.

---

## Step 3: 첫 번째 관리자 계정 생성

### 3-1. Supabase Authentication에서 사용자 생성

1. 왼쪽 메뉴에서 **Authentication** 클릭
2. **"Add user"** → **"Create new user"** 클릭
3. 이메일과 비밀번호 입력 (예: `admin@company.com` / `Admin1234!`)
4. **"Auto Confirm User"** 체크박스 ON
5. **"Create user"** 클릭
6. 생성된 사용자의 **User UID**를 복사 (목록에서 클릭하면 보임)

### 3-2. users 테이블에 관리자로 등록

1. **SQL Editor**에서 새 쿼리 실행:

```sql
INSERT INTO users (id, email, name, role)
VALUES (
  '여기에-복사한-User-UID-붙여넣기',
  'admin@company.com',
  '관리자',
  'admin'
);
```

> **중요**: `id` 값은 Step 3-1에서 복사한 User UID를 정확히 붙여넣어야 합니다!

---

## Step 4: 프로젝트에 Supabase 키 설정

### 로컬 개발용 (.env.local)

프로젝트 루트의 `inventory-management/.env.local` 파일을 수정:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...여기에-anon-키-붙여넣기
```

### 로컬에서 테스트

```bash
cd inventory-management
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → 로그인 페이지에서 Step 3에서 만든 계정으로 로그인

---

## Step 5: Vercel 배포

### 방법 A: Vercel 웹사이트에서 배포 (추천 - 가장 쉬움)

1. **https://vercel.com** 접속 → GitHub 계정으로 로그인
2. **"Add New..."** → **"Project"** 클릭
3. **"Import Git Repository"** 에서 `inventory-management-system` 저장소 선택
4. 설정 화면에서:
   - **Framework Preset**: `Next.js` (자동 감지됨)
   - **Root Directory**: `inventory-management` 입력 (**중요!**)
   - **Environment Variables** 에 아래 두 개 추가:
     | Key | Value |
     |-----|-------|
     | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxxxxx.supabase.co` |
     | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1Ni...` |
5. **"Deploy"** 클릭
6. 2~3분 후 배포 완료 → `https://your-project.vercel.app` URL 확인

### 방법 B: Vercel CLI로 배포

```bash
# 1. Vercel CLI 설치
npm install -g vercel

# 2. 프로젝트 폴더로 이동
cd inventory-management

# 3. Vercel에 로그인
vercel login

# 4. 배포 (첫 배포 시 설정 질문에 답변)
vercel

# 질문에 대한 답변:
# - Set up and deploy? → Y
# - Which scope? → 본인 계정 선택
# - Link to existing project? → N
# - Project name? → inventory-management (엔터)
# - Directory? → ./ (엔터)
# - Override settings? → N

# 5. 환경변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
# → Production, Preview, Development 모두 선택 → 값 입력

vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# → Production, Preview, Development 모두 선택 → 값 입력

# 6. 환경변수 적용하여 재배포
vercel --prod
```

---

## Step 6: 배포 확인

1. Vercel에서 제공한 URL (예: `https://inventory-management-xxxxx.vercel.app`)로 접속
2. 로그인 페이지가 나타나면 성공!
3. Step 3에서 만든 관리자 계정으로 로그인
4. 대시보드가 정상적으로 표시되는지 확인

---

## Step 7: Supabase에서 Vercel URL 허용 (중요!)

Supabase 인증이 정상 작동하려면 배포된 URL을 허용해야 합니다:

1. Supabase 대시보드 → **⚙️ Settings** → **Authentication**
2. **Site URL**을 Vercel 배포 URL로 변경:
   ```
   https://your-project.vercel.app
   ```
3. **Redirect URLs**에 아래 추가:
   ```
   https://your-project.vercel.app/**
   ```
4. **Save** 클릭

---

## 추가 사용자 등록 방법

관리자가 로그인한 후 추가 사용자를 등록하려면:

1. Supabase Authentication에서 사용자 생성 (Step 3-1과 동일)
2. SQL Editor에서 users 테이블에 추가:

```sql
INSERT INTO users (id, email, name, role)
VALUES (
  '새-사용자-UID',
  'user@company.com',
  '홍길동',
  'staff'  -- 'admin', 'manager', 'staff' 중 선택
);
```

---

## 트러블슈팅

### "Invalid API key" 에러
→ Vercel 환경변수의 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 값을 다시 확인하세요.

### 로그인 후 아무것도 안 보임
→ users 테이블에 해당 사용자가 등록되어 있는지 확인하세요.

### "Network Error" 또는 CORS 에러
→ Supabase Settings > Authentication > Site URL이 Vercel URL과 일치하는지 확인하세요.

### SQL 실행 시 "permission denied"
→ SQL Editor에서 실행하되, 상단에서 "postgres" 역할이 선택되어 있는지 확인하세요.

### 빌드 실패
→ Vercel 설정에서 **Root Directory**가 `inventory-management`로 설정되어 있는지 확인하세요.
