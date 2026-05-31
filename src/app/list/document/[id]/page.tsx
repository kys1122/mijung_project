"use client";

import { Building2, Check, ChevronLeft, FileText, MessageCircle, Sparkles, Monitor } from "lucide-react";
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

  // 발급 트랙별 분리 — detail.online 있으면 온라인 발급 가능, detail.offline 있으면 오프라인 발급 가능
  const offlineDocs = doc.filter(d => d.detail?.offline);
  const onlineDocs = doc.filter(d => d.detail?.online);
  const offlineDone = offlineDocs.filter(d => d.isCompleted).length;
  const onlineDone = onlineDocs.filter(d => d.isCompleted).length;
  const offlinePct = offlineDocs.length > 0 ? (offlineDone / offlineDocs.length) * 100 : 0;
  const onlinePct = onlineDocs.length > 0 ? (onlineDone / onlineDocs.length) * 100 : 0;
  const showSplit = offlineDocs.length > 0 && onlineDocs.length > 0;

  // 토큰
  const pageBg = isHighContrast ? 'bg-black' : 'bg-surface-page';
  const cardCls = isHighContrast ? 'rounded-2xl bg-zinc-900 border border-yellow-400' : 'ui-card';
  const cardDoneCls = isHighContrast ? 'rounded-2xl bg-zinc-900 border border-yellow-300 opacity-80' : 'rounded-2xl bg-success/5 border border-emerald-200 shadow-[0_2px_8px_rgba(15,23,42,0.05)]';
  const summaryBox = isHighContrast ? 'rounded-2xl bg-zinc-900 border border-yellow-400' : 'rounded-2xl bg-brand-50 border border-brand-100';
  const titleColor = isHighContrast ? 'text-white' : 'text-ink-1';
  const descColor = isHighContrast ? 'text-zinc-300' : 'text-ink-2';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-ink-3';
  const metaColor = isHighContrast ? 'text-zinc-500' : 'text-ink-4';
  const progressBg = isHighContrast ? 'bg-zinc-800' : 'bg-line-soft';
  const progressFill = isHighContrast ? 'bg-yellow-400' : 'bg-brand-600';
  const checkboxOn = isHighContrast ? 'bg-yellow-400 border-yellow-400' : 'bg-emerald-500 border-emerald-500';
  const checkboxOff = isHighContrast ? 'bg-transparent border-zinc-500' : 'bg-surface border-line-strong';
  const readBtn = isHighContrast
    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
    : 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_4px_12px_rgba(37,99,235,0.22)]';
  const trackChipOffline = isHighContrast
    ? 'bg-zinc-800 text-yellow-300 border border-yellow-400/40'
    : 'bg-brand-50 text-brand-700 border border-brand-100';
  const trackChipOnline = isHighContrast
    ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
    : 'bg-surface-muted text-ink-2 border border-line-soft';

  const sizeBody = isLargeFont ? 'text-base sm:text-lg' : 'text-sm sm:text-base';
  const sizeDocTitle = isLargeFont ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl';
  const sizeBtn = isLargeFont ? 'text-lg' : 'text-base';

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="mx-auto max-w-md sm:max-w-2xl px-5 sm:px-8 pt-4 pb-28">
        <header className="pt-2 flex items-center justify-between gap-2 ui-enter">
          <button
            onClick={() => router.back()}
            className={`inline-flex items-center gap-1 -ml-2 px-3 py-2 rounded-xl transition-colors hover:bg-black/5 ${titleColor}`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className={`font-medium ${sizeBody}`}>{t.back}</span>
          </button>
          <TopSettings
            lang={lang} setLang={handleLang}
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
          />
        </header>

        <h1 className={`mt-5 ui-page-title ${titleColor} ui-enter`}>
          {pageTitle || t.docsFallback}
        </h1>

        {doc.length === 0 ? (
          llmLoading ? (
            <div className={`mt-6 p-6 text-center ${summaryBox} ui-enter`}>
              <div className="mx-auto w-8 h-8 border-[3px] border-line-base border-t-brand-500 rounded-full animate-spin" />
              <p className={`mt-3 ${subtleColor} ${sizeBody}`}>
                {lang === 'en' ? 'Preparing the checklist...' : '체크리스트를 준비하고 있어요...'}
              </p>
            </div>
          ) : llmChecklist ? (
            <div className={`mt-6 p-5 ${summaryBox} ui-enter`}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className={`w-5 h-5 ${isHighContrast ? 'text-yellow-400' : 'text-brand-600'}`} />
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
            <div className={`mt-6 p-6 text-center ${summaryBox} ui-enter`}>
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${isHighContrast ? 'bg-zinc-800' : 'bg-surface'}`}>
                <Sparkles className={`w-6 h-6 ${isHighContrast ? 'text-yellow-400' : 'text-brand-600'}`} />
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
          <div className={`mt-6 p-5 ${summaryBox} ui-enter`}>
            <h2 className={`font-bold ${titleColor} ${sizeDocTitle}`}>{t.need}</h2>
            {showSplit ? (
              <div className="mt-3 flex flex-col gap-3">
                {/* 오프라인 발급 트랙 */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${descColor}`}>
                      <Building2 className="w-4 h-4 opacity-70" />
                      {lang === 'en' ? 'Offline issuance' : '오프라인 발급'}
                    </span>
                    <span className={`text-xs font-semibold tabular-nums ${metaColor}`}>
                      {offlineDone}/{offlineDocs.length}
                    </span>
                  </div>
                  <div className={`mt-1.5 w-full h-2 rounded-full overflow-hidden ${progressBg}`}>
                    <div className={`h-full rounded-full transition-all duration-500 ${progressFill}`} style={{ width: `${offlinePct}%` }} />
                  </div>
                </div>
                {/* 온라인 발급 트랙 */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${descColor}`}>
                      <Monitor className="w-4 h-4 opacity-70" />
                      {lang === 'en' ? 'Online issuance' : '온라인 발급'}
                    </span>
                    <span className={`text-xs font-semibold tabular-nums ${metaColor}`}>
                      {onlineDone}/{onlineDocs.length}
                    </span>
                  </div>
                  <div className={`mt-1.5 w-full h-2 rounded-full overflow-hidden ${progressBg}`}>
                    <div className={`h-full rounded-full transition-all duration-500 ${progressFill}`} style={{ width: `${onlinePct}%` }} />
                  </div>
                </div>
                <p className={`mt-1 text-xs ${metaColor}`}>
                  {lang === 'en'
                    ? 'Some documents can be issued either online or offline — they count in both tracks.'
                    : '온·오프라인 모두 발급 가능한 서류는 두 트랙 모두에 반영돼요.'}
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <span className={`font-medium ${subtleColor}`}>
                  {doc.filter(d => d.isCompleted).length}/{doc.length} {lang === 'en' ? 'ready' : '준비 완료'}
                </span>
                <div className={`mt-1.5 w-full h-2 rounded-full overflow-hidden ${progressBg}`}>
                  <div className={`h-full rounded-full transition-all duration-500 ${progressFill}`} style={{ width: `${doc.length > 0 ? (doc.filter(d => d.isCompleted).length / doc.length) * 100 : 0}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4">
          {doc.map((d) => {
            const hasOnline = !!d.detail?.online;
            const hasOffline = !!d.detail?.offline;
            return (
              <article
                key={d.id}
                className={`${d.isCompleted ? cardDoneCls : cardCls} transition-all`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-2">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold shrink-0 ${
                      isHighContrast ? 'bg-yellow-400 text-black' : 'bg-brand-100 text-brand-700'
                    } ${sizeBody}`}>
                      {d.id}
                    </span>
                    <h2 className={`flex-1 font-bold ${d.isCompleted ? subtleColor : titleColor} ${sizeDocTitle}`}>
                      {d.title}
                    </h2>
                  </div>

                  {(hasOnline || hasOffline) && (
                    <div className="mt-2.5 ml-9 flex flex-wrap gap-1.5">
                      {hasOffline && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${trackChipOffline}`}>
                          <Building2 className="w-3 h-3" />
                          {lang === 'en' ? 'Offline' : '오프라인'}
                        </span>
                      )}
                      {hasOnline && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${trackChipOnline}`}>
                          <Monitor className="w-3 h-3" />
                          {lang === 'en' ? 'Online' : '온라인'}
                        </span>
                      )}
                    </div>
                  )}

                  <p className={`mt-3 leading-relaxed ${d.isCompleted ? subtleColor : descColor} ${sizeBody}`}>
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
                      className={`w-full py-3 rounded-2xl font-semibold transition-colors flex items-center justify-center gap-1.5 ${readBtn} ${sizeBtn}`}
                    >
                      <FileText className="w-4 h-4" />
                      {t.read}
                    </button>

                    <button
                      onClick={() => Complete(d.id)}
                      className="mt-1 flex items-center gap-2.5 group"
                    >
                      <span className={`w-7 h-7 flex items-center justify-center rounded-lg border-2 transition-all ${d.isCompleted ? checkboxOn : checkboxOff} group-hover:scale-105`}>
                        {d.isCompleted && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                      </span>
                      <span className={`font-semibold ${d.isCompleted ? subtleColor : titleColor} ${sizeBody}`}>
                        {t.done}
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
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
