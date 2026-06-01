"use client"

import { useEffect, useState, useMemo } from "react";

export type ServiceT = { name?: string; overview?: string; eligibility?: string };

const memCache = new Map<string, ServiceT>();

/**
 * 여러 민원 번역을 한 번의 batch 요청으로 가져온다.
 * 메모리 캐시로 같은 ID·lang 조합 재호출 방지.
 */
export function useServiceTranslations(serviceIds: Array<number | string | null | undefined>, lang: string) {
  const idsKey = useMemo(
    () => Array.from(new Set(serviceIds.map(Number).filter(n => n > 0))).sort().join(','),
    [serviceIds]
  );
  const [map, setMap] = useState<Record<number, ServiceT>>({});

  useEffect(() => {
    if (!idsKey || lang === 'ko') { setMap({}); return; }
    const ids = idsKey.split(',').map(Number);
    // 메모리 캐시에서 hit 분 채움
    const cached: Record<number, ServiceT> = {};
    const missing: number[] = [];
    for (const id of ids) {
      const k = `${id}:${lang}`;
      const v = memCache.get(k);
      if (v) cached[id] = v;
      else missing.push(id);
    }
    setMap(cached);
    if (missing.length === 0) return;

    let cancelled = false;
    fetch('/api/service-translation/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_ids: missing, lang }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled || !d?.success) return;
        const next: Record<number, ServiceT> = { ...cached };
        for (const [k, v] of Object.entries(d.translations ?? {})) {
          const id = Number(k);
          const tr = v as ServiceT;
          memCache.set(`${id}:${lang}`, tr);
          next[id] = tr;
        }
        setMap(next);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [idsKey, lang]);

  return map;
}
