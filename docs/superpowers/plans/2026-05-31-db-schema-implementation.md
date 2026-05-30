# DB 스키마 및 누락 기능 보완 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spec(`docs/superpowers/specs/2026-05-31-db-schema-design.md`)에 정의된 5개 MariaDB 테이블 생성, JWT 사용자 식별 연결, 체크리스트 진행도 토글 엔드포인트 추가.

**Architecture:** 단일 `db/schema.sql` + Node native `--env-file` 마이그레이션 러너, `src/lib/auth.ts` 헬퍼로 인증 통일, `PUT /api/checklist/[service_id]/progress` 신규 엔드포인트로 토글.

**Tech Stack:** Next.js 16, MariaDB 3.5.2, jsonwebtoken 9, Node 20.20 (`--env-file` 지원). 자동화 테스트 프레임워크 없음 → 검증은 명세된 수동 시나리오로 진행.

---

## Task 1: DB 스키마 파일 작성

**Files:**
- Create: `db/schema.sql`

- [ ] **Step 1: 디렉토리 생성 및 schema.sql 작성**

PowerShell에서:
```powershell
New-Item -ItemType Directory -Path db
```

`db/schema.sql` 내용 (Write 툴):

```sql
-- mijung_project DB 스키마 (idempotent)

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  provider VARCHAR(20) NOT NULL DEFAULT 'local',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_name VARCHAR(255) NOT NULL,
  eligibility TEXT NULL,
  application_steps TEXT NULL,
  official_link_method VARCHAR(500) NULL,
  online_method VARCHAR(500) NULL,
  INDEX idx_service_name (service_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_sources (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  raw_required_docs LONGTEXT NULL,
  raw_eligibility LONGTEXT NULL,
  raw_steps LONGTEXT NULL,
  CONSTRAINT fk_service_sources_service
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checklist_progress (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service_id INT NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_checklist_progress_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_checklist_progress_service
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_service_item (user_id, service_id, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS terms (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  term VARCHAR(255) NOT NULL UNIQUE,
  easy_explain TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **Step 2: 파일 작성 확인**

```powershell
Get-Content db/schema.sql | Select-Object -First 5
```

Expected: `-- mijung_project DB 스키마 (idempotent)`로 시작하는 5줄 출력.

- [ ] **Step 3: 커밋**

```powershell
git add db/schema.sql
git commit -m "db: add initial schema for users, services, service_sources, checklist_progress, terms"
```

---

## Task 2: 마이그레이션 러너 스크립트 작성

**Files:**
- Create: `scripts/db-init.mjs`

- [ ] **Step 1: scripts 디렉토리 생성**

```powershell
New-Item -ItemType Directory -Path scripts
```

- [ ] **Step 2: `scripts/db-init.mjs` 작성 (Write 툴)**

```javascript
import { readFileSync } from 'node:fs';
import mariadb from 'mariadb';

const sql = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf-8');

const conn = await mariadb.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

try {
  await conn.query(sql);
  console.log('✅ Schema applied successfully');
} catch (err) {
  console.error('❌ Migration failed:', err);
  process.exitCode = 1;
} finally {
  await conn.end();
}
```

**참고:** `.env.local`에 `DB_PORT`가 존재하므로 `port` 옵션을 추가함 (있으면 사용, 없으면 mariadb 기본).

- [ ] **Step 3: 파일 확인**

```powershell
Get-Content scripts/db-init.mjs | Select-Object -First 3
```

Expected: `import { readFileSync } from 'node:fs';`로 시작.

- [ ] **Step 4: 커밋**

```powershell
git add scripts/db-init.mjs
git commit -m "db: add migration runner script (scripts/db-init.mjs)"
```

---

## Task 3: package.json에 `db:init` 스크립트 추가

**Files:**
- Modify: `package.json:5-10` (scripts 블록)

- [ ] **Step 1: scripts 섹션에 db:init 추가**

Edit 툴로 `package.json` 수정:

**Before:**
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
```

**After:**
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:init": "node --env-file=.env.local scripts/db-init.mjs"
  },
