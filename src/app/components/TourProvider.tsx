"use client"

import React, { useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CoachmarkTour, { type TourStep } from "./CoachmarkTour";

const TOUR: TourStep[] = [
  // === 챗봇 ===
  {
    path: '/chat',
    emoji: '💬',
    badge: '1. 챗봇',
    title: '챗봇과 상담하기',
    body: '유형 → 연령대 → 카테고리 → 상황 순서로 짧게 묻고, 마지막에 맞춤 민원을 추천해드려요. 답하기 어려우면 "잘 모르겠어요"를 골라도 돼요.',
  },
  {
    path: '/chat',
    selector: '[data-tour="chat-mic"]',
    emoji: '🎙️',
    badge: '챗봇 · 음성',
    title: '글이 어려우면 말로',
    body: '마이크 버튼을 누르고 말씀하시면 글자로 바꿔드려요. 처음 누를 때 마이크 권한을 허용해주세요.',
  },

  // === 내 민원 ===
  {
    path: '/dashboard',
    emoji: '📋',
    badge: '2. 내 민원',
    title: '내 민원 한눈에 보기',
    body: '시작한 민원과 진행 상황을 한 곳에서 확인해요. 체크리스트는 자동 저장돼서 다음에 들어와도 이어서 할 수 있어요.',
  },
  {
    path: '/dashboard',
    selector: '[data-tour="next-action"]',
    emoji: '✨',
    badge: '내 민원 · 다음 할 일',
    title: '가장 임박한 단계',
    body: '진행 중인 민원 중 가장 최근에 본 것의 다음 단계를 알려드려요. 누르면 바로 그 자리로 이어서 진행해요.',
  },
  {
    path: '/dashboard',
    selector: '[data-tour="favorites-section"]',
    emoji: '⭐',
    badge: '내 민원 · 즐겨찾기',
    title: '관심 민원 모아보기',
    body: '민원 페이지에서 별을 누르면 여기 모여요. 자주 보는 민원을 빠르게 다시 찾을 수 있어요.',
  },

  // === 둘러보기 ===
  {
    path: '/recommend',
    emoji: '🔍',
    badge: '3. 둘러보기',
    title: '직접 민원 찾기',
    body: '챗봇 없이 검색이나 카테고리로 직접 찾을 수 있어요. 위쪽 검색창에 키워드를 적으면 AI가 비슷한 민원을 추천해드려요.',
  },
  {
    path: '/recommend',
    selector: '[data-tour="recommend-categories"]',
    emoji: '🗂️',
    badge: '둘러보기 · 카테고리',
    title: '카테고리로 정렬',
    body: '복지·의료·주거·출입국 등 카테고리 칩을 누르면 해당 분야 민원만 추려서 볼 수 있어요.',
  },

  // === 내 계정 ===
  {
    path: '/account',
    emoji: '👤',
    badge: '4. 내 계정',
    title: '내 계정 화면이에요',
    body: '내 프로필 확인, 가족·도우미와 함께 보기, 계정 설정(이름·비밀번호·탈퇴)을 한 곳에서 관리해요.',
  },
  {
    path: '/account',
    selector: '[data-tour="account-profile"]',
    emoji: '🪪',
    badge: '내 계정 · 프로필',
    title: '내 정보',
    body: '이름과 이메일이 표시돼요. 우측 "로그아웃" 버튼으로 언제든 빠져나올 수 있어요.',
  },
  {
    path: '/account',
    selector: '[data-tour="account-invite"]',
    emoji: '👨‍👩‍👧',
    badge: '내 계정 · 가족 공유',
    title: '가족·도우미 초대하기',
    body: '자녀나 도우미의 가입 이메일을 적어 초대하면, 수락 후 내 민원을 함께 보고 도울 수 있어요. 노인·외국인 사용자에게 특히 든든해요.',
  },
  {
    path: '/account',
    selector: '[data-tour="account-settings"]',
    emoji: '⚙️',
    badge: '내 계정 · 설정',
    title: '계정 설정',
    body: '이름을 바꾸거나, 비밀번호를 변경하거나, 회원에서 탈퇴할 수 있어요.',
  },
];

const STORAGE_KEY = 'onboarded';

export default function TourProvider() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

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
    const nextStep = TOUR[nextIdx];
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
