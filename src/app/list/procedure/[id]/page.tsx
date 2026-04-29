"use client"

import { Check, ChevronLeft, ExternalLink, Volume2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { TestData } from "@/app/data/testData";
import TopSettings from "../../../components/TopSettings";

const ProcedureScreen : React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [step, setStep] = useState<any[]>([]);

  //모드
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as 'ko' | 'en';
    const savedContrast = localStorage.getItem('app_contrast') === 'true';
    const savedFont = localStorage.getItem('app_font') === 'true';
    if (savedLang) setLang(savedLang);
    if (savedContrast) setIsHighContrast(savedContrast);
    if (savedFont) setIsLargeFont(savedFont);
  }, []);

  const handleLang = (newLang: 'ko' | 'en') => { setLang(newLang); localStorage.setItem('app_lang', newLang); };
  const handleContrast = (val: boolean) => { setIsHighContrast(val); localStorage.setItem('app_contrast', String(val)); };
  const handleFont = (val: boolean) => { setIsLargeFont(val); localStorage.setItem('app_font', String(val)); };

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

  const t = {
    ko: { back: "민원 선택으로", progress: "진행률", docs: "필요한 서류 보기", web: "사이트 바로가기", voice: "음성으로 듣기", done: "완료", langText: "한/영변환", highContrast: "고대비모드", largeFont: "큰글씨모드" },
    en: { back: "Back", progress: "Progress", docs: "Required Docs", web: "Website", voice: "Listen", done: "Done", langText: "KO/EN", highContrast: "Contrast", largeFont: "Big Font" }
  }[lang] as any;

  const themeClass = isHighContrast ? "bg-black text-yellow-400" : "bg-white text-black";
  const themeClass2 = isHighContrast ? "bg-black text-white" : "bg-white text-black";
  const headerBorder = isHighContrast ? "border-b border-white" : "border-b-2 border-[#C9C9C9]";
  const textClass = isHighContrast ? 'text-white' : 'text-black'

  return(
    <div className={`min-h-screen flex flex-col items-center ${themeClass2}`}>
      <div className="w-full max-w-[450px]">
        <header className={`relative py-4 item-center justify-between ${headerBorder}`}>
          <button
          onClick={() => router.back()}
          className="flex items-center activate:opacity-40 transition-opacity gap-1"
          >
            <ChevronLeft className="w-8 h-8"/>
            <span className={`${isLargeFont ? 'text-[26px]' : 'text-[22px]'} ${themeClass2}`}>{t.back}</span>
          </button>
          <TopSettings 
            lang={lang} setLang={handleLang} 
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast} 
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t} 
            />
        </header>

        <h1 className={`pt-[15px] ${isLargeFont ? 'text-[37px]' : 'text-[33px]'} font-bold`}>{lang === 'ko' ? currentProcedure.name : currentProcedure.nameEn}</h1>
        
        <div className={`mt-[25px] mx-2 pt-[10px] px-5 pb-4 ${isHighContrast ? 'bg-zinc-900 border border-[#ffd000]' : 'bg-[#E9F1FF]'} rounded-[15px]`}>
          <span className={`text-center ${isLargeFont ? 'text-[27px]' : 'text-[23px]'} font-bold block`}>{t.progress}</span>
          <span className={`w-full text-right ${isLargeFont ? 'text-[22px]' : 'text-[18px]'} block -mt-3`}>{completedCount}/{step.length}</span>
          <div className="w-full h-4 bg-white rounded-[20px]">
            <div className={`${isHighContrast ? 'bg-[#ffd207]' : 'bg-[#005EFF]'} h-full transition-all rounded-[20px]`}
                style={{width: `${progress}%`}}/>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={() => router.push(`/list/document/${id}`)}
            className={`mt-[15px] p-[5px] px-[15px] flex items-center border-3 rounded-[15px] ${isHighContrast ? 'border-[#ffd000]' : 'border-[#0044FF] bg-white'} ${isLargeFont ? 'text-[26px]' : 'text-[22px]'} font-semibold`}
          >
            {t.docs}
          </button>
        </div>

        <div className="flex flex-col gap-10 p-5 mt-15">
          {step.map((step:any) => (
            <div key={step.id} className="relative">
              <div className={`absolute -top-4 -left-2 w-13 h-13 flex items-center justify-center rounded-full ${isHighContrast ? "text-black" : "text-white"} font-bold text-[36px] ${isHighContrast ? (step.isCompleted ? 'bg-[#ffc200]' : 'bg-white') : (step.isCompleted ? 'bg-[#00CA22]' : 'bg-[#009DFF]')}`}>
                {step.id}
              </div>
              <div className={`p-5 pt-8 border-2 rounded-[10px] ${isHighContrast ? (step.isCompleted ? 'border-[#ffdf7e] bg-black' : 'border-white bg-black') : (step.isCompleted ? 'border-[#009C27] bg-[#F4FFF6]' : 'border-[#C9C9C9] bg-white')}`}>
                <h2 className={`mb-4 text-[28px] font-bold ${textClass}`}>{step.title}</h2>
                <p className={`px-3 mb-11 text-[22px] ${textClass}`}>{step.description}</p>
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
                    <div className={`w-9 h-9 flex items-center justify-center ${isHighContrast ? (step.isCompleted ? 'bg-[#ffd000]' : 'bg-black border border-white') : (step.isCompleted ? 'bg-[#00E404]' : 'bg-[#F1F1F1]')}`}>
                      {step.isCompleted && <Check className="text-white w-7 h-7"/>}
                    </div>
                    <span className={`ml-2 text-[24px] font-bold ${textClass}`}>완료</span>
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