```

- [ ] **Step 2: 변경 확인**

```powershell
Select-String -Path package.json -Pattern "db:init"
```

Expected: `"db:init": "node --env-file=.env.local scripts/db-init.mjs"` 라인 1개 매칭.

- [ ] **Step 3: 커밋**

```powershell
git add package.json
git commit -m "db: add npm db:init script"
```

---

## Task 4: 데이터베이스(스키마) 생성 + 마이그레이션 적용

**Files:** 없음 (DB 작업만)

**전제:** 사용자(또는 DB 관리자)가 `.env.local`에 설정된 `DB_NAME` 데이터베이스를 사전 생성해야 함. 이미 있으면 Step 1 건너뜀.

- [ ] **Step 1: 데이터베이스 존재 확인 (또는 생성)**

PowerShell에서 mariadb CLI를 사용하거나(MariaDB가 PATH에 있어야 함), HeidiSQL 등 GUI에서 실행:

```sql
CREATE DATABASE IF NOT EXISTS <.env.local의 DB_NAME 값>
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

만약 mariadb CLI 사용:
```powershell
mariadb -h <DB_HOST> -u <DB_USER> -p -e "CREATE DATABASE IF NOT EXISTS <DB_NAME> CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

**참고:** `<...>`는 실제 값으로 치환. 비밀번호는 프롬프트 입력.

- [ ] **Step 2: 마이그레이션 실행**

```powershell
npm run db:init
```

Expected output:
```
✅ Schema applied successfully
```

에러가 나면:
- `Unknown database` → Step 1 다시 수행 (DB 미생성)
- `Access denied` → `.env.local`의 자격증명 확인
- `connect ECONNREFUSED` → MariaDB 서비스 실행 중인지 확인

- [ ] **Step 3: 5개 테이블 생성 확인**

```powershell
npm run db:init
```

두 번째 실행해도 에러 없음을 확인 (idempotent 검증, spec §12.2 시나리오 2).

MariaDB CLI 또는 GUI에서:
```sql
USE <DB_NAME>;
SHOW TABLES;
```

Expected: 5개 테이블 출력
```
+--------------------+
| Tables_in_<DB_NAME> |
+--------------------+
| checklist_progress |
| service_sources    |
| services           |
| terms              |
| users              |
+--------------------+
```

- [ ] **Step 4: FK/UNIQUE 제약 확인**

```sql
SHOW CREATE TABLE checklist_progress;
```

Expected: `FOREIGN KEY ... REFERENCES users(id) ON DELETE CASCADE`, `FOREIGN KEY ... REFERENCES services(id) ON DELETE CASCADE`, `UNIQUE KEY uk_user_service_item` 세 줄 모두 포함.

- [ ] **Step 5: 커밋 (없음)**

이 태스크는 DB 작업만 — 커밋할 코드 변경 없음.

---

## Task 5: JWT 헬퍼 작성

**Files:**
- Create: `src/lib/auth.ts`

- [ ] **Step 1: `src/lib/auth.ts` 작성 (Write 툴)**

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_access_key";

export function getUserIdFromRequest(request: Request): number | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: number };
    return payload.userId;
  } catch {
    return null;
  }
}
```

**참고:** JWT_SECRET 폴백값은 기존 `src/app/api/auth/login/route.ts:7`과 동일하게 유지(둘 다 같은 값을 써야 검증 가능). `.env.local`에 `JWT_SECRET`을 추가하는 것이 권장되나 이번 태스크 범위 밖.

- [ ] **Step 2: 타입체크**

```powershell
npx tsc --noEmit
```

Expected: 에러 없음. 만약 `Cannot find module 'jsonwebtoken'` 에러 → `@types/jsonwebtoken`이 devDependencies에 있는지 확인(있음, package.json:28).

- [ ] **Step 3: 커밋**

```powershell
git add src/lib/auth.ts
git commit -m "auth: add JWT helper getUserIdFromRequest"
```

---

## Task 6: 진행도 토글 엔드포인트 작성 (PUT)

**Files:**
- Create: `src/app/api/checklist/[service_id]/progress/route.ts`

- [ ] **Step 1: 디렉토리 생성**

