"use client"

import { useEffect, useState } from "react";
import { DEFAULT_LANG, isSupported, type LangCode } from "./languages";

/**
 * 앱 전체 설정(언어/고대비/큰글씨) — 한 곳에서 변경하면 모든 페이지·컴포넌트에 즉시 반영.
 *
 * 동작:
 *  - localStorage에 영속 저장
 *  - 같은 탭의 다른 페이지/컴포넌트에는 CustomEvent로 즉시 알림
 *  - 다른 탭에는 storage event로 자동 동기화 (브라우저 기본)
 */

const LANG_KEY = 'app_lang';
const CONTRAST_KEY = 'app_contrast';
const FONT_KEY = 'app_font';

const EV_LANG = 'app:lang-change';
const EV_CONTRAST = 'app:contrast-change';
const EV_FONT = 'app:font-change';

function safeRead<T>(key: string, parse: (v: string | null) => T): T {
  if (typeof window === 'undefined') return parse(null);
  try { return parse(localStorage.getItem(key)); } catch { return parse(null); }
}

function broadcast(event: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(event, { detail: value }));
}

// === 언어 ===
export function setAppLang(lang: LangCode) {
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
  broadcast(EV_LANG, lang);
}

export function useAppLang(): [LangCode, (l: LangCode) => void] {
  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);

  useEffect(() => {
    const initial = safeRead(LANG_KEY, v => (v && isSupported(v) ? v : DEFAULT_LANG));
    setLang(initial);

    const onCustom = (e: Event) => {
      const v = (e as CustomEvent).detail;
      if (typeof v === 'string' && isSupported(v)) setLang(v);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LANG_KEY) return;
      if (e.newValue && isSupported(e.newValue)) setLang(e.newValue);
    };
    window.addEventListener(EV_LANG, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EV_LANG, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return [lang, setAppLang];
}

// === 고대비 ===
export function setAppContrast(on: boolean) {
  try { localStorage.setItem(CONTRAST_KEY, String(on)); } catch {}
  broadcast(EV_CONTRAST, on);
}

export function useAppContrast(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(safeRead(CONTRAST_KEY, v => v === 'true'));
    const onCustom = (e: Event) => setOn(!!(e as CustomEvent).detail);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONTRAST_KEY) setOn(e.newValue === 'true');
    };
    window.addEventListener(EV_CONTRAST, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EV_CONTRAST, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return [on, setAppContrast];
}

// === 큰글씨 ===
export function setAppLargeFont(on: boolean) {
  try { localStorage.setItem(FONT_KEY, String(on)); } catch {}
  broadcast(EV_FONT, on);
}

export function useAppLargeFont(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(safeRead(FONT_KEY, v => v === 'true'));
    const onCustom = (e: Event) => setOn(!!(e as CustomEvent).detail);
    const onStorage = (e: StorageEvent) => {
      if (e.key === FONT_KEY) setOn(e.newValue === 'true');
    };
    window.addEventListener(EV_FONT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EV_FONT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return [on, setAppLargeFont];
}
