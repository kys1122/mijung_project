"use client"

import { useEffect, useMemo, useState } from "react";
import { useAppLang } from "./app-prefs";

/**
 * 한국어 UI 텍스트 배열을 현재 언어로 번역해서 사전으로 반환.
 * lang === 'ko' 면 원문 그대로.
 * 캐시 hit은 즉시, miss는 LLM 번역(서버 캐싱 포함) 후 갱신.
 */

const memCache = new Map<string, string>(); // key = `${lang}::${ko}` → translated

export function useUiText(koTexts: ReadonlyArray<string>): {
  t: (ko: string) => string;
  ready: boolean;
} {
  const [lang] = useAppLang();
  const key = useMemo(() => koTexts.slice().sort().join('||'), [koTexts]);
  const [, force] = useState(0);

  useEffect(() => {
    if (lang === 'ko') return;
    const missing = koTexts.filter(ko => ko && !memCache.has(`${lang}::${ko}`));
    if (missing.length === 0) return;
    let cancelled = false;
    fetch('/api/ui-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: missing, lang, source_lang: 'ko' }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled || !d?.success) return;
        for (const [src, tr] of Object.entries(d.translations ?? {})) {
          memCache.set(`${lang}::${src}`, String(tr));
        }
        force(n => n + 1); // 리렌더 트리거
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, key]);

  const t = (ko: string) => {
    if (lang === 'ko' || !ko) return ko;
    return memCache.get(`${lang}::${ko}`) ?? ko; // 캐시 miss는 원문(한국어) 폴백
  };
  const ready = lang === 'ko' || koTexts.every(ko => !ko || memCache.has(`${lang}::${ko}`));
  return { t, ready };
}
