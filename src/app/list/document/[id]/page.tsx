"use client";

import { Building2, Check, ChevronLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import DetailModal from "./detailModal";
import TopSettings from "@/app/components/TopSettings";
import axios from "axios";
import { useTranslations } from '../../../lib/i18n';
import { STRINGS as DOC_STRINGS, type DocumentStrings } from '../../../lib/strings/document';
import { DEFAULT_LANG, isSupported, type LangCode } from '../../../lib/languages';

const DocumentScreen: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [doc, setDoc] = useState<any[]>([]); // 
  const [pageTitle, setPageTitle] = useState<string>(""); // 실시간 민원명을 담을 상태

  // ---  백엔드 실시간 API 데이터 로딩  ---
  useEffect(() => {
    const fetchRequiredDocs = async () => {
      if (!id) return;
      try {
        // 백엔드 실제 엔드포인트 주소 호출
        const response = await axios.get(`http://localhost:3000/api/required-docs/${id}`);
        
        if (response.data) {
          setDoc(response.data.document || []);       // 백엔드가 준 서류 배열 세팅
          setPageTitle(response.data.title || "");    // 백엔드가 준 민원 제목 세팅
        }
      } catch (error) {
        console.error("백엔드 데이터 호출 실패:", error);
        setDoc([]);
      }
    };

    fetchRequiredDocs();
  }, [id]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const completedCount = doc.filter((d) => d.isCompleted).length;

  const Complete = (docId: number) => {
    setDoc(doc.map((d) => (d.id == docId ? { ...d, isCompleted: !d.isCompleted } : d)));
  };

  const handleOpenDetail = (docItem: any) => {
    setSelectedDoc(docItem);
    setModalOpen(true);
  };

  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);

  // --- 2. 로컬 스토리지 UI 설정 로딩 ---
  useEffect(() => {
    const savedLang = localStorage.getItem("app_lang") ?? '';
    const savedContrast = localStorage.getItem("app_contrast") === "true";
    const savedFont = localStorage.getItem("app_font") === "true";
    if (isSupported(savedLang)) setLang(savedLang);
    if (savedContrast) setIsHighContrast(savedContrast);
    if (savedFont) setIsLargeFont(savedFont);
  }, []);

  const handleLang = (newLang: LangCode) => { setLang(newLang); localStorage.setItem("app_lang", newLang); };
  const handleContrast = (val: boolean) => { setIsHighContrast(val); localStorage.setItem("app_contrast", String(val)); };
  const handleFont = (val: boolean) => { setIsLargeFont(val); localStorage.setItem("app_font", String(val)); };

  const t = useTranslations<DocumentStrings>('document', DOC_STRINGS as unknown as { ko: DocumentStrings; en: DocumentStrings }, lang);

  const themeClass = isHighContrast ? "bg-black text-white" : "bg-white text-black";
  const headerBorder = isHighContrast ? "border-b border-white" : "border-b-2 border-[#C9C9C9]";
  const textClass = isHighContrast ? "text-white" : "text-black";

  return(
    <div className={`flex flex-col items-center ${themeClass}`}>
      <div className="w-full max-w-[450px]">
        <header className={`relative w-full max-w-[450px] py-4 justify-between ${headerBorder}`}>
          <button
            onClick={() => router.back()}
            className="flex items-center activate:opacity-40 transition-opacity gap-1"
          >
            <ChevronLeft className={`w-8 h-8 ${textClass}`}/>
            <span className={`${isLargeFont ? 'text-[26px] ': 'text-[22px]'} ${textClass}`}>{t.back}</span>
          </button>
          <TopSettings 
            lang={lang} setLang={handleLang} 
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast} 
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t} 
          />
        </header>
        <h1 className={`pt-[15px] ${isLargeFont ? 'text-[37px]' : 'text-[33px]'} font-bold`}>{pageTitle || t.docsFallback}</h1>
        <div className={`mt-[25px] mx-2 pt-[10px] px-5 pb-4 rounded-[15px] ${isHighContrast ? "bg-zinc-800 border-2 border-[#ffd000]" : "bg-[#E9F1FF]"}`}>
          <h2 className={`mb-3 ${isLargeFont ? 'text-[30px]' : 'text-[26px]'} font-bold ${textClass}`}>{t.need} ({completedCount}/{doc.length})</h2>
          <div className="flex flex-col">
            {doc.map((doc) => (
              <div key={doc.id} className="flex items-center">
                <div className="w-6 h-6 flex shrink-0 items-center justify-center border border-black rounded-full bg-white">
                  {doc.isCompleted && <Check className="w-5.5 h-5.5 text-black"/>}
                </div>
                <span className={`ml-1.5 ${isLargeFont ? 'text-[26px]' : 'text-[22px]'} font-medium ${isHighContrast ? (doc.isCompleted ? 'text-[#8d8d8d] line-through' : 'text-white') : (doc.isCompleted ? 'text-[#B3B3B3] line-through' : 'text-black')}`}>
                  {doc.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-7 p-5 mt-8">
          {doc.map((doc => (
            <div key={doc.id} className={`p-4 py-3 border-2 rounded-[10px] ${isHighContrast ? (doc.isCompleted ? 'border-[#ffd000]' : 'border-white') : (doc.isCompleted ? 'border-[#8F8F8F] bg-[#DBDBDB]' : 'border-[#9A9A9A] bg-white')}`}>
              <h2 className={`${isLargeFont ? 'text-[34px]' : 'text-[30px]'} font-bold ${isHighContrast ? (doc.isCompleted ? 'text-[#858585]' : 'text-white') : (doc.isCompleted ? 'text-[#858585]' : 'text-black')}`}>
                {doc.id}. {doc.title}
              </h2>
              <p className={`mx-2 ${isLargeFont ? 'text-[28px]' : 'text-[24px]'} ${isHighContrast ? (doc.isCompleted ? 'text-[#858585]' : 'text-white') : (doc.isCompleted ? 'text-[#858585]' : 'text-black')}`}>
                {doc.description}
              </p>
              <div className="px-1.5 mt-6 flex items-center">
                <Building2 className={`${isLargeFont ? 'w-9 h-9' : 'w-7 h-7'} ${isHighContrast ? (doc.isCompleted ? 'text-[#858585]' : 'text-white') : (doc.isCompleted ? 'text-[#858585]' : 'text-black')}`}/>
                <p className={`pl-1.5 ${isLargeFont ? 'text-[30px]' : 'text-[26px]'} font-medium ${isHighContrast ? (doc.isCompleted ? 'text-[#858585]' : 'text-white') : (doc.isCompleted ? 'text-[#858585]' : 'text-black')}`}>발급기관</p>
              </div>
              <p className={`mx-2.5 ${isLargeFont ? 'text-[24px]' : 'text-[20px]'} ${isHighContrast ? (doc.isCompleted ? 'text-[#858585]' : 'text-white') : (doc.isCompleted ? 'text-[#858585]' : 'text-black')}`}>{doc.institution}</p>
              <div className="flex flex-col">
                <button
                  onClick={() => handleOpenDetail(doc)}
                  className={`mb-2 mx-2.5 mt-6 py-1.5 flex items-center justify-center rounded-[10px] ${isLargeFont ? 'text-[26px]' : 'text-[22px]'} font-bold ${isHighContrast ? 'bg-[#ffd000] text-black': 'bg-[#3F85FF] text-white'}`}
                >
                  {t.read}
                </button>
                <DetailModal 
                  isOpen={modalOpen} 
                  onClose={() => setModalOpen(false)} 
                  data={selectedDoc} 
                />
                <button
                  onClick={() => Complete(doc.id)}
                  className="mt-4 flex items-center"
                >
                  <div className={`w-9 h-9 flex items-center justify-center ${doc.isCompleted ? 'bg-[#8F8F8F]' : 'bg-[#F1F1F1]'}`}>
                    {doc.isCompleted && <Check className="text-white w-7 h-7"/>}
                  </div>
                  <span className={`ml-2 ${isLargeFont ? 'text-[28px]' : 'text-[24px]'} font-bold ${isHighContrast ? (doc.isCompleted ? 'text-[#858585]' : 'text-white') : (doc.isCompleted ? 'text-[#858585]' : 'text-black')}`}>{t.done}</span>
                </button>
              </div>
            </div>
          )))}
        </div>
      </div>
    </div>
  )
}

export default DocumentScreen;