```powershell
New-Item -ItemType Directory -Path "src/app/api/checklist/[service_id]/progress"
```

- [ ] **Step 2: 라우트 파일 작성 (Write 툴)**

```typescript
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ service_id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "인증 필요" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const item_id = body?.item_id;
    const checked = body?.checked;

    if (typeof item_id !== 'string' || typeof checked !== 'boolean') {
      return NextResponse.json(
        { success: false, message: "잘못된 요청" },
        { status: 400 }
      );
    }

    const resolvedParams = await params;
    const serviceParam = decodeURIComponent(resolvedParams.service_id);

    const serviceRows = await executeQuery(
      'SELECT id FROM services WHERE id = ? OR service_name = ?',
      [serviceParam, serviceParam]
    );
    if (!serviceRows || serviceRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "서비스 없음" },
        { status: 404 }
      );
    }
    const realServiceId = serviceRows[0].id;

    if (checked) {
      await executeQuery(
        'INSERT IGNORE INTO checklist_progress (user_id, service_id, item_id) VALUES (?, ?, ?)',
        [userId, realServiceId, item_id]
      );
    } else {
      await executeQuery(
        'DELETE FROM checklist_progress WHERE user_id = ? AND service_id = ? AND item_id = ?',
        [userId, realServiceId, item_id]
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('진행도 토글 오류:', error);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: 타입체크**

```powershell
npx tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```powershell
git add "src/app/api/checklist/[service_id]/progress/route.ts"
git commit -m "feat(checklist): add PUT progress toggle endpoint"
```

---

## Task 7: `checklist/[service_id]` 라우트 JWT 연동 + service_id 해결

**Files:**
- Modify: `src/app/api/checklist/[service_id]/route.ts`

- [ ] **Step 1: import 추가 + userId 추출 방식 변경**

Edit 툴로 다음 블록을 교체.

**Before (라인 1-2):**
```typescript
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database'; 
```

**After:**
```typescript
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
```

- [ ] **Step 2: userId 추출 로직 교체**

**Before (라인 21-22):**
```typescript
        const {searchParams} = new URL(request.url);
        const userId = searchParams.get('userId') || 'temp_user';
```

**After:**
```typescript
        const userId = getUserIdFromRequest(request);
```

- [ ] **Step 3: progress 조회를 data.id 사용 + 비로그인 분기로 변경**

**Before (라인 36-39):**
```typescript
        const progressSql = 
            `SELECT item_id FROM checklist_progress WHERE user_id = ? AND service_id = ?`;
        const progressRows = await executeQuery(progressSql, [userId,  service_id]);
        const completedItems = progressRows.map((p:any) => p.item_id);
```

**After:**
```typescript
        const progressSql =
            `SELECT item_id FROM checklist_progress WHERE user_id = ? AND service_id = ?`;
        const completedItems: string[] = userId
            ? (await executeQuery(progressSql, [userId, data.id])).map((p: any) => p.item_id)
            : [];
```

**변경 요약:**
- `'temp_user'` 폴백 제거 → JWT에서 추출, 없으면 `null`
- progress 쿼리 두 번째 파라미터 `service_id`(URL 원본) → `data.id`(해결된 INT FK)
- 비로그인 시 빈 배열로 처리 (조회는 허용)

- [ ] **Step 4: 타입체크**

```powershell
npx tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```powershell
git add "src/app/api/checklist/[service_id]/route.ts"
git commit -m "feat(checklist): identify user via JWT, use resolved service id for progress"
```

---

## Task 8: `required-docs/[service_id]` 라우트 JWT 연동 + service_id 해결

**Files:**
- Modify: `src/app/api/required-docs/[service_id]/route.ts`

- [ ] **Step 1: import 추가**

**Before (라인 1-2):**
```typescript
import { executeQuery } from "@/lib/database";
import { NextResponse } from "next/server";
```

**After:**
```typescript
import { executeQuery } from "@/lib/database";
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
```

- [ ] **Step 2: userId 추출 로직 교체**

**Before (라인 33-34):**
```typescript
        const {searchParams} = new URL(request.url);
        const userId = searchParams.get('userId') || 'temp_user';
```

**After:**
```typescript
        const userId = getUserIdFromRequest(request);
```

- [ ] **Step 3: progress 조회를 data.id 사용 + 비로그인 분기로 변경**

**Before (라인 48-51):**
```typescript
        // 유저 진행도(체크박스) 조회
        const progress = `SELECT item_id FROM checklist_progress WHERE user_id = ? AND service_id = ?`;
        const progressRows = await executeQuery(progress, [userId, service_id]);
        const completedItems = progressRows.map((p: any) => p.item_id);
```

**After:**
```typescript
        // 유저 진행도(체크박스) 조회
        const progress = `SELECT item_id FROM checklist_progress WHERE user_id = ? AND service_id = ?`;
        const completedItems: string[] = userId
            ? (await executeQuery(progress, [userId, data.id])).map((p: any) => p.item_id)
            : [];
```

- [ ] **Step 4: 타입체크**

```powershell
npx tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```powershell
git add "src/app/api/required-docs/[service_id]/route.ts"
git commit -m "feat(required-docs): identify user via JWT, use resolved service id for progress"
```

---

## Task 9: 엔드투엔드 수동 검증 (spec §12 시나리오)

**Files:** 없음 (검증만)

검증을 위해 dev 서버를 띄우고 curl/Postman/Thunder Client로 API 호출.

- [ ] **Step 1: dev 서버 기동**

별도 PowerShell 터미널에서:
```powershell
npm run dev
```

`http://localhost:3000`에서 서버 대기.

- [ ] **Step 2: 시나리오 3 — 회원가입/로그인 정상 동작**

```powershell
$signup = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/auth/signup `
  -ContentType 'application/json' `
  -Body '{"email":"test@example.com","password":"Test123!","name":"테스트"}'
$signup
```

Expected: `success: true` 또는 200 응답.

```powershell
$login = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/auth/login `
  -ContentType 'application/json' `
  -Body '{"email":"test@example.com","password":"Test123!"}'
$token = $login.data.accessToken
$token
```

Expected: JWT 토큰 문자열 출력.

DB 확인:
```sql
SELECT id, email, name FROM users WHERE email = 'test@example.com';
```
Expected: 1행 반환.

- [ ] **Step 3: 시나리오 4 — 비로그인 체크리스트 조회 (테스트 데이터 필요 시 services에 1행 삽입)**

services 테이블이 비어 있으면 검증을 위한 테스트 데이터 1행 수동 삽입:
```sql
INSERT INTO services (id, service_name, eligibility, application_steps, official_link_method, online_method)
VALUES (1, '테스트서비스', '만 18세 이상', '(1) 신분증\n(2) 신청서', 'https://www.example.go.kr', 'https://www.bokjiro.go.kr');
INSERT INTO service_sources (service_id, raw_required_docs, raw_eligibility, raw_steps)
VALUES (1, '(1) 신분증\n(2) 신청서', '만 18세 이상', '(1) 신분증\n(2) 신청서');
```

비로그인 GET:
```powershell
Invoke-RestMethod -Method GET -Uri http://localhost:3000/api/checklist/1
```

Expected: 200 응답, `steps[].isCompleted: false`, `document[].isCompleted: false`. 에러 없음.

- [ ] **Step 4: 시나리오 5 — 로그인 상태로 체크리스트 조회**

```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Method GET -Uri http://localhost:3000/api/checklist/1 -Headers $headers
```

Expected: 200 응답, `completedItems` 빈 상태 (아직 토글 안 함) → 모든 `isCompleted: false`.

- [ ] **Step 5: 시나리오 6 — 진행도 토글 PUT**

체크 (step_1을 완료로 표시):
```powershell
Invoke-RestMethod -Method PUT -Uri http://localhost:3000/api/checklist/1/progress -Headers $headers `
  -ContentType 'application/json' -Body '{"item_id":"step_1","checked":true}'
