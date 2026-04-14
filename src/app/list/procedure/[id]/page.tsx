"use client"

import { Check, ChevronLeft, ExternalLink, Volume2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { TestData } from "@/app/data/testData";

const ProcedureScreen : React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [step, setStep] = useState<any[]>([]);

  //id에 맞는 데이터 연결, 없는 id면 데이터 없음을 안내
  useEffect(()=>{
    if(id && TestData[id]){
      setStep(TestData[id].step);
    } else {
      setStep(TestData["nothingData"].step);
    }
  },  [id]);

  //진행률 계산
  const currentProcedure = TestData[id] || TestData["nothingData"];
  const completedCount = step.filter((s:any) =>  s.isCompleted).length;
  const progress = (completedCount/step.length) * 100;

  //완료 상태
  const Complete =  (stepId: number) => {
    setStep(step.map((s: any) => s.id == stepId ? {...s, isCompleted: !s.isCompleted} : s));
  }

  return(
    <div className="flex flex-col items-center bg-white">
      <header className="w-full max-w-[450px] py-3 justify-between border-b-2 border-[#C9C9C9]">
        <button
        onClick={() => router.back()}
        className="flex items-center activate:opacity-40 transition-opacity gap-1"
        >
          <ChevronLeft className="w-8 h-8 text-black"/>
          <span className="text-[22px] text-black">민원 선택으로</span>
        </button>
      </header>

      <div className="w-full max-w-[450px]">
        <h1 className="pt-[15px] text-[33px] font-bold">{currentProcedure.name}</h1>
        
        <div className="mt-[25px] mx-2 pt-[10px] px-5 pb-4 bg-[#E9F1FF] rounded-[15px]">
          <span className="text-center text-[23px] text-black font-bold block">진행률</span>
          <span className="w-full text-right text-[18px] text-black block -mt-3">{completedCount}/{step.length}</span>
          <div className="w-full h-4 bg-white rounded-[20px]">
            <div className="bg-[#005EFF] h-full transition-all rounded-[20px]"
                 style={{width: `${progress}%`}}/>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={() => router.push(`/list/document/${id}`)}
            className="mt-[15px] p-[5px] px-[15px] flex items-center border-3 border-[#0044FF] rounded-[15px] bg-white text-[22px] font-semibold"
          >
            필요한 서류 보기
          </button>
        </div>

        <div className="flex flex-col gap-10 p-5 mt-15">
          {step.map((step:any) => (
            <div key={step.id} className="relative">
              <div className={`absolute -top-4 -left-2 w-13 h-13 flex items-center justify-center rounded-full text-white font-bold text-[36px] ${step.isCompleted ? 'bg-[#00CA22]' : 'bg-[#009DFF]'}`}>
                {step.id}
              </div>
              <div className={`p-5 pt-8 border-2 rounded-[10px] ${step.isCompleted ? 'border-[#009C27] bg-[#F4FFF6]' : 'border-[#C9C9C9] bg-[#white]'}`}>
                <h2 className="mb-4 text-[28px] font-bold text-black">{step.title}</h2>
                <p className="px-3 mb-11 text-[22px] text-black">{step.description}</p>
                <div className="flex flex-col">
                  {step.link && (
                    <button className="mb-2 mx-4.5 py-1.5 flex items-center justify-center bg-[#3F85FF] rounded-[10px] text-white text-[22px] font-bold">
                      <ExternalLink className="w-5 h-5"/>
                      사이트 바로가기
                    </button>
                  )}
                  <button className="mx-4.5 py-1.5 flex items-center justify-center bg-[#E4E4E4] rounded-[10px] text-[23px] font-bold text-black">
                    <Volume2 className="w-7 h-7"/>
                    음성으로 듣기
                  </button>

                  <button
                    onClick={() => Complete(step.id)}
                    className="mt-7 flex items-center"
                  >
                    <div className={`w-9 h-9 flex items-center justify-center ${step.isCompleted ? 'bg-[#00E404]' : 'bg-[#F1F1F1]'}`}>
                      {step.isCompleted && <Check className="text-white w-7 h-7"/>}
                    </div>
                    <span className="ml-2 text-[24px] font-bold text-black">완료</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProcedureScreen;