# DB 스키마 및 누락 기능 보완 설계

**작성일:** 2026-05-31
**브랜치:** feat/chatbot
**범위:** mijung_project (Next.js + MariaDB)

## 1. 배경 및 문제

현재 프로젝트는 MariaDB를 사용하지만 다음 문제가 있다.

1. **테이블 미생성** — 코드(`src/app/api/*`)는 `users`, `services`, `service_sources`, `checklist_progress`, `terms` 테이블을 raw SQL로 조회/저장하지만, 스키마 파일도 마이그레이션 파일도 없어 실제 DB에 테이블이 존재하지 않는다. 호출 시 런타임 에러가 발생한다.
2. **`checklist_progress`에 쓰기 쿼리 없음** — SELECT만 존재해 체크박스를 눌러도 저장할 방법이 코드에 없다 (사실상 read-only 더미).
3. **인증 단절** — `auth/login`은 JWT를 발급하지만, `checklist`/`required-docs`는 이를 검증하지 않고 쿼리스트링 `?userId=...` 또는 하드코딩 `'temp_user'`를 사용한다.

## 2. 목표

- 5개 테이블의 스키마 정의 및 한 번에 적용 가능한 마이그레이션 러너 제공
- 체크리스트 항목 토글(체크/해제) 기능 추가
- JWT 기반 사용자 식별을 체크리스트 관련 라우트에 적용

## 3. 비목표

- `documents`, `question`, `users`(CRUD), `index` 등 미구현 라우트의 신규 구현
- 외부 AI API 프록시 라우트(chat, analyze, translate, stt, tts, service_detail) 변경
- 시드 데이터(services, service_sources 마스터 데이터) 입력 — 별도 작업
- ORM 도입 또는 기존 raw SQL을 ORM으로 마이그레이션
- 마이그레이션 버전 관리(향후 옵션 C로 확장 가능하나 이번엔 단일 스키마 파일)

## 4. 접근 방식 (옵션 B 채택)

| 옵션 | 요약 | 채택 여부 |
|---|---|---|
| A | 단일 schema.sql + 수동 SQL CLI 실행 | ❌ |
| **B** | **단일 schema.sql + `npm run db:init` 스크립트** | ✅ **채택** |
| C | 버전 마이그레이션 폴더 + 적용 추적 테이블 | ❌ (yagni) |

**채택 이유:** 추가 npm 의존성 0개, 반복 가능한 단일 명령, 현재 raw SQL 스타일과 자연스럽게 일치. 향후 C로 확장 가능.

## 5. 파일 구조

### 신규 파일
```
db/schema.sql
scripts/db-init.mjs
src/lib/auth.ts
src/app/api/checklist/[service_id]/progress/route.ts
```

### 수정 파일
```
package.json                                          # db:init 스크립트 1줄 추가
src/app/api/checklist/[service_id]/route.ts           # userId 추출 + service_id 해결
src/app/api/required-docs/[service_id]/route.ts      # 동일
```

### 영향 없는 곳
- 외부 AI API 프록시 라우트 전체
- `auth/signup`, `auth/login` (이미 동작)
- `terms/[word]` (별도 변경 불필요)

## 6. DB 스키마

공통 옵션: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`

### 6.1 `users`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| name | VARCHAR(100) | NOT NULL |
| provider | VARCHAR(20) | NOT NULL, DEFAULT 'local' |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 6.2 `services`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| service_name | VARCHAR(255) | NOT NULL, INDEX |
| eligibility | TEXT | NULL |
| application_steps | TEXT | NULL |
| official_link_method | VARCHAR(500) | NULL |
| online_method | VARCHAR(500) | NULL |

`service_name` 인덱스: 라우트가 `WHERE s.id = ? OR s.service_name = ?` 조회.

### 6.3 `service_sources`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| service_id | INT | NOT NULL, FK → services.id ON DELETE CASCADE |
| raw_required_docs | LONGTEXT | NULL |
| raw_eligibility | LONGTEXT | NULL |
| raw_steps | LONGTEXT | NULL |

### 6.4 `checklist_progress`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| user_id | INT | NOT NULL, FK → users.id ON DELETE CASCADE |
| service_id | INT | NOT NULL, FK → services.id ON DELETE CASCADE |
| item_id | VARCHAR(50) | NOT NULL |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

UNIQUE KEY `(user_id, service_id, item_id)` — 같은 항목 중복 체크 방지.

### 6.5 `terms`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| term | VARCHAR(255) | NOT NULL, UNIQUE |
| easy_explain | TEXT | NOT NULL |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

## 7. JWT 헬퍼 (`src/lib/auth.ts`)

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

**계약:** 유효한 `Authorization: Bearer <token>` 헤더가 있으면 `userId`(숫자) 반환, 아니면 `null`.
**근거:** 라우트마다 401 처리 방식이 다를 수 있으므로(체크리스트 조회는 비로그인 허용, 진행도 토글은 거부) 호출 측에서 결정하도록 함.

## 8. 진행도 토글 엔드포인트

**경로:** `src/app/api/checklist/[service_id]/progress/route.ts`
**메서드:** `PUT`
**요청 바디:**
```json
{ "item_id": "step_1", "checked": true }
```

**동작 흐름:**
1. `getUserIdFromRequest(request)` 호출 — `null`이면 **401** `{ success: false, message: "인증 필요" }`
2. 바디 검증: `typeof item_id === 'string' && typeof checked === 'boolean'` 아니면 **400** `{ success: false, message: "잘못된 요청" }`
3. URL의 `service_id`(숫자 또는 한글 service_name)를 `SELECT id FROM services WHERE id = ? OR service_name = ?` 로 실제 PK(`id`, INT) 해결 — 결과 없으면 **404** `{ success: false, message: "서비스 없음" }`
4. 분기:
   - `checked === true`: `INSERT IGNORE INTO checklist_progress (user_id, service_id, item_id) VALUES (?, ?, ?)`
   - `checked === false`: `DELETE FROM checklist_progress WHERE user_id=? AND service_id=? AND item_id=?`
5. **200** `{ success: true }`
6. 예외 발생 시 **500** `{ success: false, message: "Server Error" }`

**근거:** UNIQUE KEY 덕분에 `INSERT IGNORE`가 idempotent — 동일 항목 재체크 호출이 와도 안전. PUT은 "상태 설정" 의미라 토글 동작에 적합.

## 9. 기존 라우트 수정

### 9.1 `src/app/api/checklist/[service_id]/route.ts`

**Before:**
```typescript
const userId = searchParams.get('userId') || 'temp_user';
// ...
const progressRows = await executeQuery(progressSql, [userId, service_id]);
```

**After:**
```typescript
import { getUserIdFromRequest } from '@/lib/auth';

