"use client"

import React, { useEffect, useState } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { LogOut, ClipboardList, Search } from 'lucide-react';
import { apiFetch, clearTokens, getAccessToken } from '@/lib/api-client';
import BottomNav from './components/BottomNav';

type User = { id: number; email: string; name: string };

const MainScreen: React.FC = () => {
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-5 sm:px-8 pt-12 sm:pt-16 pb-24">
      <div className="w-full max-w-md sm:max-w-lg">
        {loading ? (
          <div className="h-16" />
        ) : user ? (
          <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-600 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="로그아웃"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        ) : null}

        <div className="mt-12 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="korea logo"
            width={140}
            height={140}
            priority
          />
          <h1 className="mt-6 text-2xl font-bold text-slate-900 tracking-tight">
            민원, 쉽게 안내해드려요
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            외국인 · 노인 · 저소득층을 위한 민원 가이드
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="block">
                <button className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors rounded-xl text-white font-semibold text-base flex items-center justify-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  내 민원 이어서 진행하기
                </button>
              </Link>
              <Link href="/list" className="block">
                <button className="w-full py-3.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors rounded-xl text-slate-700 font-semibold text-base flex items-center justify-center gap-2">
                  <Search className="w-5 h-5" />
                  민원 둘러보기
                </button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/user/login" className="block">
                <button className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors rounded-xl text-white font-semibold text-base">
                  시작하기
                </button>
              </Link>
              <Link href="/qa" className="block">
                <button className="w-full py-3.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors rounded-xl text-slate-700 font-semibold text-base">
                  비회원으로 둘러보기
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export default MainScreen;
