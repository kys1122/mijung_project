'use client';

import { useEffect, useState } from 'react';
import { flatten, unflatten } from './i18n-utils';

// re-export for backward compatibility with existing callers
export { flatten, unflatten };

/**
 * 페이지별 UI 문자열을 현재 언어로 반환.
 * ko/en은 동기 반환, 그 외는 /api/i18n에서 비동기 조회.
 * 로딩 중에는 en을 표시.
 *
 * ⚠ dict는 module-level 상수여야 함. 컴포넌트 내부에서 인라인 객체로
 *   넘기면 매 렌더마다 새 레퍼런스가 되어 useEffect가 무한 재실행됨.
 *   사용 예: `import { STRINGS } from '../lib/strings/qa'`로 가져온 뒤
 *   `useTranslations('qa', STRINGS, lang)`.
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
