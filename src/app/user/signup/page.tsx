"use client"

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const SignupScreen: React.FC = () => {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isValid }, watch } = useForm({ mode: 'onChange' });

  const password = watch("password");

  const [showPw, setShowPw] = useState(false);
  const [showChkPw, setShowChkPw] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[a-zA-Z0-9-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  const passwordRegex = /.{8,}/;

  const onSubmit = async (data: any) => {
    setServerError("");
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.email.split('@')[0]
        })
      });
      const result = await response.json();
      if (result.success) {
        router.push("/user/login");
      } else {
        setServerError(result.message ?? "회원가입에 실패했습니다.");
      }
    } catch (error) {
      console.error("회원가입 중 에러 발생 : ", error);
      setServerError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-5 pt-16 pb-12">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-[420px]">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">회원가입</h1>
        <p className="mt-1.5 text-sm text-slate-500">계정을 만들고 민원 진행을 저장하세요</p>

        <div className="mt-8 rounded-2xl bg-white border border-slate-200/70 shadow-sm p-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">이메일</label>
              <input
                {...register("email", { required: true, pattern: emailRegex })}
                className={`w-full px-4 py-3 bg-white border rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${errors?.email ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                type="email"
                placeholder="example@email.com"
                autoComplete="email"
              />
              {errors?.email?.type === 'required' && <p className="mt-1.5 text-xs text-red-600">이메일을 입력해주세요.</p>}
              {errors?.email?.type === 'pattern' && <p className="mt-1.5 text-xs text-red-600">이메일 양식에 맞게 입력해주세요.</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호</label>
              <div className="relative">
                <input
                  {...register("password", { required: true, pattern: passwordRegex })}
                  className={`w-full px-4 py-3 pr-11 bg-white border rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${errors?.password ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                  type={showPw ? "text" : "password"}
                  placeholder="8자 이상"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors?.password?.type === 'required' && <p className="mt-1.5 text-xs text-red-600">비밀번호를 입력해주세요.</p>}
              {errors?.password?.type === 'pattern' && <p className="mt-1.5 text-xs text-red-600">비밀번호는 8자 이상이어야 합니다.</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호 확인</label>
              <div className="relative">
                <input
                  {...register("chkPassword", { required: true, pattern: passwordRegex, validate: (value) => value === password })}
                  className={`w-full px-4 py-3 pr-11 bg-white border rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${errors?.chkPassword ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                  type={showChkPw ? "text" : "password"}
                  placeholder="비밀번호 재입력"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowChkPw(!showChkPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showChkPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors?.chkPassword?.type === 'required' && <p className="mt-1.5 text-xs text-red-600">비밀번호 확인을 입력해주세요.</p>}
              {errors?.chkPassword?.type === 'pattern' && <p className="mt-1.5 text-xs text-red-600">비밀번호는 8자 이상이어야 합니다.</p>}
              {errors?.chkPassword?.type === 'validate' && <p className="mt-1.5 text-xs text-red-600">비밀번호가 일치하지 않습니다.</p>}
            </div>
          </div>

          {serverError && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isValid}
            className="mt-6 w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors rounded-xl text-white font-semibold text-base"
          >
            {loading ? '가입 처리 중...' : '가입하기'}
          </button>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/user/login"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            이미 계정이 있으신가요? <span className="font-medium text-blue-600">로그인</span>
          </Link>
        </div>
      </form>
    </div>
  );
}

export default SignupScreen;
