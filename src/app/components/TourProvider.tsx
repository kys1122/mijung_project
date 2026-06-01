"use client"

import React, { useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CoachmarkTour, { type TourStep } from "./CoachmarkTour";
import { useAppLang } from "../lib/app-prefs";

type LocalizedStep = Omit<TourStep, 'badge' | 'title' | 'body'> & {
  badge_ko: string; badge_en: string;
  title_ko: string; title_en: string;
  body_ko: string;  body_en: string;
};

const TOUR_LOCALIZED: LocalizedStep[] = [
  {
    path: '/chat',  emoji: '💬',
    badge_ko: '1. 챗봇',  badge_en: '1. Chatbot',
    title_ko: '챗봇과 상담하기', title_en: 'Chat with the assistant',
    body_ko: '유형 → 연령대 → 카테고리 → 상황 순서로 짧게 묻고, 마지막에 맞춤 민원을 추천해드려요. 답하기 어려우면 "잘 모르겠어요"를 골라도 돼요.',
    body_en: 'We ask a few short questions (type → age → category → situation) and recommend the right service. If unsure, pick "I\'m not sure".',
  },
  {
    path: '/chat', selector: '[data-tour="chat-mic"]', emoji: '🎙️',
    badge_ko: '챗봇 · 음성', badge_en: 'Chatbot · Voice',
    title_ko: '글이 어려우면 말로', title_en: 'Use voice instead',
    body_ko: '마이크 버튼을 누르고 말씀하시면 글자로 바꿔드려요. 처음 누를 때 마이크 권한을 허용해주세요.',
    body_en: 'Tap the mic and speak — we’ll convert it to text. Allow microphone permission the first time.',
  },
  {
    path: '/dashboard', emoji: '📋',
    badge_ko: '2. 내 민원', badge_en: '2. My services',
    title_ko: '내 민원 한눈에 보기', title_en: 'See your services at a glance',
    body_ko: '시작한 민원과 진행 상황을 한 곳에서 확인해요. 체크리스트는 자동 저장돼서 다음에 들어와도 이어서 할 수 있어요.',
    body_en: 'See all services you started and your progress in one place. The checklist auto-saves so you can continue later.',
  },
  {
    path: '/dashboard', selector: '[data-tour="next-action"]', emoji: '✨',
    badge_ko: '내 민원 · 다음 할 일', badge_en: 'My services · Next',
    title_ko: '가장 임박한 단계', title_en: 'Your nearest next step',
    body_ko: '진행 중인 민원 중 가장 최근에 본 것의 다음 단계를 알려드려요. 누르면 바로 그 자리로 이어서 진행해요.',
    body_en: 'We show the next step for your most recent service. Tap to jump back into it.',
  },
  {
    path: '/dashboard', selector: '[data-tour="favorites-section"]', emoji: '⭐',
    badge_ko: '내 민원 · 즐겨찾기', badge_en: 'My services · Favorites',
    title_ko: '관심 민원 모아보기', title_en: 'Collect favorite services',
    body_ko: '민원 페이지에서 별을 누르면 여기 모여요. 자주 보는 민원을 빠르게 다시 찾을 수 있어요.',
    body_en: 'Tap the star on a service page to save it here. Quickly access ones you visit often.',
  },
  {
    path: '/recommend', emoji: '🔍',
    badge_ko: '3. 둘러보기', badge_en: '3. Browse',
    title_ko: '직접 민원 찾기', title_en: 'Find services directly',
    body_ko: '챗봇 없이 검색이나 카테고리로 직접 찾을 수 있어요. 위쪽 검색창에 키워드를 적으면 AI가 비슷한 민원을 추천해드려요.',
    body_en: 'Search or browse by category without using the chatbot. Type keywords and AI suggests similar services.',
  },
  {
    path: '/recommend', selector: '[data-tour="recommend-categories"]', emoji: '🗂️',
    badge_ko: '둘러보기 · 카테고리', badge_en: 'Browse · Categories',
    title_ko: '카테고리로 정렬', title_en: 'Filter by category',
    body_ko: '복지·의료·주거·출입국 등 카테고리 칩을 누르면 해당 분야 민원만 추려서 볼 수 있어요.',
    body_en: 'Tap a category chip (welfare, medical, housing, immigration, …) to filter services in that area.',
  },
  {
    path: '/account', emoji: '👤',
    badge_ko: '4. 내 계정', badge_en: '4. My account',
    title_ko: '내 계정 화면이에요', title_en: 'Your account screen',
    body_ko: '내 프로필 확인, 가족·도우미와 함께 보기, 계정 설정(이름·비밀번호·탈퇴)을 한 곳에서 관리해요.',
    body_en: 'See your profile, share with family or helpers, and manage account settings (name, password, deletion) all in one place.',
  },
  {
    path: '/account', selector: '[data-tour="account-profile"]', emoji: '🪪',
    badge_ko: '내 계정 · 프로필', badge_en: 'My account · Profile',
    title_ko: '내 정보', title_en: 'Your info',
    body_ko: '이름과 이메일이 표시돼요. 우측 "로그아웃" 버튼으로 언제든 빠져나올 수 있어요.',
    body_en: 'Shows your name and email. Tap "Log out" on the right whenever you need.',
  },
  {
    path: '/account', selector: '[data-tour="account-invite"]', emoji: '👨‍👩‍👧',
    badge_ko: '내 계정 · 가족 공유', badge_en: 'My account · Family',
    title_ko: '가족·도우미 초대하기', title_en: 'Invite family or helper',
    body_ko: '자녀나 도우미의 가입 이메일을 적어 초대하면, 수락 후 내 민원을 함께 보고 도울 수 있어요. 노인·외국인 사용자에게 특히 든든해요.',
    body_en: "Enter their signup email to invite them. Once accepted, they can view and help with your services — especially helpful for seniors or foreign users.",
  },
  {
    path: '/account', selector: '[data-tour="account-settings"]', emoji: '⚙️',
    badge_ko: '내 계정 · 설정', badge_en: 'My account · Settings',
    title_ko: '계정 설정', title_en: 'Account settings',
    body_ko: '이름을 바꾸거나, 비밀번호를 변경하거나, 회원에서 탈퇴할 수 있어요.',
    body_en: 'Change your name, update your password, or delete your account.',
  },
];

function buildTour(lang: string): TourStep[] {
  const isKo = lang === 'ko';
  return TOUR_LOCALIZED.map((s) => ({
    path: s.path,
    selector: s.selector,
    padding: s.padding,
    emoji: s.emoji,
    badge: isKo ? s.badge_ko : s.badge_en,
    title: isKo ? s.title_ko : s.title_en,
    body: isKo ? s.body_ko : s.body_en,
  }));
}

const STORAGE_KEY = 'onboarded';

export default function TourProvider() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lang] = useAppLang();

  // 현재 lang에 맞춰 TOUR 빌드 (lang 변경 시 자동 재빌드)
  const TOUR = buildTour(lang);

  // URL ?tour=N을 단일 진실 소스로 — 별도 state 없음 (무한 루프/race 차단)
  const tourParam = searchParams.get('tour');
  const index = tourParam ? Math.max(0, Math.min(TOUR.length - 1, parseInt(tourParam, 10) - 1)) : -1;
  const open = index >= 0;
  const step = open ? TOUR[index] : null;
  const onCurrentPage = step ? (!step.path || step.path === pathname) : false;

  // 자동 path 보정 — ref로 한 번만, 사용자 액션은 ref 갱신해서 보정 트리거 X
  const lastBoundRef = useRef<string>('');

  useEffect(() => {
    if (!open || !step?.path) return;
    if (step.path === pathname) return;
    const key = `${index}:${step.path}`;
    if (lastBoundRef.current === key) return;
    lastBoundRef.current = key;
    router.replace(`${step.path}?tour=${index + 1}`);
  }, [open, step?.path, pathname, index, router]);

  // 투어 닫히면 ref 초기화
  useEffect(() => {
    if (!open) lastBoundRef.current = '';
  }, [open]);

  const handleGoTo = useCallback((nextIdx: number) => {
    const nextStep = TOUR_LOCALIZED[nextIdx];
    if (!nextStep) return;
    const targetPath = nextStep.path ?? pathname;
    lastBoundRef.current = `${nextIdx}:${targetPath}`;
    router.replace(`${targetPath}?tour=${nextIdx + 1}`);
  }, [pathname, router]);

  const handleClose = useCallback((_finished: boolean) => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    lastBoundRef.current = '';
    router.replace(pathname);
  }, [pathname, router]);

  if (!open || !step || !onCurrentPage) return null;

  return (
    <CoachmarkTour
      open={open}
      steps={TOUR}
      index={index}
      onIndexChange={handleGoTo}
      onClose={handleClose}
    />
  );
}
