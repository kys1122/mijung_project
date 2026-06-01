"use client"

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles, ClipboardCheck, Mic, AArrowUp, SunMoon, Languages, Users, ChevronRight, ChevronLeft, X,
} from "lucide-react";

type Slide = {
  emoji: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  title: string;
  body: string;
  tips?: string[];
  Icon: React.ComponentType<{ className?: string }>;
};

const SLIDES: Slide[] = [
  {
    emoji: '👋',
    badge: '환영해요',
    badgeBg: 'bg-brand-50',
    badgeText: 'text-brand-700',
    title: '민원을 쉽게 안내해드릴게요',
    body: '몇 가지 질문에 답하면 나에게 맞는 민원을 찾아드리고, 신청에 필요한 단계와 서류까지 차근차근 알려드려요.',
    Icon: Sparkles,
  },
  {
    emoji: '💬',
    badge: '1단계',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    title: '챗봇이 첫 안내자예요',
    body: '"챗봇과 상담하기"를 누르면 유형 → 연령대 → 카테고리 → 상황 순서로 짧게 묻고, AI가 맞춤 민원을 골라드려요.',
    tips: ['답하기 어려우면 "잘 모르겠어요"를 골라도 돼요', '마이크 버튼으로 말로 입력할 수 있어요'],
    Icon: Sparkles,
  },
  {
    emoji: '📋',
    badge: '2단계',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    title: '진행 상황은 자동 저장돼요',
    body: '체크리스트를 하나씩 체크하면 진행률이 자동으로 기록돼요. 다음에 들어와도 멈춘 자리에서 이어서 진행할 수 있어요.',
    tips: ['오프라인 신청 / 온라인 신청 진행률이 따로 보여요', '한 트랙을 모두 마치면 자동으로 "신청 완료"로 표시돼요'],
    Icon: ClipboardCheck,
  },
  {
    emoji: '🎙️',
    badge: '3단계',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    title: '글이 어려우면 음성으로',
    body: '마이크 버튼으로 말하면 글자로 바꿔드리고, 스피커 버튼을 누르면 안내를 읽어드려요.',
    tips: ['처음 누르면 마이크 권한을 허용해주세요'],
    Icon: Mic,
  },
  {
    emoji: '⚙️',
    badge: '편의 기능',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    title: '화면이 안 보이거나 어려우면',
    body: '화면 오른쪽 위의 토글로 글자를 키우거나, 색을 진하게 바꿀 수 있어요. 영어로도 보실 수 있어요.',
    tips: ['🔆 고대비 — 글자/배경을 진하게', '🔠 큰글씨 — 본문 글자를 크게', '🌐 한국어/English 전환'],
    Icon: AArrowUp,
  },
  {
    emoji: '👨‍👩‍👧',
    badge: '함께 보기',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    title: '자녀·도우미와 함께 진행해요',
    body: '"내 계정 > 가족·도우미 초대하기"에서 자녀 이메일을 적어 초대하면, 자녀가 내 민원 진행 상황을 보고 도와드릴 수 있어요.',
    Icon: Users,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const after = searchParams.get('after');
  const [idx, setIdx] = useState(0);

  const finish = () => {
    try { localStorage.setItem('onboarded', 'true'); } catch {}
    router.replace(after && /^\/[a-zA-Z0-9/_-]*$/.test(after) ? after : '/');
  };

  const skip = () => finish();
  const next = () => idx < SLIDES.length - 1 ? setIdx(i => i + 1) : finish();
  const prev = () => idx > 0 && setIdx(i => i - 1);

  // 키보드 ← →
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const cur = SLIDES[idx];
  const Icon = cur.Icon;

  return (
    <div className="min-h-screen bg-surface-page flex flex-col">
      {/* 상단 — 건너뛰기 + 진행 점 */}
      <div className="px-5 sm:px-8 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-brand-600' : 'w-1.5 bg-line-base'}`}
            />
          ))}
        </div>
        <button
          onClick={skip}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-ink-3 hover:text-ink-1 hover:bg-surface-muted transition-colors"
        >
          건너뛰기 <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-6">
        <div key={idx} className="w-full max-w-md text-center ui-enter">
          {/* 큰 이모지 + 아이콘 */}
          <div className="relative inline-flex items-center justify-center">
            <span
              className={`inline-flex w-32 h-32 sm:w-40 sm:h-40 rounded-[2rem] ${cur.badgeBg} items-center justify-center text-7xl sm:text-8xl shadow-[0_8px_24px_rgba(15,23,42,0.06)]`}
              aria-hidden
            >
              {cur.emoji}
            </span>
            <span className={`absolute -bottom-3 -right-3 inline-flex w-11 h-11 rounded-2xl bg-white shadow-[0_4px_12px_rgba(15,23,42,0.10)] items-center justify-center ${cur.badgeText}`}>
              <Icon className="w-5 h-5" />
            </span>
          </div>

          <p className={`mt-10 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${cur.badgeBg} ${cur.badgeText}`}>
            {cur.badge}
          </p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-ink-1 tracking-tight leading-tight">
            {cur.title}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-ink-3 leading-relaxed">
            {cur.body}
          </p>

          {cur.tips && cur.tips.length > 0 && (
            <ul className="mt-6 mx-auto max-w-sm flex flex-col gap-2 text-left">
              {cur.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 px-4 py-2.5 rounded-2xl bg-surface border border-line-soft">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                  <span className="text-sm text-ink-2 leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 하단 액션 */}
      <div className="px-5 sm:px-8 pb-8 pt-2">
        <div className="mx-auto max-w-md flex items-center gap-3">
          <button
            onClick={prev}
            disabled={idx === 0}
            className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-surface border border-line-base text-ink-2 hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="이전"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="flex-1 ui-btn-primary h-12 sm:h-14 text-base sm:text-lg"
          >
            {idx === SLIDES.length - 1 ? '시작하기' : '다음'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-ink-4">
          {idx + 1} / {SLIDES.length}
        </p>
      </div>
    </div>
  );
}
