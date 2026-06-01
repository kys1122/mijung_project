"use client"

import React, { Suspense, useState } from "react"
import Link from "next/link";
import { Eye, EyeOff, Check } from 'lucide-react';
import { useRouter, useSearchParams } from "next/navigation";

const ALLOWED_RETURN = new Set(['/chat', '/dashboard', '/list', '/recommend', '/']);

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnParam = searchParams.get('return');
  const returnTo = returnParam && ALLOWED_RETURN.has(returnParam) ? returnParam : '/chat';

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stayLogin, setStayLogin] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();

      if (result.success) {
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('refreshToken', result.data.refreshToken);
        // 온보딩 안 본 사용자는 메인 페이지에서 코치마크 자동 시작
        const onboarded = localStorage.getItem('onboarded') === 'true';
        if (!onboarded) {
          router.push('/?tour=1');
        } else {
          router.push(returnTo);
        }
      } else {
        setErrorMsg(result.message ?? "이메일 또는 비밀번호를 다시 확인해주세요.");
      }
    } catch (error) {
      console.error("로그인 중 에러 발생 : ", error);
      setErrorMsg("연결이 끊겼어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && email && password && !loading) handleLogin();
  };

  return (
    <div className="min-h-screen bg-surface-page flex flex-col items-center px-5 sm:px-8 pt-12 sm:pt-20 pb-12">
      <div className="w-full max-w-md ui-enter">
        <h1 className="ui-page-title">로그인</h1>
        <p className="ui-page-subtitle">민원 진행 상황을 이어서 확인하세요</p>

        <div className="mt-8 ui-card p-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-2 mb-2">이메일</label>
              <input
                className="ui-input"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-2 mb-2">비밀번호</label>
              <div className="relative">
                <input
                  className="ui-input pr-12"
                  type={showPw ? "text" : "password"}
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={onKeyDown}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ink-3 hover:text-ink-1 hover:bg-surface-muted transition-colors"
                  aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStayLogin(!stayLogin)}
            className="mt-4 flex items-center gap-2 text-sm text-ink-3 hover:text-ink-1 transition-colors"
          >
            <span className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${stayLogin ? 'bg-brand-600 border-brand-600' : 'bg-surface border-line-strong'}`}>
              {stayLogin && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </span>
            로그인 상태 유지
          </button>

          {errorMsg && (
            <div className="mt-4 rounded-xl bg-danger/10 border border-danger/30 px-3 py-2.5 text-sm text-danger">
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="ui-btn-primary w-full mt-6 text-base"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/user/signup"
            className="text-sm text-ink-3 hover:text-ink-1 transition-colors"
          >
            계정이 없으신가요? <span className="font-semibold text-brand-600">회원가입</span>
          </Link>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <div className="flex-grow h-px bg-line-soft" />
          <span className="text-xs text-ink-4">또는</span>
          <div className="flex-grow h-px bg-line-soft" />
        </div>

        <Link
          href="/qa"
          className="mt-6 block text-center text-sm text-ink-3 hover:text-ink-1 underline underline-offset-4 transition-colors"
        >
          비회원으로 계속하기
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
