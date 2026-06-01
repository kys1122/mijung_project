# 민중 (Mijung) — 누구나 쉽게 민원

> 노인·외국인·저소득층을 위한 친근한 민원 안내 웹앱.
> 챗봇이 질문 몇 가지를 받아 맞춤 민원을 찾고, 신청에 필요한 단계와 서류를 한 곳에서 안내합니다.

---

## 1. 왜 만들었나

대한민국 공공 민원 서비스는 종류가 많지만, 다음 사용자에게는 사실상 닿지 않습니다.

- **노인** — 정부24 같은 공식 채널은 화면이 작고 용어가 어려움. 어떤 서류가 어디서 발급되는지 모름.
- **외국인** — 한국어 행정용어 + 모호한 자격 요건. 어디서 시작해야 할지 막막함.
- **저소득층** — 받을 수 있는 복지 제도가 있어도 존재 자체를 모름.

**민중**은 세 가지를 해결합니다.

1. **친근한 챗봇**이 4단계 질문으로 사용자의 상황을 듣고, LLM RAG로 가장 가까운 민원을 추천.
2. **민원별 단계와 준비물**을 한 화면에서 — 오프라인/온라인 경로를 분리해 자기 상황에 맞게 진행.
3. **접근성** — 큰 글자, 고대비, 다국어(한국어/영어), 음성 입력(STT), 음성 안내(TTS).

---

## 2. 페르소나

| 페르소나 | 주 사용 시나리오 |
|---|---|
| 김할머니(74세) | 무릎인공관절 수술 → 의료비 지원 가능한지 챗봇에게 물음 → 자세히 보기로 자격 확인 → 체크리스트로 진행 |
| Anna(외국인, 30대) | 외국인 등록 갱신 → 영어로 옵션 선택 → 챗봇이 정부24 절차를 영어로 안내 |
| 이영수(저소득 가장) | "생활비 지원" 검색 → 기초생활보장 매칭 → 진행률 카드로 어디까지 했는지 추적 |

---

## 3. 핵심 기능

| 영역 | 기능 |
|---|---|
| **챗봇** | 4단계(유형 → 연령대 → 카테고리 → 상황) 가이드. /analyze로 LLM RAG 매칭. 자유 채팅(/chat). 음성 입력(STT). 세션 영속화(ChatGPT 식 사이드바). |
| **민원 안내** | LLM detail로 풍부한 자세히 보기. RichTextRenderer가 마크다운·링크·체크리스트 마커를 보기 좋게 렌더. 공식 링크 정규화(`정부24` → `https://www.gov.kr`). |
| **체크리스트** | 단계별 진행 영속(`checklist_progress`). 오프라인/온라인 트랙 분리 진행률. 단계마다 외부 링크 + TTS. |
| **준비 서류** | 발급 가능 트랙(오프라인/온라인) 칩, 트랙별 진행률 분리, 모달에서 상세 발급 정보. |
| **대시보드** | 시간대별 인사, "이어서 진행하기" 카드(가장 임박한 미완료 단계), 진행 중/완료 통계, 카드별 카테고리 컬러. |
| **추천(/recommend)** | 전체 민원 카테고리 컬러 카드, 챗봇 /analyze 기반 검색, qa 폴백 매칭 결과 캐싱. |
| **접근성** | 다국어(KO/EN), 큰 글자 모드, 고대비 모드, WCAG AA 색대비, 16px+ input(iOS 줌 방지), aria-label/aria-pressed. |
| **인증** | JWT(access/refresh), 보호 페이지에서 자동 `?return=` 리다이렉트. |

---

## 4. 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                        브라우저                          │
│  Next.js 16 (App Router, Server + Client Components)    │
└─────────────────────────────────────────────────────────┘
            │                          │
            │ /api/*                   │ Web Speech / MediaRecorder
            ▼                          ▼
┌──────────────────────┐      ┌──────────────────────┐
│   Next.js API Route  │      │   브라우저 STT/TTS    │
│   (BFF, 인증/프록시) │      └──────────────────────┘
└──────────────────────┘
       │              │
       │              │  axios
       ▼              ▼
┌────────────────┐  ┌──────────────────────────────────┐
│  MariaDB        │  │  ai_civil_service_navigator      │
│  (chatbot_db)   │  │  (FastAPI, 별도 프로젝트)         │
│                 │  │  /options /analyze /classify     │
│  users          │  │  /service_detail /checklist /chat│
│  services       │  │  Chroma 벡터 + 키워드 RAG        │
│  service_sources│  └──────────────────────────────────┘
│  mijung_*       │
└────────────────┘
```

**민중의 역할**

- **Thin proxy + UI** — 챗봇 API의 사용자 친화 UI 레이어. 챗봇 응답을 가공하거나 재해석하지 않음 (정확도 유지).
- **민중 도메인 데이터**만 직접 관리 — `mijung_*` 테이블에 진행률·세션·메시지 저장. 챗봇 공용 테이블은 읽기만.

**관련 프로젝트**

- 챗봇 백엔드: `C:\Project\ai_civil\project\ai_civil_service_navigator` (FastAPI + Streamlit + Chroma)

---

## 5. 디자인 시스템

### 디자인 토큰 (`src/app/globals.css`)

```
ink/surface/brand/line/semantic 컬러
radius (sm/md/lg/xl/2xl)
shadow (soft/card/lift/focus) — Toss 톤
motion (easing-out/easing-spring, dur-fast/base/slow)
```

### 공용 컴포넌트 클래스

| 클래스 | 용도 |
|---|---|
| `ui-card`, `ui-card-interactive` | 카드 그룹 컨테이너 |
| `ui-btn-primary`, `ui-btn-secondary`, `ui-btn-ghost` | 버튼 위계 |
| `ui-input` | 입력 (iOS 줌 방지 포함) |
| `ui-page-title`, `ui-page-subtitle`, `ui-section-label` | 타이포 위계 |
| `ui-chip`, `ui-chip-success/warning/neutral` | 상태 배지 |
| `ui-meta-row`, `ui-meta-label`, `ui-meta-value` | 정렬된 라벨/값 |
| `ui-enter` | fade-in-up 진입 모션 |

### 카테고리 컬러 시스템 (`src/lib/category.ts`)

8개 카테고리에 컬러·이모지 매핑.
service의 이름·소관부처·소속으로 카테고리 자동 추론.

| 카테고리 | 컬러 | 이모지 |
|---|---|---|
| 복지 | emerald | 🤝 |
| 의료 | rose | 🏥 |
| 주거 | amber | 🏠 |
| 출입국 | violet | ✈️ |
| 교육·문화 | sky | 📚 |
| 생활지원 | teal | 🧺 |
| 민원서류 | slate | 📄 |
| 기타 | indigo | 🔖 |

### 톤

> Toss 친근함 × Apple 여백 × 정부24 정보 디테일

- **레이아웃 골격** — 큰 헤드라인, 너른 여백 (Apple 미니멀)
- **컴포넌트 톤** — 둥근 카드, 큰 터치 영역, 따뜻한 블루 (Toss/카카오뱅크)
- **정보 디테일** — 부처·수수료 라벨, 상태 배지 (정부24)

---

## 6. 데이터 모델

`db/schema.sql` 참고. 핵심:

| 테이블 | 역할 | 소유 |
|---|---|---|
| `users` | 회원 계정 (이메일/이름/해시 비번) | mijung |
| `services` | 민원 메타데이터 | 챗봇 공용 (읽기만) |
| `service_sources` | 챗봇이 수집한 원본 자격/서류 텍스트 | 챗봇 공용 |
| `terms` | 행정 용어 사전 | 챗봇 공용 |
| `checklist_progress` | 사용자별 단계 완료 KV | mijung |
| `mijung_service_progress` | 사용자별 민원 진행 추적 (description/required_docs/checklist/submitted) | mijung |
| `mijung_chat_sessions` | ChatGPT 식 대화 세션 | mijung |
| `mijung_chat_messages` | 세션 메시지 로그 | mijung |

**중요 제약** — chatbot_db는 챗봇이 운영 중인 공용 DB이므로 챗봇 소유 테이블은 절대 변경하지 않음. mijung은 자체 도메인을 `mijung_*` 접두사 테이블에만 추가.

---

## 7. 라우트 / 페이지 구조

| 경로 | 화면 |
|---|---|
| `/` | 홈 (인사 + 챗봇/대시보드/추천 진입 카드) |
| `/user/login`, `/user/signup` | 인증 (return 파라미터 지원) |
| `/chat` | 챗봇 — 4단계 + /analyze + /service_detail + /checklist + 자유 채팅 |
| `/qa` | 챗봇 비회원 미니 흐름 (questions/start → classify) |
| `/list` | 내 챗봇 대화 기록 (ChatGPT 사이드바) |
| `/recommend` | 민원 둘러보기 (검색 + 카테고리 카드) |
| `/dashboard` | 내 민원 (다음 할 일 + 통계 + 진행 목록) |
| `/list/procedure/[id]` | 절차 페이지 (자세히 보기 + 트랙별 진행률 + 체크리스트) |
| `/list/document/[id]` | 필요 서류 페이지 (트랙별 진행률 + 서류 카드) |

---

## 8. 실행 방법

### 환경 변수 (`.env.local`)

```env
DB_HOST=210.119.32.188
DB_PORT=20008
DB_USER=chatbot_user
DB_PASSWORD=...
DB_NAME=chatbot_db

JWT_SECRET=change-me-in-prod
JWT_REFRESH_SECRET=change-me-too

AI_API_URL=http://localhost:8000   # ai_civil_service_navigator FastAPI
```

### 개발 서버

```bash
npm install
npm run dev
# http://localhost:3000
```

> 챗봇 백엔드(`ai_civil_service_navigator`)도 별도로 실행해야 /chat 흐름이 동작합니다.

### DB 스키마 적용

```bash
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p $DB_NAME < db/schema.sql
```

스키마는 `CREATE TABLE IF NOT EXISTS`라 안전하게 idempotent.

---

## 9. 의사결정 로그

평가에서 자주 묻는 "왜 이렇게 했나"에 대한 짧은 답.

1. **챗봇 흐름을 자체 해석하지 않음** — 챗봇 백엔드(`ui.py`)가 정의한 4단계+/analyze 흐름을 그대로 옮김. mijung에서 자체 추론을 끼면 정확도가 깨짐.
2. **공식 링크 정규화** — DB/LLM이 "정부24" 같은 한글 라벨이나 trailing 문장부호를 내려보내 깨진 URL이 됨 → `src/lib/url.ts`로 표준 URL 매핑.
3. **트랙 분리 진행률** — 단일 step에 오프라인+온라인이 묶여 있어 진행률이 합산됨 → API의 step에 `track` 필드 추가하고 UI에서 두 트랙 진행 막대로 분리.
4. **button-in-button → role="button"** — 리스트 페이지에서 카드 전체 클릭 + 휴지통 별도 클릭이 button 중첩이 되어 hydration 에러. 외곽을 `<div role="button">`으로 변경 + 키보드 핸들러.
5. **카테고리 컬러를 클라이언트 추론** — DB에 카테고리 필드가 없어, 이름·부처 텍스트로 `inferCategory()` 자동 분류. 모든 시각화의 일관된 source of truth.
6. **`?return=` 파라미터 화이트리스트** — open-redirect 방지를 위해 `ALLOWED_RETURN` 집합으로만 검증된 경로 허용.

---

## 10. 알려진 한계 / 다음 단계

- **테스트** — Playwright E2E 시나리오(회원가입 → 챗봇 → 체크리스트 진행) 1개 추가 필요.
- **DB 마이그레이션 도구** — 현재는 `schema.sql` 단일 파일. Prisma migrate / dbmate 도입 검토.
- **에러 모니터링** — Sentry 미연동.
- **PWA** — Service Worker + manifest로 오프라인/홈화면 추가 지원 미구현.
- **다크 모드** — 고대비 모드만 있고 일반 다크 모드 미구현.

---

## 11. 코드 구조

```
src/
├── app/
│   ├── (페이지들)           # / /chat /dashboard /recommend /list/*
│   ├── api/                 # BFF — auth, chat, analyze, checklist, tts, stt, my-services...
│   ├── components/          # PageHeader, BottomNav, RichTextRenderer, ChecklistRenderer, TopSettings...
│   ├── lib/                 # i18n, languages, strings/*
│   ├── globals.css          # 디자인 토큰 + ui-* 컴포넌트 클래스
│   └── layout.tsx           # Pretendard, metadata
├── lib/
│   ├── api-client.ts        # apiFetch + JWT
│   ├── auth.ts              # getUserIdFromRequest (JWT)
│   ├── database.tsx         # mariadb pool
│   ├── url.ts               # 공식 링크 정규화
│   └── category.ts          # 카테고리 분류 + 컬러
└── db/
    └── schema.sql           # idempotent
```

---

## 12. 라이선스

학과 종합프로젝트 결과물 — 별도 라이선스 명시 없음.
