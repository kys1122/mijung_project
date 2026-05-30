# 다국어 셀렉터 + 비자 입력 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** mijung_project에 (1) 13개 언어 셀렉터 + 서버 캐시형 LLM 번역, (2) 외국인 사용자용 비자(visa_type) 드롭다운 입력을 추가한다.

**Architecture:**
- 각 페이지의 UI 문자열을 `src/app/lib/strings/<page>.ts` 모듈로 분리(`{ ko, en }`)해서 클라이언트·서버가 공유한다.
- `useTranslations(page, dict, lang)` 훅이 ko/en은 동기 반환, 그 외 언어는 `/api/i18n?page=&lang=`을 호출해서 비동기 교체.
- `/api/i18n` 라우트는 `.cache/i18n/<page>_<lang>.json`에 디스크 캐시. 캐시 미스 시 챗봇 `/translate_batch`를 호출해 채운다.
- visa_type은 qa 페이지에서 type==='외국인'일 때만 드롭다운으로 수집, `final_context.visa_type`에 저장. chat·analyze 호출 시 페이로드에 포함.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, axios, Node fs (디스크 캐시), 챗봇 API `/translate_batch`

**테스트 제약:** 본 프로젝트는 단위 테스트 프레임워크(jest/vitest)가 설치돼 있지 않다. 본 플랜은 단위 테스트 대신 `npx tsc --noEmit` + `npm run lint` + `npm run dev` 수동 브라우저 확인으로 검증한다.

---

## File Structure

**생성:**
- `src/app/lib/i18n.ts` — `flatten`/`unflatten` 유틸 + `useTranslations` 훅
- `src/app/lib/languages.ts` — 지원 언어 목록 (코드 + 표시명)
- `src/app/lib/visa.ts` — 주요 비자 목록 (코드 + ko/en 라벨)
- `src/app/lib/strings/qa.ts` — qa 페이지 STRINGS
- `src/app/lib/strings/list.ts` — list 페이지 STRINGS
- `src/app/lib/strings/procedure.ts` — list/procedure 페이지 STRINGS
- `src/app/lib/strings/document.ts` — list/document 페이지 STRINGS
- `src/app/lib/strings/chat.ts` — chat 페이지 STRINGS
- `src/app/api/i18n/route.ts` — i18n 번역 결과 GET (서버 디스크 캐시)

**수정:**
- `src/app/components/TopSettings.tsx` — 한/영 토글 → 13개 언어 드롭다운
- `src/app/qa/page.tsx` — `useTranslations` 적용, visa_type 입력 추가, `analyze` 페이로드에 visa_type 추가
- `src/app/list/page.tsx` — `useTranslations` 적용
- `src/app/list/procedure/[id]/page.tsx` — `useTranslations` 적용
- `src/app/list/document/[id]/page.tsx` — `useTranslations` 적용
- `src/app/chat/page.tsx` — `useTranslations` 적용, `final_context.visa_type` 읽어서 `/chat` 페이로드에 추가
- `.gitignore` — `.cache/` 추가

---

## Task 1: 언어 목록 상수 작성

**Files:**
- Create: `src/app/lib/languages.ts`

- [ ] **Step 1: 파일 생성**

```ts
// src/app/lib/languages.ts
// 챗봇 API /languages 응답 기반 (2026-05-31 확인)
export type LangCode =
  | 'ko' | 'en' | 'zh' | 'vi' | 'th' | 'ja' | 'tl'
  | 'id' | 'my' | 'km' | 'mn' | 'uz' | 'ne' | 'ru';

export const SUPPORTED_LANGUAGES: { code: LangCode; native: string }[] = [
  { code: 'ko', native: '한국어' },
  { code: 'en', native: 'English' },
  { code: 'zh', native: '中文' },
  { code: 'vi', native: 'Tiếng Việt' },
  { code: 'th', native: 'ไทย' },
  { code: 'ja', native: '日本語' },
  { code: 'tl', native: 'Filipino' },
  { code: 'id', native: 'Bahasa Indonesia' },
  { code: 'my', native: 'မြန်မာ' },
  { code: 'km', native: 'ភាសាខ្មែរ' },
  { code: 'mn', native: 'Монгол' },
  { code: 'uz', native: "O'zbek" },
  { code: 'ne', native: 'नेपाली' },
  { code: 'ru', native: 'Русский' },
];

export const DEFAULT_LANG: LangCode = 'ko';

export function isSupported(code: string): code is LangCode {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit -p .`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/lib/languages.ts
git commit -m "feat(i18n): add supported languages constant"
```

---

## Task 2: i18n 헬퍼 + useTranslations 훅

**Files:**
- Create: `src/app/lib/i18n.ts`

- [ ] **Step 1: 파일 생성**

```ts
// src/app/lib/i18n.ts
'use client';

import { useEffect, useState } from 'react';

