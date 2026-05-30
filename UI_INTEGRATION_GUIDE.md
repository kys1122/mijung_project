# AI 챗봇 API — UI 연동 매뉴얼

> 대상: `mijung_project` (Next.js) UI 팀
> 작성일: 2026-05-30
> 챗봇 API 서버: **`http://210.119.32.188:20003`**
> Swagger 문서: **`http://210.119.32.188:20003/docs`**

---

## 1. 개요

### 전체 구조
```
[브라우저]
    │
    ▼
[mijung_project (Next.js)]
    ├─→ DB 직접 호출 (회원, 민원 목록 등)
    └─→ AI 호출 → [챗봇 API 서버 :20003]
                     ├─ /chat
                     ├─ /analyze
                     ├─ /terms/explain
                     ├─ /stt, /tts
                     ├─ /checklist
                     └─ /service_detail
```

### 인증
- 현재 **API Key 인증 비활성** (서버 `.env`에 `API_KEY` 미설정)
- 별도 헤더 불필요
- 추후 API Key 적용 시 `X-API-Key` 헤더로 전달

### CORS
- 현재 허용된 Origin: `http://210.119.32.188:20001`, `http://localhost:3000`
- 그 외 도메인에서 호출 시 브라우저가 차단 → 사전 협의 필요

---

## 2. 환경 설정

### `mijung_project/.env.local`
```env
# 기존
NEXT_PUBLIC_API_URL=http://localhost:3001

# 추가
AI_API_URL=http://210.119.32.188:20003
NEXT_PUBLIC_AI_API_URL=http://210.119.32.188:20003
```

| 변수명 | 용도 |
|---|---|
| `AI_API_URL` | Next.js **서버 사이드** (route.ts에서 axios 호출) |
| `NEXT_PUBLIC_AI_API_URL` | **브라우저 클라이언트** ('use client' 컴포넌트에서 fetch) |

---

## 3. 주요 엔드포인트 매핑

| UI 기능 | 챗봇 API | 메소드 |
|---|---|---|
| 용어 AI 설명 | `/terms/explain` | POST |
| 자유 채팅 | `/chat` | POST |
| 채팅 스트리밍 (타이핑 효과) | `/chat/stream` | POST (SSE) |
| 상황 → 민원 매칭 | `/analyze` | POST |
| 민원 상세 안내 | `/service_detail` | POST |
| 체크리스트 생성 | `/checklist` | POST |
| 음성 → 텍스트 | `/stt` | POST (multipart) |
| 텍스트 → 음성 | `/tts` | POST |
| 번역 | `/translate` | POST |
| Q&A 시작 | `/questions/start` | GET |
| Q&A 답변 제출 | `/questions/answer` | POST |
| 헬스체크 | `/health` | GET |

전체 명세: `http://210.119.32.188:20003/docs`

---

## 4. 엔드포인트 상세

### 4-1. `/chat` — 자유 채팅

**Request**
```json
POST /chat
Content-Type: application/json

{
  "question": "기초생활수급 신청하고 싶어요",
  "user_type": "general",          // "general" | "senior" | "foreigner" | "low_income"
  "category": "복지",               // 선택
  "lang": "ko",                     // ko | en | vi | zh ...
  "visa_type": "",                  // 외국인일 때 "E-9", "F-5" 등
  "history": [                      // 이전 대화 (선택)
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "session_id": "user-abc-123"      // 선택, 지정 시 Redis 대화 이력 저장
}
```

**Response**
```json
{
  "answer": "기초생활수급은 ...",
  "sources": [
    { "service_name": "생계급여", "url": "https://..." }
  ],
  "terms": [
    { "term": "수급자", "definition": "...", "easy_explain": "쉬운 설명" }
  ],
  "response_lang": "ko",
  "foreigner_resources": []
}
```

**Next.js route 예시** (`src/app/api/chat/route.ts`)
```typescript
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  const body = await request.json();
  const res = await axios.post(
    `${process.env.AI_API_URL}/chat`,
    body
  );
  return NextResponse.json(res.data);
}
```

---

### 4-2. `/analyze` — 상황 → 민원 매칭

**Request**
```json
POST /analyze
{
  "user_type": "senior",
  "age_group": "60s",
  "category": "복지",
  "detail": "허리가 아파서 병원비 부담이 커요",
  "lang": "ko",
  "visa_type": ""
}
```

