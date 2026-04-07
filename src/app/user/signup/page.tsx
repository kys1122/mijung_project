"use client"

import React, {useState} from "react";
import {useForm} from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";

const signupScreen : React.FC = () => {
  const {register, formState:{errors}} = useForm({mode: 'onChange'});
  
  const [userPw, setUserPw] = useState('');
  const [chkUserPw, setChkUserPw] = useState('');

  //비밀번호 공개 여부
  const [showPw, setShowPw] = useState(false);
  const [showChkPw, setShowChkPw] = useState(false);

  //유효성 검사 기준
  const emailRegex = /^[a-zA-Z0-9-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  const passwordRegex = /.{8,}/; //8글자 이상

  return(
    <div className='pt-[50px] items-center flex flex-col bg-white'>
        <h1 className='w-full max-w-[400px] text-[36px] font-bold text-black mx-10'>
          회원가입
        </h1>
        <div className="w-[340px] pt-[40px] flex flex-col">
          <label className="text-[24px] font-medium">이메일</label>
          <input
            {...register("Email", {required: true, pattern: emailRegex})}
            className="px-5 py-3 border border-[#000000] rounded-[13px] focus:outline-none focus:border-[#009DFF] text-[22px] text-black"
            type="email"
            placeholder="이메일 입력">
          </input>
          {errors?.Email?.type === 'required' && <p className="text-[#ff0000]">이메일을 입력해주세요.</p>}
          {errors?.Email?.type === 'pattern' && <p className="text-[#ff0000]">이메일 양식에 맞게 입력해주세요.</p>}
        </div>
        <div className="w-[340px] pt-[25px] flex flex-col">
          <label className="text-[24px] font-medium">비밀번호</label>
          <div className=" relative flex flex-col">
            <input
              {...register("passWord", {required: true, pattern:passwordRegex})}
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
          {errors?.passWord?.type === 'required' && <p className="text-[#ff0000]">비밀번호를 입력해주세요.</p>}
          {errors?.passWord?.type === 'pattern' && <p className="text-[#ff0000]">비밀번호는 8자 이상이어야 합니다.</p>}
        </div>
        <div className="w-[340px] pt-[25px] flex flex-col relative">
          <label className="text-[24px] font-medium">비밀번호 확인</label>
          <div className=" relative flex flex-col">
            <input
              {...register("chkPassWord", {required: true, pattern:passwordRegex})}
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
          {errors?.passWord?.type === 'required' && <p className="text-[#ff0000]">비밀번호를 확인해주세요.</p>}
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