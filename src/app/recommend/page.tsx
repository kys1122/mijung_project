"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import TopSettings from '../components/TopSettings';
import BottomNav from '../components/BottomNav';
import { useTranslations } from '../lib/i18n';
import { STRINGS as LIST_STRINGS, type ListStrings } from '../lib/strings/list';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';

interface RecItem {
  id: number;
  url: string;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
}

const RecommendScreen: React.FC = () => {
  const [items, setItems] = useState<RecItem[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    try {
      const cached = localStorage.getItem('analyze_result');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.matched_services) && parsed.matched_services.length > 0) {
          const mapped: RecItem[] = parsed.matched_services.map((s: any, idx: number) => ({
            id: idx + 1,
            url: encodeURIComponent(s.service_name),
            title: { ko: s.service_name, en: s.service_name },
            description: {
              ko: `${s.agency ?? ''}${s.eligibility ? ' · ' + s.eligibility : ''}`,
              en: `${s.agency ?? ''}${s.eligibility ? ' · ' + s.eligibility : ''}`
            }
          }));
          setItems(mapped);
          if (parsed.summary) setAiSummary(parsed.summary);
          return;
        }
      }
    } catch (e) { console.warn('analyze_result 파싱 실패:', e); }
  }, []);

  const [lang, setLang] = useState<LangCode>(DEFAULT_LANG);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') ?? '';
    const savedContrast = localStorage.getItem('app_contrast') === 'true';
    const savedFont = localStorage.getItem('app_font') === 'true';
    if (isSupported(savedLang)) setLang(savedLang);
    if (savedContrast) setIsHighContrast(savedContrast);
    if (savedFont) setIsLargeFont(savedFont);
  }, []);

  const handleLang = (val: LangCode) => { setLang(val); localStorage.setItem('app_lang', val); };
  const handleContrast = (val: boolean) => { setIsHighContrast(val); localStorage.setItem('app_contrast', String(val)); };
  const handleFont = (val: boolean) => { setIsLargeFont(val); localStorage.setItem('app_font', String(val)); };

  const t = useTranslations<ListStrings>('list', LIST_STRINGS as unknown as { ko: ListStrings; en: ListStrings }, lang);

  const pageBg = isHighContrast ? 'bg-black' : 'bg-slate-50';
  const cardBg = isHighContrast ? 'bg-zinc-900 border-yellow-400' : 'bg-white border-slate-200/70';
  const titleColor = isHighContrast ? 'text-white' : 'text-slate-900';
  const descColor = isHighContrast ? 'text-zinc-300' : 'text-slate-500';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-slate-500';
  const ctaBtn = isHighContrast
    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  const summaryBox = isHighContrast
    ? 'bg-zinc-900 border-yellow-400 text-white'
    : 'bg-blue-50 border-blue-100 text-slate-700';

  const sizeTitle = isLargeFont ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl';
  const sizeSub = isLargeFont ? 'text-lg sm:text-xl' : 'text-base sm:text-lg';
  const sizeCardTitle = isLargeFont ? 'text-xl' : 'text-lg';
  const sizeCardDesc = isLargeFont ? 'text-base' : 'text-sm';
  const sizeCardBtn = isLargeFont ? 'text-lg' : 'text-base';

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="mx-auto max-w-md sm:max-w-3xl lg:max-w-5xl px-5 sm:px-8 pt-4 pb-28">
        <header className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className={`flex items-center gap-1 -ml-2 p-2 rounded-lg hover:bg-black/5 transition-colors ${titleColor}`}
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="text-base font-medium">뒤로</span>
          </button>
          <TopSettings
            lang={lang} setLang={handleLang}
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
          />
        </header>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-7 h-7 ${isHighContrast ? 'text-yellow-400' : 'text-blue-500'}`} />
            <h1 className={`font-bold tracking-tight ${titleColor} ${sizeTitle}`}>
              {lang === 'en' ? 'Recommended' : '추천 민원'}
            </h1>
          </div>
          <p className={`mt-1 ${subtleColor} ${sizeSub}`}>
            {lang === 'en'
              ? 'Civil services matched to your situation'
              : '입력하신 정보에 맞춰 찾은 민원이에요'}
          </p>
        </div>

        {aiSummary && (
          <div className={`mt-6 rounded-2xl border p-4 ${summaryBox}`}>
            <div className="flex items-start gap-2">
              <Sparkles className={`w-5 h-5 mt-0.5 ${isHighContrast ? 'text-yellow-400' : 'text-blue-500'}`} />
              <p className={`flex-1 leading-relaxed ${sizeCardDesc}`}>{aiSummary}</p>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className={`mt-12 rounded-2xl border ${cardBg} p-8 text-center`}>
            <p className={`${titleColor} ${sizeCardTitle}`}>
              {lang === 'en' ? 'No recommendations yet' : '아직 추천 민원이 없어요'}
            </p>
            <p className={`mt-2 ${descColor} ${sizeCardDesc}`}>
              {lang === 'en' ? 'Answer a few questions to get recommendations' : '몇 가지 질문에 답하면 맞춤 추천을 받을 수 있어요'}
            </p>
            <button
              onClick={() => router.push('/qa')}
              className={`mt-5 w-full py-3 rounded-xl font-semibold transition-colors ${ctaBtn} ${sizeCardBtn}`}
            >
              {lang === 'en' ? 'Start' : '질문 시작하기'}
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <article
                key={item.id}
                className={`rounded-2xl border shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col ${cardBg}`}
              >
                <h2 className={`font-bold ${titleColor} ${sizeCardTitle}`}>
                  {item.title[lang as 'ko' | 'en'] ?? item.title.en}
                </h2>
                <p className={`mt-2 flex-1 leading-relaxed ${descColor} ${sizeCardDesc}`}>
                  {item.description[lang as 'ko' | 'en'] ?? item.description.en}
                </p>
                <button
                  onClick={() => router.push(`/list/procedure/${item.url}`)}
                  className={`mt-5 w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 ${ctaBtn} ${sizeCardBtn}`}
                >
                  {t.btn}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default RecommendScreen;