**Response**
```json
{
  "matched_services": [
    {
      "service_name": "의료급여",
      "agency": "보건복지부",
      "eligibility": "...",
      "url": "...",
      "visa_eligible": true,
      "eligibility_warning": null
    }
  ],
  "summary": "추천 민원 3건...",
  "detected_lang": "ko",
  "foreigner_resources": []
}
```

---

### 4-3. `/terms/explain` — 용어 AI 설명 (UI 팀이 미리 자리 마련)

**Request**
```json
POST /terms/explain
{
  "term": "수급자",
  "question": "",            // 추가 질문 있을 때
  "lang": "ko"
}
```

**Response**
```json
{
  "term": "수급자",
  "definition": "국민기초생활보장법에 의해 급여를 받는 사람",
  "easy_explain": "나라에서 생활이 어려운 분들에게 ...",
  "source": "database"      // "database" | "ai_generated"
}
```

**Next.js route 적용** (`src/app/api/terms/[word]/route.ts` 수정)
```typescript
// DB에 없을 때 (현재 TODO 자리)
const aiResponse = await axios.post(
  `${process.env.AI_API_URL}/terms/explain`,
  { term: word, lang: "ko" }
);

return NextResponse.json({
  success: true,
  data: {
    term: aiResponse.data.term,
    easy_explain: aiResponse.data.easy_explain,
    source: aiResponse.data.source
  }
}, { status: 200 });
```

---

### 4-4. `/service_detail` — 민원 상세 안내

**Request**
```json
POST /service_detail
{
  "service_name": "기초생활수급",
  "lang": "ko",
  "user_type": "senior"
}
```

**Response**
```json
{
  "service_name": "기초생활수급",
  "detail": "신청자격: ...\n구비서류: ...\n절차: ...",
  "service_info": { "agency": "...", "url": "..." },
  "terms": [...],
  "response_lang": "ko",
  "foreigner_resources": []
}
```

---

### 4-5. `/checklist` — 신청 체크리스트

**Request**
```json
POST /checklist
{
  "service_name": "기초생활수급",
  "lang": "ko",
  "user_type": "senior"
}
```

**Response**
```json
{
  "service_name": "기초생활수급",
  "checklist": "1. 신분증 준비...\n2. 주민센터 방문...",
  "service_info": {...},
  "terms": [...],
  "response_lang": "ko",
  "foreigner_resources": []
}
```

---

### 4-6. `/stt` — 음성 → 텍스트

**Request** (multipart/form-data)
```
POST /stt
Content-Type: multipart/form-data

file: <audio file (wav, mp3, m4a 등)>
language: "ko"  (선택, 자동감지 가능)
```

**Response**
```json
{
  "text": "기초생활수급 신청하고 싶어요"
}
```
> 참고: Whisper가 자동 감지한 언어는 응답에 포함되지 않음. 필요하면 클라이언트에서 별도 처리.

**클라이언트 코드 예시** (`qa/page.tsx`)
```typescript
const formData = new FormData();
formData.append("file", audioBlob);
formData.append("language", "ko");

const res = await fetch(
  `${process.env.NEXT_PUBLIC_AI_API_URL}/stt`,
  { method: "POST", body: formData }
);
const { text } = await res.json();
```

---

### 4-7. `/tts` — 텍스트 → 음성

**Request**
```json
POST /tts
{
  "text": "안녕하세요. 무엇을 도와드릴까요?",
  "voice": "nova"     // 선택: nova | alloy | echo | fable | onyx | shimmer
}
```

**Response**: `audio/mpeg` 바이너리 (mp3)

**클라이언트 코드 예시**
```typescript
const res = await fetch(
  `${process.env.NEXT_PUBLIC_AI_API_URL}/tts`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "...", voice: "nova" })
  }
);
const blob = await res.blob();
const audioUrl = URL.createObjectURL(blob);
new Audio(audioUrl).play();
```

---

### 4-8. `/chat/stream` — 채팅 스트리밍 (SSE)

타이핑 효과 구현 시 사용. Server-Sent Events.

**Request**: `/chat`과 동일

