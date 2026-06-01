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
          name: data.name.trim()
        })
      });
      const result = await response.json();
      if (result.success) {
        // 첫 로그인 시 온보딩 보여주기 위한 플래그 초기화
        try { localStorage.removeItem('onboarded'); } catch {}
        router.push("/user/login");
      } else {
        setServerError(result.message ?? "회원가입에 실패했어요.");
      }
    } catch (error) {
      console.error("회원가입 중 에러 발생 : ", error);
      setServerError("연결이 끊겼어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const errorClass = "mt-1.5 text-xs text-danger";
  const fieldErrorClass = (hasError: boolean) =>
    `ui-input ${hasError ? 'border-danger/40' : ''}`;

  return (
    <div className="min-h-screen bg-surface-page flex flex-col items-center px-5 sm:px-8 pt-12 sm:pt-16 pb-12">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md ui-enter">
        <h1 className="ui-page-title">회원가입</h1>
        <p className="ui-page-subtitle">계정을 만들고 민원 진행을 저장하세요</p>

        <div className="mt-8 ui-card p-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-2 mb-2">이름</label>
              <input
                {...register("name", { required: true, minLength: 1, maxLength: 50, pattern: /^\s*\S.*$/ })}
                className={fieldErrorClass(!!errors?.name)}
                type="text"
                placeholder="홍길동"
                autoComplete="name"
              />
              {errors?.name?.type === 'required' && <p className={errorClass}>이름을 입력해주세요.</p>}
              {errors?.name?.type === 'pattern' && <p className={errorClass}>이름을 올바르게 입력해주세요.</p>}
              {errors?.name?.type === 'maxLength' && <p className={errorClass}>이름은 50자 이하로 입력해주세요.</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-2 mb-2">이메일</label>
              <input
                {...register("email", { required: true, pattern: emailRegex })}
                className={fieldErrorClass(!!errors?.email)}
                type="email"
                placeholder="example@email.com"
                autoComplete="email"
              />
              {errors?.email?.type === 'required' && <p className={errorClass}>이메일을 입력해주세요.</p>}
              {errors?.email?.type === 'pattern' && <p className={errorClass}>이메일 형식이 올바르지 않아요.</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink-2 mb-2">비밀번호</label>
              <div className="relative">
                <input
                  {...register("password", { required: true, pattern: passwordRegex })}
                  className={`${fieldErrorClass(!!errors?.password)} pr-12`}
                  type={showPw ? "text" : "password"}
                  placeholder="8자 이상"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ink-3 hover:text-ink-1 hover:bg-surface-muted transition-colors"
                  aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors?.password?.type === 'required' && <p className={errorClass}>비밀번호를 입력해주세요.</p>}
              {errors?.password?.type === 'pattern' && <p className={errorClass}>비밀번호는 8자 이상이어야 해요.</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink-2 mb-2">비밀번호 확인</label>
              <div className="relative">
                <input
                  {...register("chkPassword", { required: true, pattern: passwordRegex, validate: (value) => value === password })}
                  className={`${fieldErrorClass(!!errors?.chkPassword)} pr-12`}
                  type={showChkPw ? "text" : "password"}
                  placeholder="비밀번호 재입력"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowChkPw(!showChkPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ink-3 hover:text-ink-1 hover:bg-surface-muted transition-colors"
                  aria-label={showChkPw ? '비밀번호 숨기기' : '비밀번호 표시'}
                >
                  {showChkPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors?.chkPassword?.type === 'required' && <p className={errorClass}>비밀번호 확인을 입력해주세요.</p>}
              {errors?.chkPassword?.type === 'pattern' && <p className={errorClass}>비밀번호는 8자 이상이어야 해요.</p>}
              {errors?.chkPassword?.type === 'validate' && <p className={errorClass}>비밀번호가 일치하지 않아요.</p>}
            </div>
          </div>

          {serverError && (
            <div className="mt-4 rounded-xl bg-danger/10 border border-danger/30 px-3 py-2.5 text-sm text-danger">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isValid}
            className="ui-btn-primary w-full mt-6 text-base"
          >
            {loading ? '가입 처리 중...' : '가입하기'}
          </button>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/user/login"
            className="text-sm text-ink-3 hover:text-ink-1 transition-colors"
          >
            이미 계정이 있으신가요? <span className="font-semibold text-brand-600">로그인</span>
          </Link>
        </div>
      </form>
    </div>
  );
}

export default SignupScreen;
