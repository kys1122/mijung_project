"use client"

import { useEffect, useState, useRef } from "react";
import { useAppLang } from "./app-prefs";

const memCache = new Map<string, string>(); // key = `${lang}::${ko}`

// lang별 큐 + 진행 중 fetch
const queues = new Map<string, Set<string>>(); // lang → pending ko texts
const fetching = new Map<string, Promise<void>>(); // lang → 진행 중 fetch
const subscribers = new Map<string, Set<() => void>>(); // lang → onReady 콜백들

function scheduleFetch(lang: string) {
  if (fetching.has(lang)) return;
  // microtask로 즉시 — 같은 tick에 모인 텍스트는 한 batch로 묶임
  const promise = (async () => {
    // 한 microtask 양보 — render 중 등록된 모든 텍스트를 모음
    await Promise.resolve();
    while (true) {
      const q = queues.get(lang);
      if (!q || q.size === 0) {
        fetching.delete(lang);
        return;
      }
      const texts = Array.from(q);
      q.clear();
      try {
        const res = await fetch('/api/ui-translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts, lang, source_lang: 'ko' }),
        });
        const data = await res.json();
        if (data?.success && data.translations) {
          for (const [src, tr] of Object.entries(data.translations)) {
            memCache.set(`${lang}::${src}`, String(tr));
          }
        }
      } catch (e) {
        console.error('ui-translate batch 실패:', e);
      }
      // 구독자에게 알림 (전환된 후 새 페이지가 구독했으면 자동으로 갱신)
      subscribers.get(lang)?.forEach(cb => cb());
      // 큐에 새로 쌓인 게 있으면 같은 인스턴스 안에서 계속
    }
  })();
  fetching.set(lang, promise);
}

/**
 * 호출만 하면 자동 번역되는 t 함수.
 * - lang === 'ko' || lang === undefined → 원문 반환
 * - 캐시 hit → 즉시 반환
 * - 캐시 miss → 큐에 등록 + batch fetch + 도착하면 리렌더, 그동안 원문(한국어) 폴백
 */
export function useT() {
  const [lang] = useAppLang();
  const [, force] = useState(0);
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    if (lang === 'ko') return;
    if (!subscribers.has(lang)) subscribers.set(lang, new Set());
    const cb = () => force(n => n + 1);
    subscribers.get(lang)!.add(cb);
    return () => { subscribers.get(lang)?.delete(cb); };
  }, [lang]);

  const t = (ko: string) => {
    if (!ko || lang === 'ko') return ko;
    const cached = memCache.get(`${lang}::${ko}`);
    if (cached) return cached;
    // 큐에 등록 + fetch 트리거
    if (!queues.has(lang)) queues.set(lang, new Set());
    const q = queues.get(lang)!;
    if (!q.has(ko)) {
      q.add(ko);
      // 다음 tick에 schedule (렌더 중 호출 안전)
      Promise.resolve().then(() => scheduleFetch(lang));
    }
    return ko; // 폴백 — 번역 도착하면 force로 리렌더
  };
  return t;
}