**Response**: SSE 스트림
```
data: {"chunk": "안녕하세요"}

data: {"chunk": ". 무엇을"}

data: {"chunk": " 도와드릴까요?"}

data: [DONE]
```

**클라이언트 코드 예시**
```typescript
const res = await fetch(
  `${process.env.NEXT_PUBLIC_AI_API_URL}/chat/stream`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "...", lang: "ko" })
  }
);

const reader = res.body!.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  // "data: {...}" 형식 파싱하여 화면에 표시
}
```

---

## 5. 에러 처리

### 표준 에러 응답
```json
{
  "detail": "에러 메시지 (한국어 + English 병기 가능)"
}
```

### HTTP 상태 코드
| 코드 | 의미 | 대응 |
|---|---|---|
| 200 | 정상 | - |
| 400 | 요청 형식 오류 (필수 필드 누락, 길이 초과 등) | 입력값 검증 |
| 429 | Rate limit 초과 (분당 호출 한도) | 1분 후 재시도 |
| 500 | 서버 내부 에러 (LLM 호출 실패 등) | 재시도 또는 사용자에게 안내 |
| 503 | Health check 실패, DB/Redis 다운 | 모니터링 알림 |

### Next.js route 예외 처리 예시
```typescript
try {
  const res = await axios.post(`${process.env.AI_API_URL}/chat`, body);
  return NextResponse.json(res.data);
} catch (err: any) {
  if (err.response?.status === 429) {
    return NextResponse.json(
      { error: "잠시 후 다시 시도해주세요" },
      { status: 429 }
    );
  }
  return NextResponse.json(
    { error: "AI 서버 오류" },
    { status: 500 }
  );
}
```

---

## 6. 다국어 지원

### 지원 언어 코드 (`lang` 파라미터)
| 코드 | 언어 |
|---|---|
| `ko` | 한국어 (기본) |
| `en` | 영어 |
| `vi` | 베트남어 |
| `zh` | 중국어 |
| `ja` | 일본어 |
| `th` | 태국어 |
| 그 외 13개 언어 | `/languages` 엔드포인트로 조회 |

### 외국인 사용자 처리
- `user_type: "foreigner"` 지정 시 외국인 전용 응답 (한국 행정 기초 설명 포함)
- `visa_type` 지정 시 비자별 자격 필터링 + 부적격 민원 경고
- `foreigner_resources` 필드에 1345, 하이코리아 등 자동 첨부

---

## 7. 테스트 방법

### 7-1. Swagger UI로 직접 테스트
```
http://210.119.32.188:20003/docs
```
브라우저로 접속해서 각 엔드포인트 "Try it out" 가능.

### 7-2. curl 테스트
```bash
# 헬스체크
curl http://210.119.32.188:20003/health

# 채팅
curl -X POST http://210.119.32.188:20003/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"기초생활수급 알려줘","lang":"ko"}'
```

### 7-3. CORS 정상 작동 확인 (브라우저 콘솔)
```javascript
fetch("http://210.119.32.188:20003/health")
  .then(r => r.json())
  .then(console.log);
```
정상: `{ "status": "ok" }`
CORS 차단: 브라우저 콘솔에 빨간 에러

---

## 8. 자주 발생하는 문제

| 증상 | 원인 / 해결 |
|---|---|
| `CORS error` (브라우저 콘솔) | UI 도메인이 CORS 허용 목록에 없음. 챗봇 API의 `.env` `CORS_ORIGINS`에 추가 요청 |
| `Failed to fetch` | API 서버가 죽었거나 URL 오타. `curl http://210.119.32.188:20003/health` 확인 |
| 응답이 영어로만 옴 | 요청에 `lang` 파라미터 누락 또는 자동 감지 실패 |
| 응답 한 번 빠르고 다음번 느림 | 첫 호출은 LLM 콜드 스타트 / RAG 인덱스 로드. 정상 동작 |
| 429 Too Many Requests | Rate limit (기본 분당 60회). 클라이언트 측 throttle 권장 |
| 음성 파일 업로드 실패 | `FormData` 사용 확인. `Content-Type: application/json` 헤더 빼야 함 |

---

## 9. 연락 / 변경 이력

- 챗봇 API 담당: (담당자명)
- 변경 이력
  - 2026-05-30: 초안 작성