/** 중첩 객체를 점 경로로 평탄화 (string과 string 배열만) */
export function flatten(obj: any, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      out[path] = v;
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'string') out[`${path}.${i}`] = item;
      });
    } else if (v && typeof v === 'object') {
      Object.assign(out, flatten(v, path));
    }
  }
  return out;
}

/** 평탄화된 key→value 맵으로 원본 구조 복원 */
export function unflatten<T>(flat: Record<string, string>, template: T): T {
  const clone: any = JSON.parse(JSON.stringify(template));
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.');
    let cur: any = clone;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      const key = /^\d+$/.test(p) ? Number(p) : p;
      cur = cur[key];
      if (cur == null) break;
    }
    if (cur == null) continue;
    const last = parts[parts.length - 1];
    const key = /^\d+$/.test(last) ? Number(last) : last;
    cur[key] = value;
  }
  return clone as T;
}

/**
 * 페이지별 UI 문자열을 현재 언어로 반환.
 * ko/en은 동기 반환, 그 외는 /api/i18n에서 비동기 조회.
 * 로딩 중에는 en을 표시.
 */
export function useTranslations<T>(
  page: string,
  dict: { ko: T; en: T },
  lang: string,
): T {
  const initial = lang === 'ko' ? dict.ko : dict.en;
  const [t, setT] = useState<T>(initial);

  useEffect(() => {
    if (lang === 'ko') {
      setT(dict.ko);
      return;
    }
    if (lang === 'en') {
      setT(dict.en);
      return;
    }

    setT(dict.en); // 로딩 중 폴백
    let cancelled = false;

    fetch(`/api/i18n?page=${encodeURIComponent(page)}&lang=${encodeURIComponent(lang)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setT(data as T);
      })
      .catch(() => {
        /* 실패 시 en 유지 */
      });

    return () => {
      cancelled = true;
    };
  }, [page, lang, dict]);

  return t;
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit -p .`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/lib/i18n.ts
git commit -m "feat(i18n): add flatten/unflatten + useTranslations hook"
```

---

## Task 3: 각 페이지의 STRINGS 모듈 분리

이 태스크는 5개 파일을 한꺼번에 만든다. 각 파일은 기존 페이지 component 내부의 `t = { ko: {...}, en: {...} }` 객체를 그대로 끄집어내 export하는 것. 페이지 코드는 아직 수정하지 않는다 (Task 5~9에서 적용).

**Files:**
- Create: `src/app/lib/strings/qa.ts`
- Create: `src/app/lib/strings/list.ts`
- Create: `src/app/lib/strings/procedure.ts`
- Create: `src/app/lib/strings/document.ts`
- Create: `src/app/lib/strings/chat.ts`

- [ ] **Step 1: `src/app/lib/strings/qa.ts` 생성**

기존 `src/app/qa/page.tsx`의 `const t = {...}` 내부 그대로:

```ts
export const STRINGS = {
  ko: {
    title: "민원 찾기",
    step: "진행사항",
    langText: "한/영변환",
    highContrast: "고대비모드",
    largeFont: "큰글씨모드",
    q1: "1.", q1_text: "유형이 어떻게 되시나요?",
    q2: "2.", q2_text: "연령대가 어떻게 되나요?",
    q3: "3.", q3_text: "필요한 서비스는 무엇인가요?",
    q4: "4.", q4_text: "무슨 상황인가요?",
    types: ['외국인', '노인 (65세 이상)', '저소득층', '해당없음'],
    options: {
      age: ['10대', '20대', '30대', '40대', '50대', '60대 이상'],
      service: ['민원', '복지', '주거', '의료', '일자리'],
    },
    agePlaceholder: "연령을 선택해주세요",
    servicePlaceholder: "서비스를 선택해주세요",
    textareaPlaceholder: "상황을 입력하거나 음성으로 말씀해주세요",
    btnSelect: "입력 선택",
    btnVoice: "음성 인식",
    btnSubmit: "입력 완료",
    cancel: "취소",
    modalAge: "연령 입력",
    modalService: "서비스 입력",
    voiceMain: "말해주세요",
    voiceSubmit: "말하기 완료 (전송)",
  },
  en: {
    title: "Public Service",
    step: "Progress",
    langText: "KO/EN",
    highContrast: "Contrast",
    largeFont: "BigFont",
    q1: "1.", q1_text: "What is your type?",
    q2: "2.", q2_text: "How old are you?",
    q3: "3.", q3_text: "What service do you need?",
    q4: "4.", q4_text: "What is the situation?",
    types: ['Foreigner', 'Senior', 'Low Income', 'N/A'],
    options: {
      age: ['10s', '20s', '30s', '40s', '50s', '60s or older'],
      service: ['Civil Service', 'Welfare', 'Housing', 'Medical', 'Jobs'],
    },
    agePlaceholder: "Select Age",
    servicePlaceholder: "Select Service",
    textareaPlaceholder: "Enter situation or speak",
    btnSelect: "Select",
    btnVoice: "Voice",
    btnSubmit: "Complete",
    cancel: "Cancel",
    modalAge: "Age Input",
    modalService: "Service Input",
    voiceMain: "Please speak",
    voiceSubmit: "Finish (Send)",
  },
} as const;

export type QaStrings = typeof STRINGS.ko;
```

- [ ] **Step 2: `src/app/lib/strings/list.ts` 생성**

```ts
export const STRINGS = {
  ko: {
    title: "민원 선택",
    sub: "사용하실 민원을 선택해주세요.",
    btn: "민원 절차 보기",
    langText: "한/영변환",
    highContrast: "고대비모드",
    largeFont: "큰글씨모드",
    chatLabel: "챗봇",
  },
  en: {
    title: "Service Selection",
    sub: "Please select a service.",
    btn: "View Procedure",
    langText: "KO/EN",
    highContrast: "Contrast",
    largeFont: "BigFont",
    chatLabel: "Chat",
  },
} as const;

export type ListStrings = typeof STRINGS.ko;
```

- [ ] **Step 3: `src/app/lib/strings/procedure.ts` 생성**

```ts
export const STRINGS = {
  ko: {
    back: "민원 선택으로",
    progress: "진행률",
    docs: "필요한 서류 보기",
    web: "사이트 바로가기",
    voice: "음성으로 듣기",
    voicePlaying: "재생 중...",
    done: "완료",
    loading: "로딩 중...",
    langText: "한/영변환",
    highContrast: "고대비모드",
    largeFont: "큰글씨모드",
  },
  en: {
    back: "Back",
    progress: "Progress",
    docs: "Required Docs",
    web: "Website",
    voice: "Listen",
    voicePlaying: "Playing...",
    done: "Done",
    loading: "Loading...",
    langText: "KO/EN",
    highContrast: "Contrast",
    largeFont: "Big Font",
  },
} as const;

export type ProcedureStrings = typeof STRINGS.ko;
```

- [ ] **Step 4: `src/app/lib/strings/document.ts` 생성**

기존 document 페이지의 t에 placeholder("필요한 서류 보기") 일부가 `pageTitle`에 덮어쓰이므로, 정적 문자열만 추출:

```ts
export const STRINGS = {
  ko: {
    back: "민원 절차 화면으로",
    docsFallback: "필요한 서류 보기",
    need: "필요 서류",
    read: "자세히보기",
    done: "완료",
    issuer: "발급기관",
    langText: "한/영변환",
    highContrast: "고대비모드",
    largeFont: "큰글씨모드",
  },
  en: {
    back: "Back",
    docsFallback: "Required Docs",
    need: "required documents",
    read: "Read more",
    done: "Done",
    issuer: "Issuer",
    langText: "KO/EN",
    highContrast: "Contrast",
    largeFont: "Big Font",
  },
} as const;

export type DocumentStrings = typeof STRINGS.ko;
```

- [ ] **Step 5: `src/app/lib/strings/chat.ts` 생성**

```ts
export const STRINGS = {
  ko: {
    title: "챗봇 상담",
    back: "뒤로",
    placeholder: "무엇이든 물어보세요",
    send: "전송",
    micPermission: "마이크 권한이 필요합니다.",
    failResponse: "응답을 받지 못했습니다.",
    failServer: "AI 서버와 통신에 실패했습니다.",
    langText: "한/영변환",
    highContrast: "고대비모드",
    largeFont: "큰글씨모드",
  },
  en: {
    title: "Chat",
    back: "Back",
    placeholder: "Ask me anything",
    send: "Send",
    micPermission: "Microphone permission required.",
    failResponse: "No response received.",
    failServer: "Failed to reach AI server.",
    langText: "KO/EN",
    highContrast: "Contrast",
    largeFont: "Big Font",
  },
} as const;

export type ChatStrings = typeof STRINGS.ko;
```

- [ ] **Step 6: 타입체크**

Run: `npx tsc --noEmit -p .`
Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/app/lib/strings/
git commit -m "feat(i18n): extract per-page STRINGS modules (ko/en)"
```

---

## Task 4: /api/i18n 라우트 (디스크 캐시 + translate_batch)

**Files:**
- Create: `src/app/api/i18n/route.ts`
- Modify: `.gitignore`

- [ ] **Step 1: `.gitignore`에 캐시 디렉토리 추가**

`.gitignore` 끝에 한 줄 추가:

```
# i18n disk cache (Task 4)
.cache/
```

- [ ] **Step 2: `src/app/api/i18n/route.ts` 생성**

```ts
import { NextResponse } from 'next/server';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { flatten, unflatten } from '@/app/lib/i18n';
import { STRINGS as QA_STRINGS } from '@/app/lib/strings/qa';
import { STRINGS as LIST_STRINGS } from '@/app/lib/strings/list';
import { STRINGS as PROC_STRINGS } from '@/app/lib/strings/procedure';
import { STRINGS as DOC_STRINGS } from '@/app/lib/strings/document';
import { STRINGS as CHAT_STRINGS } from '@/app/lib/strings/chat';
import { isSupported } from '@/app/lib/languages';

const SOURCES: Record<string, { ko: unknown; en: unknown }> = {
  qa: QA_STRINGS,
  list: LIST_STRINGS,
  procedure: PROC_STRINGS,
  document: DOC_STRINGS,
  chat: CHAT_STRINGS,
};

const CACHE_DIR = path.join(process.cwd(), '.cache', 'i18n');

/**
 * 페이지별 UI 문자열을 지정 언어로 반환.
 * ko/en은 즉시, 그 외는 디스크 캐시 → /translate_batch.
 *
 * GET /api/i18n?page=qa&lang=vi
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') ?? '';
  const lang = searchParams.get('lang') ?? '';

  if (!(page in SOURCES)) {
    return NextResponse.json({ error: 'unknown page' }, { status: 400 });
  }
  if (!lang || !isSupported(lang)) {
    return NextResponse.json({ error: 'unsupported lang' }, { status: 400 });
  }

  const source = SOURCES[page] as { ko: any; en: any };

  if (lang === 'ko') return NextResponse.json(source.ko);
  if (lang === 'en') return NextResponse.json(source.en);

  const cachePath = path.join(CACHE_DIR, `${page}_${lang}.json`);

  // 1) 디스크 캐시 히트
  try {
    const raw = await fs.readFile(cachePath, 'utf-8');
    return NextResponse.json(JSON.parse(raw));
  } catch {
    /* 캐시 미스 */
  }

  // 2) 챗봇 /translate_batch 호출
  try {
    const flat = flatten(source.en);
    const aiRes = await axios.post(
      `${process.env.AI_API_URL}/translate_batch`,
      { texts: flat, target_lang: lang },
      { timeout: 60_000 },
    );
    const translatedFlat = aiRes.data?.translated;
    if (!translatedFlat || typeof translatedFlat !== 'object') {
      throw new Error('invalid translated payload');
    }

    const result = unflatten(translatedFlat as Record<string, string>, source.en);

    // 3) 디스크 캐시 저장 (실패해도 응답은 반환)
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(cachePath, JSON.stringify(result, null, 2), 'utf-8');
    } catch (e) {
      console.warn('i18n cache write 실패(무시):', (e as Error).message);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('AI /translate_batch 실패:', err.message);
    // 폴백: en 그대로 반환 (UI가 멈추지 않게)
    return NextResponse.json(source.en, { status: 200 });
  }
}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit -p .`
Expected: 에러 없음.

- [ ] **Step 4: dev 서버에서 ko/en/vi 직접 호출 검증**

별도 PowerShell 창에서:
```bash
npm run dev
```

다른 창에서:
```bash
curl -sS "http://localhost:3000/api/i18n?page=qa&lang=ko" | head -c 300
curl -sS "http://localhost:3000/api/i18n?page=qa&lang=en" | head -c 300
curl -sS "http://localhost:3000/api/i18n?page=qa&lang=vi" | head -c 600
```
Expected:
- ko → 한국어 STRINGS
- en → English STRINGS
- vi → 베트남어 (또는 en 폴백 + 콘솔에 LLM 실패 로그)
- `.cache/i18n/qa_vi.json` 파일이 생겼는지 `ls .cache/i18n/`로 확인
- 두 번째 vi 호출이 즉시 반환되는지 확인 (네트워크 탭에서 응답 시간)

dev 서버 종료.

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/i18n/route.ts .gitignore
git commit -m "feat(i18n): /api/i18n with translate_batch + disk cache"
```

---

## Task 5: TopSettings를 언어 드롭다운으로 변경

**Files:**
- Modify: `src/app/components/TopSettings.tsx`

- [ ] **Step 1: 파일 전체 재작성**

```tsx
'use client';
import { AArrowUp, SunMoon } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type LangCode } from '../lib/languages';

interface TopSettingsProps {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  isHighContrast: boolean;
  setIsHighContrast: (val: boolean) => void;
  isLargeFont: boolean;
  setIsLargeFont: (val: boolean) => void;
  t: { highContrast: string; largeFont: string };
}

export default function TopSettings({
  lang, setLang, isHighContrast, setIsHighContrast, isLargeFont, setIsLargeFont, t,
}: TopSettingsProps) {
  return (
    <div className="absolute top-5 right-5 flex justify-end items-center gap-3 z-50">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as LangCode)}
        aria-label="Language"
        className="h-8 px-2 rounded border border-gray-300 bg-white text-black text-[14px] font-semibold cursor-pointer"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.native}</option>
        ))}
      </select>

      <div onClick={() => setIsHighContrast(!isHighContrast)} className="flex flex-col items-center cursor-pointer w-[42px]">
        <SunMoon className="w-6 h-6" />
        <span className="text-[10px] font-bold mt-1 text-gray-600 whitespace-nowrap">{t.highContrast}</span>
      </div>
      <div onClick={() => setIsLargeFont(!isLargeFont)} className="flex flex-col items-center cursor-pointer w-[42px]">
        <AArrowUp className="w-6 h-6" />
        <span className="text-[10px] font-bold mt-1 text-gray-600 whitespace-nowrap">{t.largeFont}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit -p .`
Expected: `TopSettings` 호출부(qa/list/procedure/document/chat 페이지)에서 `lang: 'ko' | 'en'` 타입이 `LangCode`와 맞지 않아 에러 발생 — **다음 태스크들(6~10)에서 페이지를 고치면서 해결**. 이 시점에 에러가 있는 것은 정상.

- [ ] **Step 3: 커밋**

```bash
git add src/app/components/TopSettings.tsx
git commit -m "feat(i18n): replace ko/en toggle with language dropdown"
```

---

## Task 6: qa/page.tsx에 useTranslations + LangCode 적용

**Files:**
- Modify: `src/app/qa/page.tsx`

- [ ] **Step 1: import 추가**

파일 상단(`import TopSettings from '../components/TopSettings';` 다음 줄)에 추가:

```tsx
import { useTranslations } from '../lib/i18n';
import { STRINGS as QA_STRINGS } from '../lib/strings/qa';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';
```

- [ ] **Step 2: 기존 `const t = {...}[lang] as any;` 블록 통째로 삭제**

기존 코드의 큰 `const t = { ko: {...}, en: {...} }[lang] as any;` 블록을 전부 삭제하고 그 자리에 다음 한 줄로 교체:

```tsx
const t = useTranslations('qa', QA_STRINGS, lang);
```

- [ ] **Step 3: `lang` 상태 타입을 `LangCode`로 변경**

```tsx
// 변경 전
const [lang, setLang] = useState<'ko' | 'en'>('ko');
// 변경 후
const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
```

- [ ] **Step 4: localStorage 읽기 부분에서 lang 검증**

기존:
```tsx
const savedLang = localStorage.getItem('app_lang') as 'ko' | 'en';
if (savedLang) setLang(savedLang);
```
변경:
```tsx
const savedLang = localStorage.getItem('app_lang') ?? '';
if (isSupported(savedLang)) setLang(savedLang);
```

- [ ] **Step 5: `handleLang` 시그니처를 LangCode로 변경**

```tsx
const handleLang = (newLang: LangCode) => {
  setLang(newLang);
  localStorage.setItem('app_lang', newLang);
};
```

- [ ] **Step 6: STT 호출 시 lang 그대로 전달**

`uploadVoice` 안의 `formData.append('language', lang);`은 그대로 둔다 (lang은 이미 LangCode 문자열).

- [ ] **Step 7: 타입체크**

Run: `npx tsc --noEmit -p .`
Expected: qa 페이지 관련 에러 0개. 다른 페이지(list/procedure/document/chat)는 아직 미수정이라 에러 남아있음 — 정상.

- [ ] **Step 8: 커밋**

```bash
git add src/app/qa/page.tsx
git commit -m "feat(i18n): apply useTranslations + LangCode to qa page"
```

---

## Task 7: list/page.tsx에 useTranslations + LangCode 적용

**Files:**
- Modify: `src/app/list/page.tsx`

- [ ] **Step 1: import 추가**

```tsx
import { useTranslations } from '../lib/i18n';
import { STRINGS as LIST_STRINGS } from '../lib/strings/list';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';
```

- [ ] **Step 2: 기존 `const t = {...}[lang];` 라인을 다음으로 교체**

```tsx
const t = useTranslations('list', LIST_STRINGS, lang);
```

- [ ] **Step 3: `lang` 상태 타입 변경**

```tsx
const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
```

- [ ] **Step 4: localStorage 검증 추가**

```tsx
const savedLang = localStorage.getItem('app_lang') ?? '';
if (isSupported(savedLang)) setLang(savedLang);
```

- [ ] **Step 5: `handleLang` 시그니처 변경**

```tsx
const handleLang = (val: LangCode) => { setLang(val); localStorage.setItem('app_lang', val); };
```

- [ ] **Step 6: `ChatFab` 라벨에 `t.chatLabel` 사용**

```tsx
<ChatFab isHighContrast={isHighContrast} label={t.chatLabel} />
```

(기존 `lang === 'ko' ? '챗봇' : 'Chat'` 삼항 제거.)

- [ ] **Step 7: 카드 안에서 title/description의 `[lang]` 접근 처리**

기존:
```tsx
{item.title[lang]}
{item.description[lang]}
```
listData는 `{ko, en}` 객체로 들어옴(`getListData`에서). lang이 ko/en이 아닐 수 있으니 폴백:
```tsx
{item.title[lang as 'ko' | 'en'] ?? item.title.en}
{item.description[lang as 'ko' | 'en'] ?? item.description.en}
```

- [ ] **Step 8: 타입체크**

Run: `npx tsc --noEmit -p .`
Expected: list 페이지 에러 0개.

- [ ] **Step 9: 커밋**

```bash
git add src/app/list/page.tsx
git commit -m "feat(i18n): apply useTranslations + LangCode to list page"
```

---

## Task 8: list/procedure/[id]/page.tsx에 적용

**Files:**
- Modify: `src/app/list/procedure/[id]/page.tsx`

- [ ] **Step 1: import 추가**

```tsx
import { useTranslations } from '../../../lib/i18n';
import { STRINGS as PROC_STRINGS } from '../../../lib/strings/procedure';
import { DEFAULT_LANG, isSupported, type LangCode } from '../../../lib/languages';
```

- [ ] **Step 2: 기존 `const t = {...}[lang] as any;` → 한 줄로 교체**

```tsx
const t = useTranslations('procedure', PROC_STRINGS, lang);
```

- [ ] **Step 3: `lang` 상태 + localStorage 검증 + `handleLang` 시그니처 변경**

Task 6 Step 3~5와 동일한 패턴으로 변경 (`'ko'|'en'` → `LangCode`).

- [ ] **Step 4: 로딩 텍스트도 t.loading 사용**

기존:
```tsx
if (loading) return <div ...>로딩 중...</div>;
```
변경:
```tsx
if (loading) return <div ...>{t.loading}</div>;
```

- [ ] **Step 5: TTS 버튼 라벨**

```tsx
{ttsLoadingId === step.id ? t.voicePlaying : t.voice}
```

(기존 `'재생 중...'` 하드코딩 제거.)

- [ ] **Step 6: serviceName ko/en 접근 폴백**

```tsx
<h1 ...>{lang === 'en' ? serviceName.en : serviceName.ko}</h1>
```
이미 비슷한 형태이지만, ko/en 외 언어에서도 한국어가 뜨도록 변경 (서버명은 번역 대상 아님):
```tsx
<h1 ...>{lang === 'en' && serviceName.en ? serviceName.en : serviceName.ko}</h1>
```

- [ ] **Step 7: 타입체크**

Run: `npx tsc --noEmit -p .`
Expected: procedure 페이지 에러 0개.

- [ ] **Step 8: 커밋**

```bash
git add src/app/list/procedure/[id]/page.tsx
git commit -m "feat(i18n): apply useTranslations + LangCode to procedure page"
```

---

## Task 9: list/document/[id]/page.tsx에 적용

**Files:**
- Modify: `src/app/list/document/[id]/page.tsx`

- [ ] **Step 1: import 추가**

```tsx
import { useTranslations } from '../../../lib/i18n';
import { STRINGS as DOC_STRINGS } from '../../../lib/strings/document';
import { DEFAULT_LANG, isSupported, type LangCode } from '../../../lib/languages';
```

- [ ] **Step 2: `const t = {...}[lang] as any;` → 한 줄로 교체**

```tsx
const t = useTranslations('document', DOC_STRINGS, lang);
```

- [ ] **Step 3: `lang` 상태 + localStorage 검증 + `handleLang` 변경**

Task 6 Step 3~5와 동일.

- [ ] **Step 4: 페이지 타이틀 fallback 조정**

기존 `const t = { ko: { docs: pageTitle || "필요한 서류 보기", ... } }` 패턴은 STRINGS로 옮기면서 정적 텍스트가 됐으므로, 화면 렌더에서 분기:
```tsx
<h1 ...>{pageTitle || t.docsFallback}</h1>
```

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit -p .`
Expected: document 페이지 에러 0개.

