"use client"

import { Check, ChevronLeft, ExternalLink, Volume2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

//임시 데이터
const TestData : Record<string, any> = {
  //데이터가 없을 때
  nothingData: {
    name: "데이터 없음",
    step: [
      {id: 1, title: "데이터가 없습니다.", description: "설명없음"}
    ]
  },
  basicLiving: {
    name: "국민기초생활수급자증명",
    step: [
      {id: 1, title: "정부24 접속", description: "정부24 사이트 접속", isCompleted: false}
    ]
  },
  feeReduction: {
    name: "요금감면 일괄 신청",
    step: [
      {id: 1, title: "정부24 접속 후 로그인", description: "정부24 사이트 접속", link: "https://www.gov.kr", isCompleted: false},
      {id: 2, title: "요금감면 일괄신청 검색 후 서비스 신청", description: "오른쪽 위 전체메뉴 → 민원 찾기 → 검색창에 '요금감면 일괄신청' 검색 후 신청하기 클릭", isCompleted: false},
      {id: 3, title: "신청인 정보 입력 및 감면 자격 확인", description: "시도/시군구 선택 후 [주소조회] 선택 관련 유의사항 읽은 후 동의 체크, 신청인 정보 입력 및 감면 자격 확인", isCompleted: false},
      {id: 4, title: "필요한 항목 선택 후 고객번호 입력", description: "전기, 도시가스, TV수신료 등 필요한 항목 선택 후 고객번호 입력", isCompleted: false},
      {id: 5, title: "신청서 제출", description: "신청서 제출", isCompleted: false}
    ]
  }
}

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
        onClick={() => router.push('/list')}
        className="flex items-center activate:opacity-40 transition-opacity gap-1"
        >
          <ChevronLeft className="w-8 h-8 text-black"/>
          <span className="text-[24px] text-black">민원 선택으로</span>
        </button>
      </header>

      <div className="w-full max-w-[450px]">
        <h1 className="pt-[15px] text-[36px] font-bold">{currentProcedure.name}</h1>
        
        <div className="mt-[25px] pt-[10px] px-5 pb-4 bg-[#E9F1FF] rounded-[15px]">
          <span className="text-center text-[24px] text-black font-bold block">진행률</span>
          <span className="w-full text-right text-[20px] text-black block -mt-3">{completedCount}/{step.length}</span>
          <div className="w-full h-4 bg-white rounded-[20px]">
            <div className="bg-[#005EFF] h-full transition-all rounded-[20px]"
                 style={{width: `${progress}%`}}/>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="mt-[15px] p-[5px] px-[15px] flex items-center border-3 border-[#0044FF] rounded-[15px] bg-white text-[24px] font-semibold">
            필요한 서류 보기
          </button>
        </div>

        <div className="flex flex-col gap-10 p-5 mt-10">
          {step.map((step:any) => (
            <div key={step.id} className="relative">
              <div className={`absolute -top-4 -left-2 w-12 h-12 flex items-center justify-center rounded-full text-white font-bold text-[40px] ${step.isCompleted ? 'bg-[#00CA22]' : 'bg-[#009DFF]'}`}>
                {step.id}
              </div>
              <div className={`p-5 pt-8 border-2 rounded-[10px] ${step.isCompleted ? 'border-[#009C27] bg-[#F4FFF6]' : 'border-[#C9C9C9] bg-[#white]'}`}>
                <h2 className="mb-4 text-[30px] font-bold text-black">{step.title}</h2>
                <p className="px-3 mb-10 text-[24px] text-black">{step.description}</p>
                <div className="flex flex-col">
                  {step.link && (
                    <button className="w-full flex items-center justify-center bg-[#3F85FF] rounded-[10px] text-white text-[24px] font-bold">
                      <ExternalLink className="w-5 h-5"/>
                      사이트 바로가기
                    </button>
                  )}
                  <button className="mx-4 py-1 flex items-center justify-center bg-[#E4E4E4] rounded-[10px] text-[24px] font-bold text-black">
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