const userId = getUserIdFromRequest(request);
// ... services 조회 후 data.id 확보 ...
const completedItems = userId
  ? (await executeQuery(progressSql, [userId, data.id])).map((p: any) => p.item_id)
  : [];
```

**변경 포인트:**
1. `'temp_user'` 폴백 제거 — JWT에서 추출, 없으면 `null`
2. progress 쿼리의 `service_id` 인자를 URL 원본 → `data.id`(해결된 INT)로 변경 (FK 일치)
3. 비로그인 시 `completedItems = []`로 처리 (조회는 허용)

### 9.2 `src/app/api/required-docs/[service_id]/route.ts`

`required-docs`는 현재 `completedItems`를 계산하지만 응답 객체에서 `isCompleted: false`(하드코딩) 사용 중. 그래도 9.1과 동일한 패턴으로 통일한다 — 향후 응답에 진행도가 반영될 때 즉시 동작하도록 토대만 정리.

## 10. 마이그레이션 러너

### 10.1 스크립트 (`scripts/db-init.mjs`)
```javascript
import { readFileSync } from 'node:fs';
import mariadb from 'mariadb';

const sql = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf-8');

const conn = await mariadb.createConnection({
  host: process.env.DB_HOST,
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

### 10.2 `package.json` 변경
```json
"scripts": {
  "db:init": "node --env-file=.env.local scripts/db-init.mjs"
}
```

### 10.3 핵심 결정
| 결정 | 이유 |
|---|---|
| `CREATE TABLE IF NOT EXISTS` | 재실행 안전 (idempotent) |
| `--env-file=.env.local` | Node 20.20.0 확인 완료 (20.6.0+ 지원), dotenv 불요 |
| `multipleStatements: true` | 5개 CREATE 문 한번에 실행 |
| 단일 connection (풀 아님) | 일회성 스크립트, 끝나면 깔끔히 종료 |
| TS 풀 재사용 안 함 | `src/lib/database.tsx`를 Node에서 직접 import 곤란, 30줄 스크립트라 중복 허용 |

## 11. 사전 조건 및 운영 노트

- **Node ≥ 20.6.0** 필요 (`--env-file` 플래그) — 현재 환경 v20.20.0 OK
- `.env.local`에 `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` 설정되어 있어야 함
- **데이터베이스(스키마) 사전 생성 필요** — 이번 스크립트는 테이블만 만들고 데이터베이스 자체는 만들지 않음. 사전에 한 번 다음을 실행:
  ```sql
  CREATE DATABASE IF NOT EXISTS <DB_NAME> CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```
  (`<DB_NAME>`은 `.env.local`의 `DB_NAME` 값과 일치해야 함)
- 실행 후 `mariadb` CLI 또는 GUI 툴에서 `SHOW TABLES;`로 5개 테이블 생성 확인

## 12. 검증 시나리오

설계 구현 후 다음을 수동 확인한다.

1. **마이그레이션** — `npm run db:init` 실행 후 MariaDB에 5개 테이블 존재 확인
2. **재실행 안전성** — `npm run db:init`을 두 번 실행해도 에러 없음 (`IF NOT EXISTS` 동작)
3. **회원가입/로그인** — 기존 API 호출이 정상 동작 (`users` 테이블에 INSERT, JWT 발급)
4. **체크리스트 조회 (비로그인)** — `Authorization` 헤더 없이 GET 호출 시 200 응답, `completedItems`는 빈 배열로 처리
5. **체크리스트 조회 (로그인)** — JWT 첨부 시 200 응답, 진행도가 반영됨
6. **진행도 토글** — PUT으로 `{item_id, checked: true}` → 다시 GET했을 때 `isCompleted: true`로 표시; `checked: false`로 토글하면 해제됨
7. **UNIQUE 제약** — 같은 항목을 두 번 체크해도 에러 없이 idempotent (테이블에 중복 행 없음)
8. **FK CASCADE** — users 삭제 시 해당 user의 checklist_progress 행도 함께 삭제 (스키마 검증용 시나리오)

## 13. 향후 확장 (이번 범위 밖)

- `documents` 테이블 추가 + `/api/documents/[procedure_id]` 실제 DB 연동
- `auth/logout` 의 토큰 블랙리스트/세션 관리 (Redis 또는 DB)
- `/api/question` 의 다단계 Q&A 세션 저장
- 마이그레이션 버전 관리 (옵션 C): `db/migrations/00X_*.sql` + `schema_migrations` 추적 테이블
- services / service_sources 시드 데이터 입력 절차
