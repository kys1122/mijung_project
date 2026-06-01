"use client"

import { useEffect, useState } from "react";

type Translation = { name?: string; overview?: string; eligibility?: string };

const memCache = new Map<string, Translation>();

/**
 * 민원 번역 캐시 hook.
 * lang === 'ko' 또는 service_id 없으면 fetch 안 함.
 * 결과는 메모리에도 캐시되어 같은 페이지 내 재호출 방지.
 */
export function useServiceTranslation(serviceId: number | string | null | undefined, lang: string) {
  const [data, setData] = useState<Translation | null>(null);

  useEffect(() => {
    if (!serviceId || lang === 'ko') { setData(null); return; }
    const id = Number(serviceId);
    if (!id) { setData(null); return; }

    const key = `${id}:${lang}`;
    const cached = memCache.get(key);
    if (cached) { setData(cached); return; }

    let cancelled = false;
    fetch(`/api/service-translation?service_id=${id}&lang=${lang}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled || !d?.success) return;
        const t: Translation = { name: d.name, overview: d.overview, eligibility: d.eligibility };
        memCache.set(key, t);
        setData(t);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [serviceId, lang]);

  return data;
}
