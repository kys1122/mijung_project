"use client"

import React, {useState} from "react"
import Link from "next/link";
import {Eye, EyeOff ,Check} from 'lucide-react';

const LoginScreen : React.FC = () => {
  const [stayLogin,  setStayLogin] = useState(false);
  const [showPw, setShowPw] = useState(false);

  return(
      <div className='pt-[110px] flex flex-col items-center justify-between bg-white'>
        <h1 className='text-[26px] font-bold text-black'>
          로그인
        </h1>
        <div className="pt-[15px] flex flex-col gap-3">
          <input
            className="px-5 py-3 border border-[#000000] rounded-[10px] focus:outline-none focus:border-[#0059FF] text-[22px] text-black"
            type="email"
            placeholder="이메일 입력"
          />
          <div className="relative">
            <input
              className="px-5 py-3 border border-[#000000] rounded-[10px] focus:outline-none focus:border-[#0059FF] text-[22px] text-black"
              type={showPw ? "text" : "password"}
              placeholder="비밀번호 입력"
            />
            <div
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPw ? (<EyeOff className="w-6 h-6"/>) : (<Eye className="w-6 h-6"/>)}
            </div>
          </div>
        </div>
        <div
          onClick={() => setStayLogin(!stayLogin)}
          className='w-[306px] mt-4 flex items-center gap-2'>
          <button
            className={`w-6 h-6 flex items-center justify-center cursor-pointer transition-colors ${stayLogin ? 'bg-[#65B2FF]' : 'bg-[#E5E5E5]'
            }`}
          >
            {stayLogin && <Check className="text-white w-4 h-4" strokeWidth={3} />}
          </button>
          <span className='text-[20px] font-medium text-black select-none'>
            로그인 상태 유지
          </span>
        </div>
        <div className='flex flex-col items-center mt-10'>
          <button className='w-[306px] py-[5px] bg-[#009DFF] hover:bg-[#0089e0] active:scale-[0.98] transition-all rounded-[35px] text-white text-[36px] font-bold'>
            로그인하기
          </button>
        </div>
        <div
          className="flex items-center">
          <Link
            href="/user/signup"
            className="pt-[12px] text-[28px] font-medium text-black select-none"
            style={{textDecoration: 'underline', textUnderlineOffset: '4px'}}
            >
            회원가입
          </Link>
        </div>
        <div className="pt-[35px] w-[350px] flex items-center">
          <div className="flex-grow border-t border-[#AAAAAA]"/>
          <h1 className="px-4 text-[#AAAAAA] text-[24px]">또는</h1>
          <div className="flex-grow border-t border-[#AAAAAA]"/>
        </div>
        <span
          className="pt-[35px] text-[22px] font-medium text-[#515151] select-none"
          style={{textDecoration: 'underline', textUnderlineOffset: '4px'}}
        >
          비회원으로 계속하기
        </span>
    </div>
  );
}

export default LoginScreen;