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