- [ ] **Step 6: 커밋**

```bash
git add src/app/list/document/[id]/page.tsx
git commit -m "feat(i18n): apply useTranslations + LangCode to document page"
```

---

## Task 10: chat/page.tsx에 적용

**Files:**
- Modify: `src/app/chat/page.tsx`

- [ ] **Step 1: import 추가**

```tsx
import { useTranslations } from '../lib/i18n';
import { STRINGS as CHAT_STRINGS } from '../lib/strings/chat';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';
```

- [ ] **Step 2: `const t = {...}[lang] as any;` → 한 줄로 교체**

```tsx
const t = useTranslations('chat', CHAT_STRINGS, lang);
```

- [ ] **Step 3: `lang` 상태 + localStorage 검증 + `handleLang` 변경**

Task 6 Step 3~5와 동일.

- [ ] **Step 4: 하드코딩된 알림 문자열을 t로 교체**

```tsx
} catch { alert(t.micPermission); }
```
```tsx
content: data.answer ?? data.error ?? t.failResponse
```
```tsx
copy[copy.length - 1] = { role: 'assistant', content: t.failServer };
```

- [ ] **Step 5: 타입체크 + 빌드 일관성**

Run: `npx tsc --noEmit -p .`
Expected: 전체 프로젝트 에러 0개 (모든 페이지 변경 완료).

