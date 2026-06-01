"use client"

import React, { Suspense, useEffect, useState } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { LogOut, ClipboardList, Search, MessageCircle, ChevronRight, Sparkles, Users, HelpCircle } from 'lucide-react';
import { apiFetch, clearTokens, getAccessToken } from '@/lib/api-client';
import BottomNav from './components/BottomNav';
import { useAppLang } from './lib/app-prefs';
import { useUiText } from './lib/use-ui-text';

const HOME_KO = [
  '민원, 어렵지 않아요',
  '필요한 민원을 친절하게 안내해드릴게요',
  '오늘은 어떤 도움이 필요하세요?',
  '로그아웃',
  '챗봇과 상담하기',
  '몇 가지 질문에 답하면 맞춤 민원을 찾아드려요',
  '내 민원 이어서 진행하기',
  '진행 중인 민원을 한눈에 확인',
  '민원 둘러보기',
  '검색과 카테고리로 직접 찾기',
  '가족·도우미와 함께 보기',
  '자녀나 도우미에게 내 민원을 공유',
  '앱 안내 다시 보기',
  '시작하기',
  '비회원으로 둘러보기',
  '회원가입은 진행 중인 민원을 저장하고 이어서 볼 때 도움이 돼요',
];

type User = { id: number; email: string; name: string };

const MainScreen: React.FC = () => {
  const router = useRouter();
  const [lang] = useAppLang();
  const { t: tr } = useUiText(HOME_KO);
  // 한국어 키 그대로 호출 — lang === 'ko' 면 원문, 다른 언어는 LLM 자동 번역 (캐싱)
  const t = (ko: string, _en?: string) => tr(ko);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) { setLoading(false); return; }
    (async () => {
      try {
        const res = await apiFetch('/api/users/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else if (res.status === 401) {
          clearTokens();
        }
      } catch (err) {
        console.error('사용자 정보 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = () => {
    clearTokens();
    setUser(null);
  };

  const greeting = user
    ? (lang === 'ko' ? `안녕하세요, ${user.name}님` : `${tr('안녕하세요')} ${user.name}`)
    : tr('민원, 어렵지 않아요');
  const sub = user ? tr('오늘은 어떤 도움이 필요하세요?') : tr('필요한 민원을 친절하게 안내해드릴게요');

  return (
    <div className="min-h-screen bg-surface-page pb-28">
      <div className="mx-auto max-w-md sm:max-w-2xl px-5 sm:px-8 pt-6">
        {/* 상단 사용자 pill */}
        {loading ? (
          <div className="h-14" />
        ) : user ? (
          <div className="ui-card p-3 pl-4 flex items-center gap-3 ui-enter">
            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-1 truncate">{user.name}</p>
              <p className="text-xs text-ink-3 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="ui-btn-ghost"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t('로그아웃', 'Log out')}</span>
            </button>
          </div>
        ) : (
          <div className="h-2" />
        )}

        {/* 히어로 */}
        <div className="mt-10 sm:mt-14 text-center ui-enter">
          <div className="mx-auto inline-flex items-center justify-center">
            <Image
              src="/logo.png"
              alt=""
              width={120}
              height={120}
              priority
              className="drop-shadow-sm"
            />
          </div>
          <h1 className="ui-page-title mt-6">{greeting}</h1>
          <p className="ui-page-subtitle">{sub}</p>
        </div>

        {/* 메인 액션 카드 */}
        <div className="mt-10 sm:mt-14 flex flex-col gap-3 ui-enter">
          {user ? (
            <>
              <Link href="/chat" className="block" data-tour="chat-card">
                <div className="ui-card-interactive p-5 sm:p-6 flex items-center gap-4 bg-gradient-to-br from-brand-600 to-brand-700 border-transparent text-white">
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-base sm:text-lg font-bold">{t('챗봇과 상담하기', 'Chat with the assistant')}</p>
                    <p className="text-sm text-white/80 mt-0.5">{t('몇 가지 질문에 답하면 맞춤 민원을 찾아드려요', 'Answer a few questions and we’ll find the right services')}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/80" />
                </div>
              </Link>

              <Link href="/dashboard" className="block" data-tour="dashboard-card">
                <div className="ui-card-interactive p-5 flex items-center gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-base font-semibold text-ink-1">{t('내 민원 이어서 진행하기', 'Continue my services')}</p>
                    <p className="text-sm text-ink-3 mt-0.5">{t('진행 중인 민원을 한눈에 확인', 'Pick up where you left off')}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink-4" />
                </div>
              </Link>

              <Link href="/recommend" className="block" data-tour="recommend-card">
                <div className="ui-card-interactive p-5 flex items-center gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center">
                    <Search className="w-6 h-6 text-ink-2" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-base font-semibold text-ink-1">{t('민원 둘러보기', 'Browse services')}</p>
                    <p className="text-sm text-ink-3 mt-0.5">{t('검색과 카테고리로 직접 찾기', 'Search or browse by category')}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink-4" />
                </div>
              </Link>

              <Link href="/account" className="block" data-tour="account-card">
                <div className="ui-card-interactive p-5 flex items-center gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <Users className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-base font-semibold text-ink-1">{t('가족·도우미와 함께 보기', 'Share with family or helper')}</p>
                    <p className="text-sm text-ink-3 mt-0.5">{t('자녀나 도우미에게 내 민원을 공유', 'Invite family to view your services with you')}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink-4" />
                </div>
              </Link>

              <button
                type="button"
                onClick={() => router.push('/?tour=1')}
                className="text-left w-full ui-card-interactive p-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
              >
                <div className="shrink-0 w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-ink-1">{t('앱 안내 다시 보기', 'Replay app tour')}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-4" />
              </button>
            </>
          ) : (
            <>
              <Link href="/user/login" className="block">
                <button className="ui-btn-primary w-full text-base">
                  {t('시작하기', 'Get started')}
                </button>
              </Link>
              <Link href="/qa" className="block">
                <button className="ui-btn-secondary w-full text-base">
                  <MessageCircle className="w-5 h-5" />
                  {t('비회원으로 둘러보기', 'Browse without account')}
                </button>
              </Link>
              <p className="mt-3 text-center text-xs text-ink-4">
                {t('회원가입은 진행 중인 민원을 저장하고 이어서 볼 때 도움이 돼요', "Sign up to save your services and continue later")}
              </p>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <MainScreen />
    </Suspense>
  );
}
