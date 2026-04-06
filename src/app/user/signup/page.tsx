"use client"

import React, {useState} from "react";
import { Eye, EyeOff } from "lucide-react";

const signupScreen : React.FC = () => {
  const [showPw, setShowPw] = useState(false);
  const [showChkPw, setShowChkPw] = useState(false);

  return(
    <div className='pt-[50px] items-center flex flex-col bg-white'>
        <h1 className='w-full max-w-[400px] text-[36px] font-bold text-black mx-10'>
          회원가입
        </h1>
        <div className="w-[340px] pt-[40px] flex flex-col">
          <label className="text-[24px] font-medium">이메일</label>
          <input
            className="px-5 py-3 border border-[#000000] rounded-[13px] focus:outline-none focus:border-[#009DFF] text-[22px] text-black"
            type="email"
            placeholder="이메일 입력">
          </input>
        </div>
        <div className="w-[340px] pt-[25px] flex flex-col">
          <label className="text-[24px] font-medium">비밀번호</label>
          <div className=" relative flex flex-col">
            <input
              className="px-5 py-3 border border-[#000000] rounded-[13px] focus:outline-none focus:border-[#009DFF] text-[22px] text-black"
              type={showPw ? "text" : "password"}
              placeholder="비밀번호 입력">
            </input>
            <div
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPw ? (<EyeOff className="w-7 h-7"/>) : (<Eye className="w-7 h-7"/>)}
            </div>
          </div>
        </div>
        <div className="w-[340px] pt-[25px] flex flex-col relative">
          <label className="text-[24px] font-medium">비밀번호 확인</label>
          <div className=" relative flex flex-col">
            <input
              className="px-5 py-3 border border-[#000000] rounded-[13px] focus:outline-none focus:border-[#009DFF] text-[22px] text-black"
              type={showChkPw ? "text" : "password"}
              placeholder="비밀번호 확인">
            </input>
            <div
              onClick={() => setShowChkPw(!showChkPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showChkPw ? (<EyeOff className="w-7 h-7"/>) : (<Eye className="w-7 h-7"/>)}
            </div>
          </div>
        </div>
        <div className='flex flex-col items-center mt-20'>
          <button className='w-[315px] py-[5px] bg-[#009DFF] hover:bg-[#0089e0] active:scale-[0.98] transition-all rounded-[35px] text-white text-[36px] font-bold'>
            가입하기
          </button>
        </div>
    </div>
  );
}

export default signupScreen;