- [ ] **Step 6: 커밋**

```bash
git add src/app/chat/page.tsx
git commit -m "feat(i18n): apply useTranslations + LangCode to chat page"
```

---

## Task 11: 비자 상수 + qa에 visa_type 입력

**Files:**
- Create: `src/app/lib/visa.ts`
- Modify: `src/app/qa/page.tsx`

- [ ] **Step 1: `src/app/lib/visa.ts` 생성**

```ts
export type VisaOption = {
  code: string;          // 서버에 전송될 코드 ('' = 미지정, 'OTHER' = 사용자 자유 입력 모드)
  label_ko: string;
  label_en: string;
};

export const COMMON_VISAS: VisaOption[] = [
  { code: '',     label_ko: '미지정', label_en: 'Unspecified' },
  { code: 'E-9',  label_ko: 'E-9 비전문취업', label_en: 'E-9 Non-professional Employment' },
  { code: 'H-2',  label_ko: 'H-2 방문취업',   label_en: 'H-2 Working Visit' },
  { code: 'F-4',  label_ko: 'F-4 재외동포',   label_en: 'F-4 Overseas Korean' },
  { code: 'F-5',  label_ko: 'F-5 영주',       label_en: 'F-5 Permanent Resident' },
  { code: 'F-6',  label_ko: 'F-6 결혼이민',   label_en: 'F-6 Marriage Migration' },
  { code: 'D-2',  label_ko: 'D-2 유학',       label_en: 'D-2 Student' },
  { code: 'D-4',  label_ko: 'D-4 일반연수',   label_en: 'D-4 General Training' },
  { code: 'E-2',  label_ko: 'E-2 회화지도',   label_en: 'E-2 Foreign Language Instructor' },
  { code: 'OTHER', label_ko: '기타 (직접 입력)', label_en: 'Other (specify)' },
];

/** 사용자가 입력한 raw 문자열을 서버가 인식할 형식으로 정규화 */
export function normalizeVisa(raw: string): string {
  if (!raw) return '';
  // 'f5' / 'F5' / 'F-5' / 'f-5' → 'F-5'
  const m = raw.trim().toUpperCase().match(/^([A-Z])-?(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2]}`;
  return raw.trim();
}
```

- [ ] **Step 2: qa/page.tsx에 visa_type state 추가**

기존 selections 타입을 확장:
```tsx
const [selections, setSelections] = useState({
  type: '', age: '', service: '', detail: '', visa_type: ''
});
```

또한 자유 입력 모드용 별도 state:
```tsx
const [visaOtherText, setVisaOtherText] = useState('');
const [visaMode, setVisaMode] = useState<'select' | 'other'>('select');
```

- [ ] **Step 3: import COMMON_VISAS + normalizeVisa 추가**

```tsx
import { COMMON_VISAS, normalizeVisa } from '../lib/visa';
```

- [ ] **Step 4: type이 외국인일 때 보일 visa 섹션 추가**

`{/* 유형 선택 카드 */}` `</section>` 바로 다음(연령 카드 위)에 삽입:

```tsx
{(selections.type === '외국인' || selections.type === 'Foreigner') && (
  <section className={`w-full max-w-[380px] p-6 rounded-[15px] shadow-sm ${cardClass}`}>
    <h2 className="text-[32px] font-bold mb-1 leading-none">1-1.</h2>
    <p className="text-[20px] font-bold mb-4">{lang === 'ko' ? '비자 종류는?' : 'Visa type?'}</p>
    <select
      value={visaMode === 'other' ? 'OTHER' : selections.visa_type}
      onChange={(e) => {
        const v = e.target.value;
        if (v === 'OTHER') {
          setVisaMode('other');
          setSelections((p) => ({ ...p, visa_type: visaOtherText }));
        } else {
          setVisaMode('select');
          setSelections((p) => ({ ...p, visa_type: v }));
        }
      }}
      className={`w-full h-[52px] p-4 rounded-[10px] border outline-none ${fontSizeClass} ${inputClass} font-medium`}
    >
      {COMMON_VISAS.map((v) => (
        <option key={v.code || 'none'} value={v.code}>
          {lang === 'ko' ? v.label_ko : v.label_en}
        </option>
      ))}
    </select>
    {visaMode === 'other' && (
      <input
        type="text"
        value={visaOtherText}
        onChange={(e) => {
          setVisaOtherText(e.target.value);
          setSelections((p) => ({ ...p, visa_type: normalizeVisa(e.target.value) }));
        }}
        placeholder={lang === 'ko' ? '예: G-1, A-2' : 'e.g. G-1, A-2'}
        className={`mt-3 w-full h-[52px] p-4 rounded-[10px] border outline-none ${fontSizeClass} ${inputClass} font-medium`}
      />
    )}
  </section>
)}
```

- [ ] **Step 5: handleSubmit의 /analyze 페이로드에 visa_type 추가**

```tsx
body: JSON.stringify({
  user_type: mapUserType(selections.type),
  age_group: mapAgeGroup(selections.age),
  category: mapCategory(selections.service),
  detail: selections.detail,
  lang,
  visa_type: selections.visa_type ? normalizeVisa(selections.visa_type) : ''
})
```

- [ ] **Step 6: final_context에 visa_type 자동 포함**

이미 `const userContext = { ...selections, lang, submitted_at: ... }`로 저장되므로 selections에 visa_type이 있으면 자동 포함됨. 추가 작업 불필요.

- [ ] **Step 7: 타입체크**

Run: `npx tsc --noEmit -p .`
Expected: 에러 없음.

- [ ] **Step 8: 커밋**

```bash
git add src/app/lib/visa.ts src/app/qa/page.tsx
git commit -m "feat(visa): add visa_type dropdown to qa for foreigner users"
```

---

## Task 12: chat/page.tsx에서 visa_type 읽고 송신

**Files:**
- Modify: `src/app/chat/page.tsx`

- [ ] **Step 1: visa_type 추출 헬퍼 추가**

`userTypeFromContext` 함수 아래에 추가:

```tsx
const visaFromContext = (): string => {
  try {
    const ctx = JSON.parse(localStorage.getItem('final_context') ?? 'null');
    if (ctx && typeof ctx.visa_type === 'string') return ctx.visa_type;
  } catch {}
  return '';
};
```

- [ ] **Step 2: `/api/chat/stream` 호출 body에 visa_type 포함**

```tsx
body: JSON.stringify({
  question: text,
  user_type: userTypeFromContext(),
  visa_type: visaFromContext(),
  lang,
  history: messages.map(m => ({ role: m.role, content: m.content })),
  session_id: sessionId,
}),
```

- [ ] **Step 3: `fallbackToChat`의 `/api/chat` 호출 body에도 동일하게 추가**

```tsx
body: JSON.stringify({
  question,
  user_type: userTypeFromContext(),
  visa_type: visaFromContext(),
  lang,
  history: current.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
  session_id: sessionId,
}),
```

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit -p .`
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/app/chat/page.tsx
git commit -m "feat(visa): forward visa_type from final_context to chat API"
```

---

## Task 13: 전체 빌드 + 수동 회귀 테스트

**Files:** (변경 없음)

- [ ] **Step 1: lint 통과 확인**

Run: `npm run lint`
Expected: 에러 0개 (경고는 무시 가능).

- [ ] **Step 2: production 빌드 통과 확인**

Run: `npm run build`
Expected: 빌드 성공 ("✓ Compiled successfully").

- [ ] **Step 3: dev 서버 기동**

Run: `npm run dev`

- [ ] **Step 4: 브라우저로 각 시나리오 확인**

`http://localhost:3000/qa`에서:
- 언어 드롭다운에 14개 언어 노출 확인.
- '한국어' → 모든 라벨 한국어.
- 'English' → 모든 라벨 영어.
- 'Tiếng Việt' → 첫 접속 시 잠시 영어 보였다가 베트남어로 교체. 새로고침 후에는 즉시 베트남어.
- 'Foreigner' 라디오 선택 → 1-1 비자 섹션이 노출. 'F-5 영주' 선택 후 다른 라디오로 변경하면 섹션 사라짐.
- 'F-5' 선택, 4번 질문에 텍스트 입력 후 입력 완료 → /list로 이동.

