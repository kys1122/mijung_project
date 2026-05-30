"use client"

import React, { useState } from "react"
import Link from "next/link";
import { Eye, EyeOff, Check } from 'lucide-react';
import { useRouter } from "next/navigation";

const LoginScreen: React.FC = () => {
  const router = useRouter();

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
        router.push("/list");
      } else {
        setErrorMsg(result.message ?? "로그인에 실패했습니다.");
      }
    } catch (error) {
      console.error("로그인 중 에러 발생 : ", error);
      setErrorMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && email && password && !loading) handleLogin();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-5 pt-16 pb-12">
      <div className="w-full max-w-[420px]">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">로그인</h1>
        <p className="mt-1.5 text-sm text-slate-500">민원 진행 상황을 이어서 확인하세요</p>

        <div className="mt-8 rounded-2xl bg-white border border-slate-200/70 shadow-sm p-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">이메일</label>
              <input
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호</label>
              <div className="relative">
                <input
                  className="w-full px-4 py-3 pr-11 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
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
            className="mt-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${stayLogin ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
              {stayLogin && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </span>
            로그인 상태 유지
          </button>

          {errorMsg && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="mt-6 w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors rounded-xl text-white font-semibold text-base"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/user/signup"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            계정이 없으신가요? <span className="font-medium text-blue-600">회원가입</span>
          </Link>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <div className="flex-grow h-px bg-slate-200" />
          <span className="text-xs text-slate-400">또는</span>
          <div className="flex-grow h-px bg-slate-200" />
        </div>

        <Link
          href="/qa"
          className="mt-6 block text-center text-sm text-slate-500 hover:text-slate-700 underline underline-offset-4 transition-colors"
        >
          비회원으로 계속하기
        </Link>
      </div>
    </div>
  );
}

export default LoginScreen;
