"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopSettings from '../components/TopSettings';

interface ListInterface {
  id: number;
  url: string;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
}

//임시 데이터
const ListData: ListInterface[] = [
  {
    id: 1,
    url: "basicLiving",
    title: { ko: "국민기초생활수급자증명", en: "Basic Living Security Certificate" },
    description: { ko: "설명1", en: "Description1" },
  },
  {
    id: 2,
    url: "feeReduction",
    title: { ko: "요금감면 일괄 신청", en: "Utility Fee Reduction Application" },
    description: { ko: "설명2", en: "Description2" },
  }
];

const ListScreen : React.FC = () => {
  const router = useRouter();

  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);

  // 설정 불러오기
  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as 'ko' | 'en';
    const savedContrast = localStorage.getItem('app_contrast') === 'true';
    const savedFont = localStorage.getItem('app_font') === 'true';

    if (savedLang) setLang(savedLang);
    if (savedContrast) setIsHighContrast(savedContrast);
    if (savedFont) setIsLargeFont(savedFont);
  }, []);

  // 설정 저장 함수들
  const handleLang = (val: 'ko' | 'en') => { setLang(val); localStorage.setItem('app_lang', val); };
  const handleContrast = (val: boolean) => { setIsHighContrast(val); localStorage.setItem('app_contrast', String(val)); };
  const handleFont = (val: boolean) => { setIsLargeFont(val); localStorage.setItem('app_font', String(val)); };

  const t = {
    ko: { title: "민원 선택", sub: "사용하실 민원을 선택해주세요.", btn: "민원 절차 보기", langText: "한/영변환", highContrast: "고대비모드", largeFont: "큰글씨모드" },
    en: { title: "Service Selection", sub: "Please select a service.", btn: "View Procedure", langText: "KO/EN", highContrast: "Contrast", largeFont: "BigFont" }
  }[lang];

  const themeClass = isHighContrast ? "bg-black text-white" : "bg-white text-black";
  const cardClass = isHighContrast ? "border-2 border-white bg-black" : "border-2 border-[#C4C4C4] bg-[#F7F7F7]";
  const buttonClass = isHighContrast ? "bg-[#FDC700] text-black hover:bg-[#e0aa00]" : "bg-[#009DFF] text-white hover:bg-[#0089e0]";

  return (
    <div className={`pt-[20px] min-h-screen flex flex-col items-center ${themeClass}`}>
      <div className="w-full max-w-[450px] relative">
        <TopSettings 
        lang={lang} setLang={handleLang} 
        isHighContrast={isHighContrast} setIsHighContrast={handleContrast} 
        isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t} 
        />

        <h1 className={`pt-[12px] ${isLargeFont ? "text-[44px]" : "text-[36px]"} font-bold`}>
            {t.title}
        </h1>
        <p className={`pt-[2px] pl-2 ${isLargeFont ? "text-[28px]" : "text-[24px]"} font-semibold`}>
            {t.sub}
        </p>
        

        <div className="pt-20 w-full max-w-[350px] flex flex-col gap-6">
          {ListData.map((item)=>(
            <div
              key={item.id}
              className={`p-4 border-2 border-[#C4C4C4] rounded-[11px] bg-[#F7F7F7] flex flex-col items-center ${cardClass}`}>
              <h2 className={`${isLargeFont ? "text-[34px]" : "text-[30px]"} font-bold text-center`}>
                {item.title[lang]}
              </h2>
              <p className={`mt-2 px-5 ${isLargeFont ? "text-[26px]" : "text-[22px]"} text-center`}>
                {item.description[lang]}
              </p>
              <button
                onClick={() => router.push(`list/procedure/${item.url}`)}
                className={`mt-7 w-full py-0.5 rounded-[10px] ${buttonClass} ${isLargeFont ? "text-[32px]" : "text-[28px]"} font-bold active:scale-[0.98] transition-all`}>
                {t.btn}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ListScreen;