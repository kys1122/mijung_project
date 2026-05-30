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
