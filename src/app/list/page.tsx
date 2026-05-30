"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopSettings from '../components/TopSettings';
import ChatFab from '../components/ChatFab';
import { useTranslations } from '../lib/i18n';
import { STRINGS as LIST_STRINGS, type ListStrings } from '../lib/strings/list';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';

interface ListInterface {
  id: number;
  url: string;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
}

const ListScreen : React.FC = () => {
  const [listData, setListData] = useState<ListInterface[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");

  useEffect(()=> {
    // 1순위: qa에서 저장한 /analyze 결과 사용
    try {
      const cached = localStorage.getItem('analyze_result');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.matched_services) && parsed.matched_services.length > 0) {
          const mapped: ListInterface[] = parsed.matched_services.map((s: any, idx: number) => ({
            id: idx + 1,
            url: encodeURIComponent(s.service_name),
            title: { ko: s.service_name, en: s.service_name },
            description: {
              ko: `${s.agency ?? ''}${s.eligibility ? ' · ' + s.eligibility : ''}`,
              en: `${s.agency ?? ''}${s.eligibility ? ' · ' + s.eligibility : ''}`
            }
          }));
          setListData(mapped);
          if (parsed.summary) setAiSummary(parsed.summary);
          return;
        }
      }
    } catch (e) { console.warn('analyze_result 파싱 실패:', e); }

    // 2순위(fallback): 기존 documents API
    const getListData = async() => {
      try{
        const response = await fetch(`/api/documents/1`);
        const result = await response.json();

        if(result.success && Array.isArray(result.data)){
          const mappedData: ListInterface[] = result.data.map((item: any) => ({
            id: item.id,
            url: item.id.toString(),
            title: {
              ko: item.doc_name,
              en: item.doc_name
            },
            description: {
              ko: `${item.issue_place}에서 발급 가능`,
              en: `Available at ${item.issue_place}`
            }
          }));
          setListData(mappedData);
        } else {
          setListData([]);
        }
      }catch(error){
        console.error("데이터 로드 실패 : ", error);
      }
    };

    getListData();

  },[]);

  const router = useRouter();

  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);

  // 설정 불러오기
  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') ?? '';
    const savedContrast = localStorage.getItem('app_contrast') === 'true';
    const savedFont = localStorage.getItem('app_font') === 'true';

    if (isSupported(savedLang)) setLang(savedLang);
    if (savedContrast) setIsHighContrast(savedContrast);
    if (savedFont) setIsLargeFont(savedFont);
  }, []);

  // 설정 저장 함수들
  const handleLang = (val: LangCode) => { setLang(val); localStorage.setItem('app_lang', val); };
  const handleContrast = (val: boolean) => { setIsHighContrast(val); localStorage.setItem('app_contrast', String(val)); };
  const handleFont = (val: boolean) => { setIsLargeFont(val); localStorage.setItem('app_font', String(val)); };

  const t = useTranslations<ListStrings>('list', LIST_STRINGS as unknown as { ko: ListStrings; en: ListStrings }, lang);

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

        {aiSummary && (
          <div className={`mt-4 mx-4 p-4 rounded-[10px] ${isHighContrast ? 'bg-zinc-800 border border-[#ffd000] text-white' : 'bg-[#E9F1FF] text-black'}`}>
            <p className={`${isLargeFont ? 'text-[22px]' : 'text-[18px]'} leading-snug`}>{aiSummary}</p>
          </div>
        )}

        <div className="pt-10 w-full max-w-[450px] flex flex-col items-center gap-10">
          {listData.map((item)=>(
            <div
              key={item.id}
              className={`p-4 mx-10 border-2 border-[#C4C4C4] rounded-[11px] bg-[#F7F7F7] flex flex-col items-center ${cardClass}`}>
              <h2 className={`${isLargeFont ? "text-[34px]" : "text-[30px]"} font-bold text-center`}>
                {item.title[lang as 'ko' | 'en'] ?? item.title.en}
              </h2>
              <p className={`mt-2 px-5 ${isLargeFont ? "text-[26px]" : "text-[22px]"} text-center`}>
                {item.description[lang as 'ko' | 'en'] ?? item.description.en}
              </p>
              <button
                onClick={() => router.push(`/list/procedure/${item.url}`)}
                className={`mt-7 w-full py-0.5 rounded-[10px] ${buttonClass} ${isLargeFont ? "text-[32px]" : "text-[28px]"} font-bold active:scale-[0.98] transition-all`}>
                {t.btn}
              </button>
            </div>
          ))}
        </div>
      </div>
      <ChatFab isHighContrast={isHighContrast} label={t.chatLabel} />
    </div>
  );
}

export default ListScreen;