```

Expected: `success: true`.

DB 확인:
```sql
SELECT * FROM checklist_progress WHERE user_id = 1 AND service_id = 1;
```
Expected: 1행 — item_id='step_1'.

다시 체크리스트 조회:
```powershell
Invoke-RestMethod -Method GET -Uri http://localhost:3000/api/checklist/1 -Headers $headers
```

Expected: `steps[0].isCompleted: true` (step_1만 체크됨).

해제 (step_1을 미완료로 토글):
```powershell
Invoke-RestMethod -Method PUT -Uri http://localhost:3000/api/checklist/1/progress -Headers $headers `
  -ContentType 'application/json' -Body '{"item_id":"step_1","checked":false}'
```

DB 확인:
```sql
SELECT * FROM checklist_progress WHERE user_id = 1 AND service_id = 1;
```
Expected: 0행.

- [ ] **Step 6: 시나리오 7 — UNIQUE 제약 idempotency**

같은 항목을 두 번 체크:
```powershell
Invoke-RestMethod -Method PUT -Uri http://localhost:3000/api/checklist/1/progress -Headers $headers `
  -ContentType 'application/json' -Body '{"item_id":"doc_1","checked":true}'
Invoke-RestMethod -Method PUT -Uri http://localhost:3000/api/checklist/1/progress -Headers $headers `
  -ContentType 'application/json' -Body '{"item_id":"doc_1","checked":true}'
```

Expected: 둘 다 `success: true`, 에러 없음.

DB 확인:
```sql
SELECT COUNT(*) FROM checklist_progress WHERE user_id = 1 AND service_id = 1 AND item_id = 'doc_1';
```
Expected: `1` (UNIQUE KEY 덕분에 중복 없음).

- [ ] **Step 7: 시나리오 8 — FK CASCADE 동작 확인**

```sql
DELETE FROM users WHERE id = 1;
SELECT * FROM checklist_progress WHERE user_id = 1;
```

Expected: checklist_progress의 user_id=1 행이 모두 삭제됨 (0행 반환).

**주의:** 이 시나리오는 테스트 사용자를 삭제하므로 마지막에 수행. 검증 후 테스트 데이터 정리.

- [ ] **Step 8: 엣지케이스 — 진행도 PUT 인증/입력 검증**

토큰 없이:
```powershell
Invoke-WebRequest -Method PUT -Uri http://localhost:3000/api/checklist/1/progress `
  -ContentType 'application/json' -Body '{"item_id":"step_1","checked":true}' -SkipHttpErrorCheck
```
Expected: 401, `message: "인증 필요"`.

잘못된 바디:
```powershell
Invoke-WebRequest -Method PUT -Uri http://localhost:3000/api/checklist/1/progress -Headers $headers `
  -ContentType 'application/json' -Body '{"item_id":"step_1"}' -SkipHttpErrorCheck
```
Expected: 400, `message: "잘못된 요청"` (`checked` 누락).

존재하지 않는 service_id:
```powershell
Invoke-WebRequest -Method PUT -Uri http://localhost:3000/api/checklist/999999/progress -Headers $headers `
  -ContentType 'application/json' -Body '{"item_id":"step_1","checked":true}' -SkipHttpErrorCheck
```
Expected: 404, `message: "서비스 없음"`.

- [ ] **Step 9: 검증 완료 커밋 (없음)**

검증만 수행. 새로운 코드 변경 없으면 커밋 생략. 만약 검증 중 버그 발견되면 해당 Task로 돌아가 수정.

---

## 완료 체크

전체 작업 끝나면 다음을 확인:

- [ ] `db/schema.sql`, `scripts/db-init.mjs`, `src/lib/auth.ts`, `src/app/api/checklist/[service_id]/progress/route.ts` 4개 파일 신규 생성됨
- [ ] `package.json`에 `db:init` 스크립트 추가됨
- [ ] `src/app/api/checklist/[service_id]/route.ts`와 `src/app/api/required-docs/[service_id]/route.ts`에서 `temp_user` 폴백 제거되고 JWT 추출 사용
- [ ] MariaDB에 5개 테이블 존재 (`SHOW TABLES` 확인)
- [ ] 시나리오 1~8 모두 통과
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] 모든 커밋 메시지가 변경 내용을 정확히 설명함
