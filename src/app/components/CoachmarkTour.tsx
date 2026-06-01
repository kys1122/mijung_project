"use client"

import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

export type TourStep = {
  path?: string;
  selector?: string;
  emoji: string;
  badge?: string;
  title: string;
  body: string;
  padding?: number;
};

type Props = {
  open: boolean;
  steps: TourStep[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: (finished: boolean) => void;
};

type Rect = { top: number; left: number; width: number; height: number };
const PAD_DEFAULT = 10;
const SHEET_RESERVE = 420; // 시트 + 하단 네비(64) + 여유

export default function CoachmarkTour({ open, steps, index, onIndexChange, onClose }: Props) {
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const recompute = useCallback(() => {
    if (!open || !step) return;
    if (!step.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const visibleHeight = window.innerHeight - SHEET_RESERVE;
    const margin = 40;
    if (r.top < margin || r.bottom > visibleHeight - margin) {
      const targetY = window.scrollY + r.top - (visibleHeight - r.height) / 2;
      // smooth scroll은 라우팅 직후 무거우니까 즉시 이동
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'auto' });
      const r2 = el.getBoundingClientRect();
      setRect({ top: r2.top, left: r2.left, width: r2.width, height: r2.height });
    } else {
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
  }, [open, step]);

  useLayoutEffect(() => { recompute(); }, [recompute]);

  useEffect(() => {
    if (!open || !step?.selector) return;
    // 페이지 직후 element가 늦게 그려질 수 있으니 2번만 retry
    const timers = [120, 400].map(ms => setTimeout(recompute, ms));
    return () => timers.forEach(clearTimeout);
  }, [open, step?.selector, recompute, index]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => recompute();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, recompute]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  // 투어 활성 중에는 페이지 컨텐츠가 시트에 가리지 않도록 body padding + BottomNav 숨김
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevPad = document.body.style.paddingBottom;
    document.body.style.paddingBottom = `${SHEET_RESERVE}px`;
    html.classList.add('coach-active');
    return () => {
      document.body.style.paddingBottom = prevPad;
      html.classList.remove('coach-active');
    };
  }, [open]);

  if (!open || !step) return null;

  const pad = step.padding ?? PAD_DEFAULT;
  const hole = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  const next = () => isLast ? finish() : onIndexChange(index + 1);
  const prev = () => index > 0 && onIndexChange(index - 1);
  const skip = () => onClose(false);
  const finish = () => onClose(true);

  // Radial spotlight 중심 좌표
  const centerX = hole ? hole.left + hole.width / 2 : 0;
  const centerY = hole ? hole.top + hole.height / 2 : 0;
  // 강조 영역이 충분히 보이는 환한 반경 + 부드러운 페이드
  const clearR = hole ? Math.max(hole.width, hole.height) * 0.7 + 30 : 0;
  const fadeR = hole ? clearR + 220 : 0;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none" role="dialog" aria-modal="true" aria-label="앱 안내">
      {/* Radial spotlight — 강조 영역 중심으로 환하고, 외곽으로 부드럽게 어두워짐 (15%) */}
      <div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-auto"
        onClick={skip}
        style={{
          background: hole
            ? `radial-gradient(circle at ${centerX}px ${centerY}px, rgba(0,0,0,0) 0px, rgba(0,0,0,0) ${clearR}px, rgba(15,23,42,0.18) ${fadeR}px, rgba(15,23,42,0.22) 100%)`
            : 'rgba(15,23,42,0.18)',
        }}
      />

      {/* 강조 박스 — 페이지 위에 둥실 떠 있음 */}
      {hole && (
        <>
          <div
            className="absolute rounded-2xl pointer-events-none animate-coach-pulse"
            style={{
              top: hole.top - 4,
              left: hole.left - 4,
              width: hole.width + 8,
              height: hole.height + 8,
            }}
          />
          <div
            className="absolute rounded-2xl ring-[3px] ring-brand-500 transition-all duration-300 pointer-events-none"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
              boxShadow: '0 0 0 6px rgba(59,130,246,0.15), 0 20px 50px rgba(37,99,235,0.20)',
            }}
          />
        </>
      )}

      {/* iOS 액션시트 — BottomNav 위에 위치 (BottomNav h-16 = 64px) */}
      <div
        key={index}
        className="absolute left-0 right-0 pointer-events-auto animate-sheet-up"
        style={{ bottom: 64, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-3 sm:mx-auto sm:max-w-lg bg-surface rounded-[28px] sm:mb-2 shadow-[0_-12px_40px_-8px_rgba(15,23,42,0.18),0_8px_24px_-4px_rgba(15,23,42,0.12)] border border-line-soft overflow-hidden">
          {/* 그래버 */}
          <div className="pt-2.5 pb-1 flex justify-center">
            <span className="block w-10 h-1.5 rounded-full bg-line-strong/70" aria-hidden />
          </div>

          {/* 상단 메타 — 배지 + 진행점 + 닫기 */}
          <div className="px-6 pt-3 pb-1 flex items-center justify-between gap-3">
            {step.badge && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold tracking-wide">
                {step.badge}
              </span>
            )}
            <div className="flex-1 flex items-center justify-center gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? 'w-6 bg-brand-600' : i < index ? 'w-1.5 bg-brand-300' : 'w-1.5 bg-line-base'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={skip}
              aria-label="안내 닫기"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-ink-3 hover:text-ink-1 hover:bg-surface-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 본문 — 큰 타이틀 + 이모지 */}
          <div className="px-6 pt-4 pb-5">
            <div className="flex items-start gap-3">
              <span className="text-[40px] leading-none mt-0.5" aria-hidden>{step.emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-[22px] sm:text-[26px] font-bold text-ink-1 tracking-tight leading-tight">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-base sm:text-[17px] text-ink-2 leading-relaxed">
                  {step.body}
                </p>
              </div>
            </div>
          </div>

          {/* 액션 영역 — iOS는 큰 풀너비 버튼 + 보조 텍스트 액션 */}
          <div className="px-5 pb-5">
            <div className="flex items-center gap-2">
              <button
                onClick={prev}
                disabled={index === 0}
                className="inline-flex items-center justify-center rounded-2xl bg-surface-muted text-ink-2 hover:bg-line-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                style={{ width: 54, height: 54 }}
                aria-label="이전"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl text-[17px] font-bold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-700 transition-colors"
                style={{ height: 54, letterSpacing: '-0.01em' }}
              >
                {isLast ? '시작하기' : '다음'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={skip}
              className="mt-2 w-full text-center text-[15px] font-semibold text-ink-3 hover:text-ink-1 py-2.5 rounded-xl hover:bg-surface-muted transition-colors"
            >
              건너뛰기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