`/list`에서:
- 추천 민원 목록이 selections + visa_type 기반으로 출력됨.
- TopSettings 언어 변경이 그대로 유지(localStorage).

`/chat`에서:
- 좌하단 챗봇 입력에 한국어 질문 → 한국어 답변.
- 언어 베트남어로 변경 후 질문 → 베트남어 답변.
- 비자 'F-5' 선택했으면 챗봇 응답에서 외국인 전용 안내(1345 등)가 나오는지 확인.

`.cache/i18n/` 디렉토리에 `qa_vi.json`, `chat_vi.json` 등이 쌓였는지 확인.

- [ ] **Step 5: dev 서버 종료 + 최종 커밋(필요 시)**

수정 사항 없으면 커밋 생략.

---

## Self-Review 체크리스트

- [x] **Spec coverage:** 사용자 의도(외국인이 자기 언어로 챗봇 쓰기 + 비자별 자격 받기) → Task 5~10이 다국어, Task 11~12가 비자.
- [x] **Placeholder scan:** "TBD", "구현 나중에", "에러 핸들링 추가" 같은 표현 없음.
- [x] **Type consistency:** `LangCode`, `STRINGS`, `useTranslations`, `COMMON_VISAS`, `normalizeVisa` 이름이 정의/사용처에서 일치.
- [x] **누락 확인:** TopSettings의 `langText`는 이제 안 쓰이므로 STRINGS에서 제거해도 되지만, 다른 페이지 호환을 위해 일단 남김(향후 정리 가능). `t={t}` 시그니처는 highContrast/largeFont 두 키만 필요하도록 좁혔으므로 호출부에 영향 없음(객체 구조 분해 아님).

---

## Execution Handoff

플랜 저장 위치: `docs/superpowers/plans/2026-05-31-multilang-and-visa.md`

실행 방식 두 가지:

1. **Subagent-Driven (권장)** — 태스크당 새 서브에이전트 디스패치, 태스크 사이에 리뷰. 컨텍스트가 깨끗해서 누락 적음.
2. **Inline Execution** — 같은 세션에서 이어서 실행, 중간 체크포인트로 리뷰.

어느 쪽으로 갈까요?
