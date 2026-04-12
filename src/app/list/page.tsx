"use client"

import React from "react";
import TopSettings from '../components/TopSettings';

interface ListInterface {
  id: number;
  title: string;
  description: string;
}

//임시 데이터
const ListData: ListInterface[] = [
  {
    id: 1,
    title: "국민기초생활수급자증명",
    description: "설명1",
  },
  {
    id: 2,
    title: "요금감면 일괄 신청",
    description: "설명2",
  }
];

const ListScreen : React.FC = () => {
  return (
      <div className="pt-[20px] flex flex-col items-center bg-white">
        <div className="w-full max-w-[400px]">
          <h1 className='text-[36px] font-bold text-black'>
              민원 선택
          </h1>
          <p className="pl-2 text-[24px] font-semibold text-black">
              사용하실 민원을 선택해주세요.
          </p>
        </div>

        <div className="pt-20 w-full max-w-[350px] flex flex-col gap-6">
          {ListData.map((item)=>(
            <div
              key={item.id}
              className="p-4 border-2 border-[#C4C4C4] rounded-[11px] bg-[#F7F7F7] flex flex-col items-center">
            <h2 className="text-[30px] font-bold text-black text-center">
              {item.title}
            </h2>
            <p className="mt-2 px-5 text-[24px] text-black text-center">
              {item.description}
            </p>
            <button
              className="mt-7 w-full bg-[#009DFF] rounded-[10px] text-white text-[28px] font-bold hover:bg-[#0089e0] active:scale-[0.98] transition-all">
              민원 절차 보기
            </button>
            </div>
          ))}
        </div>
      </div>
  );
}

export default ListScreen;