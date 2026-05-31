"use client";

import { Building2, Check, ChevronLeft, FileText, MessageCircle, Sparkles } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import DetailModal from "./detailModal";
import TopSettings from "@/app/components/TopSettings";
import { useTranslations } from '../../../lib/i18n';
import { STRINGS as DOC_STRINGS, type DocumentStrings } from '../../../lib/strings/document';
import { DEFAULT_LANG, isSupported, type LangCode } from '../../../lib/languages';
import { apiFetch, getAccessToken } from '@/lib/api-client';
import BottomNav from '../../../components/BottomNav';
import ChecklistRenderer from '../../../components/ChecklistRenderer';

const DocumentScreen: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [doc, setDoc] = useState<any[]>([]);
  const [pageTitle, setPageTitle] = useState<string>("");
  const [llmChecklist, setLlmChecklist] = useState<string>("");
  const [llmLoading, setLlmLoading] = useState(false);

  useEffect(() => {
    const fetchRequiredDocs = async () => {
      if (!id) return;
      try {
        const res = await apiFetch(`/api/required-docs/${id}`);
        const data = await res.json();
        const docs = data.document || [];
        setDoc(docs);
        setPageTitle(data.title || "");

        // mijung 자체 파싱이 빈 결과면 챗봇 LLM 체크리스트로 폴백
        if (docs.length === 0 && data.title) {
          setLlmLoading(true);
          try {
            const cl = await apiFetch('/api/llm-checklist', {
              method: 'POST',
              body: JSON.stringify({ service_name: data.title, lang: 'ko', user_type: '' }),
            });
            const cdata = await cl.json();
            if (cdata?.checklist) setLlmChecklist(cdata.checklist);
          } catch (e) {
            console.error('LLM 체크리스트 폴백 실패:', e);
          } finally {
            setLlmLoading(false);
          }
        }
      } catch (error) {
        console.error("백엔드 데이터 호출 실패:", error);
        setDoc([]);
      }
    };
    fetchRequiredDocs();
  }, [id]);

  useEffect(() => {
    if (!id || !getAccessToken()) return;
    apiFetch(`/api/my-services/${id}/visit`, {
      method: 'POST',
      body: JSON.stringify({ step: 'required_docs' }),
    }).catch(err => console.error('visit 기록 실패:', err));
  }, [id]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const completedCount = doc.filter((d) => d.isCompleted).length;

  const Complete = async (docId: number) => {
    const target = doc.find((d) => d.id === docId);
    if (!target) return;
    const newChecked = !target.isCompleted;
    setDoc(prev => prev.map((d) => (d.id === docId ? { ...d, isCompleted: newChecked } : d)));

    if (!getAccessToken()) return;
    try {
      const res = await apiFetch(`/api/checklist/${id}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ item_id: `doc_${docId}`, checked: newChecked }),
      });
      if (!res.ok) throw new Error(`progress ${res.status}`);
    } catch (err) {
      console.error('진행도 저장 실패:', err);
    }
  };

  const handleOpenDetail = (docItem: any) => {
    setSelectedDoc(docItem);
    setModalOpen(true);
  };

  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);

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

  const pageBg = isHighContrast ? 'bg-black' : 'bg-slate-50';
  const cardBg = isHighContrast ? 'bg-zinc-900 border-yellow-400' : 'bg-white border-slate-200/70';
  const cardDone = isHighContrast ? 'bg-zinc-900 border-yellow-300 opacity-80' : 'bg-slate-100 border-slate-200';
  const summaryBox = isHighContrast ? 'bg-zinc-900 border-yellow-400' : 'bg-blue-50 border-blue-100';
  const titleColor = isHighContrast ? 'text-white' : 'text-slate-900';
  const descColor = isHighContrast ? 'text-zinc-300' : 'text-slate-600';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-slate-600';
  const checkboxOn = isHighContrast ? 'bg-yellow-400 border-yellow-400' : 'bg-emerald-500 border-emerald-500';
  const checkboxOff = isHighContrast ? 'bg-transparent border-zinc-500' : 'bg-white border-slate-300';
  const readBtn = isHighContrast
    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
    : 'bg-blue-600 text-white hover:bg-blue-700';

  const sizeTitle = isLargeFont ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl';
  const sizeBody = isLargeFont ? 'text-base sm:text-lg' : 'text-sm sm:text-base';
  const sizeDocTitle = isLargeFont ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl';
  const sizeBtn = isLargeFont ? 'text-lg' : 'text-base';

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="mx-auto max-w-md sm:max-w-2xl px-5 sm:px-8 pt-4 pb-28">
        <header className="flex items-center justify-between gap-2">
          <button
            onClick={() => router.back()}
            className={`flex items-center gap-1 -ml-2 p-2 rounded-lg hover:bg-black/5 transition-colors ${titleColor}`}
          >
            <ChevronLeft className="w-6 h-6" />
            <span className={sizeBody}>{t.back}</span>
          </button>
          <TopSettings
            lang={lang} setLang={handleLang}
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
          />
        </header>

        <h1 className={`mt-4 font-bold tracking-tight ${titleColor} ${sizeTitle}`}>
          {pageTitle || t.docsFallback}
        </h1>

        {doc.length === 0 ? (
          llmLoading ? (
            <div className={`mt-5 rounded-2xl border p-6 text-center ${summaryBox}`}>
              <div className={`mx-auto w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin`}></div>
              <p className={`mt-3 ${subtleColor} ${sizeBody}`}>
                {lang === 'en' ? 'Preparing the checklist...' : '체크리스트를 준비하고 있어요...'}
              </p>
            </div>
          ) : llmChecklist ? (
            <div className={`mt-5 rounded-2xl border p-5 ${summaryBox}`}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className={`w-5 h-5 ${isHighContrast ? 'text-yellow-400' : 'text-blue-500'}`} />
                <h2 className={`font-bold ${titleColor} ${sizeDocTitle}`}>
                  {lang === 'en' ? 'Suggested checklist' : 'AI 추천 체크리스트'}
                </h2>
              </div>
              <ChecklistRenderer
                content={llmChecklist}
                serviceName={pageTitle || `service-${id}`}
                isHighContrast={isHighContrast}
                isLargeFont={isLargeFont}
              />
              <button
                onClick={() => router.push(`/chat`)}
                className={`mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition-colors ${readBtn} ${sizeBody}`}
              >
                <MessageCircle className="w-4 h-4" />
                {lang === 'en' ? 'More in chatbot' : '챗봇에서 더 보기'}
              </button>
            </div>
          ) : (
            <div className={`mt-5 rounded-2xl border p-6 text-center ${summaryBox}`}>
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${isHighContrast ? 'bg-zinc-800' : 'bg-white'}`}>
                <Sparkles className={`w-6 h-6 ${isHighContrast ? 'text-yellow-400' : 'text-blue-500'}`} />
              </div>
              <p className={`mt-4 font-semibold ${titleColor} ${sizeDocTitle}`}>
                {lang === 'en' ? 'Documents not listed yet' : '준비물 정보가 정리되어 있지 않아요'}
              </p>
              <p className={`mt-2 ${subtleColor} ${sizeBody}`}>
                {lang === 'en'
                  ? 'Ask the chatbot for a complete checklist for this service.'
                  : '챗봇에서 이 민원의 자세한 안내와 체크리스트를 받아보실 수 있어요.'}
              </p>
              <button
                onClick={() => router.push(`/chat`)}
                className={`mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold transition-colors ${readBtn} ${sizeBtn}`}
              >
                <MessageCircle className="w-4 h-4" />
                {lang === 'en' ? 'Ask the chatbot' : '챗봇에서 자세히 보기'}
              </button>
            </div>
          )
        ) : (
          <div className={`mt-5 rounded-2xl border p-5 ${summaryBox}`}>
            <h2 className={`font-bold ${titleColor} ${sizeDocTitle}`}>
              {t.need} <span className={subtleColor}>({completedCount}/{doc.length})</span>
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {doc.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <span className={`w-5 h-5 shrink-0 flex items-center justify-center rounded-full border-2 ${d.isCompleted ? checkboxOn : checkboxOff}`}>
                    {d.isCompleted && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className={`${sizeBody} ${
                    d.isCompleted
                      ? (isHighContrast ? 'text-zinc-500 line-through' : 'text-slate-500 line-through')
                      : titleColor
                  }`}>
                    {d.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4">
          {doc.map((d) => (
            <article
              key={d.id}
              className={`rounded-2xl border shadow-sm transition-all ${d.isCompleted ? cardDone : cardBg}`}
            >
              <div className="p-5">
                <div className="flex items-start gap-2">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold shrink-0 ${
                    isHighContrast ? 'bg-yellow-400 text-black' : 'bg-blue-100 text-blue-700'
                  } ${sizeBody}`}>
                    {d.id}
                  </span>
                  <h2 className={`flex-1 font-bold ${
                    d.isCompleted ? subtleColor : titleColor
                  } ${sizeDocTitle}`}>
                    {d.title}
                  </h2>
                </div>
                <p className={`mt-3 leading-relaxed ${
                  d.isCompleted ? subtleColor : descColor
                } ${sizeBody}`}>
                  {d.description}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Building2 className={`w-5 h-5 ${d.isCompleted ? subtleColor : descColor}`} />
                  <span className={`font-medium ${d.isCompleted ? subtleColor : descColor} ${sizeBody}`}>
                    {d.institution}
                  </span>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <button
                    onClick={() => handleOpenDetail(d)}
                    className={`w-full py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 ${readBtn} ${sizeBtn}`}
                  >
                    <FileText className="w-4 h-4" />
                    {t.read}
                  </button>

                  <button
                    onClick={() => Complete(d.id)}
                    className="mt-1 flex items-center gap-2"
                  >
                    <span className={`w-7 h-7 flex items-center justify-center rounded-md border-2 transition-colors ${d.isCompleted ? checkboxOn : checkboxOff}`}>
                      {d.isCompleted && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                    </span>
                    <span className={`font-semibold ${d.isCompleted ? subtleColor : titleColor} ${sizeBody}`}>
                      {t.done}
                    </span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <DetailModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          data={selectedDoc}
        />
      </div>
      <BottomNav />
    </div>
  )
}

export default DocumentScreen;
