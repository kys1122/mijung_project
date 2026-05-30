"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Sparkles, Search, Building2 } from "lucide-react";
import TopSettings from '../components/TopSettings';
import BottomNav from '../components/BottomNav';
import { useTranslations } from '../lib/i18n';
import { STRINGS as LIST_STRINGS, type ListStrings } from '../lib/strings/list';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';

interface RecItem {
  id: number;
  url: string;
  title: string;
  description: string;
}

interface ServiceItem {
  id: number;
  name: string;
  official_name: string | null;
  ministry: string | null;
  department: string | null;
}

const RecommendScreen: React.FC = () => {
  const [recs, setRecs] = useState<RecItem[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [all, setAll] = useState<ServiceItem[]>([]);
  const [allLoading, setAllLoading] = useState(true);
  const [query, setQuery] = useState("");
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
            title: s.service_name,
            description: `${s.agency ?? ''}${s.eligibility ? ' · ' + s.eligibility : ''}`,
          }));
          setRecs(mapped);
          if (parsed.summary) setAiSummary(parsed.summary);
        }
      }
    } catch (e) { console.warn('analyze_result 파싱 실패:', e); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/services');
        const data = await res.json();
        if (data?.success) setAll(data.services ?? []);
      } catch (e) {
        console.error('전체 민원 로드 실패:', e);
      } finally {
        setAllLoading(false);
      }
    })();
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

  const filteredAll = query.trim()
    ? all.filter((s) => {
        const q = query.trim().toLowerCase();
        return s.name.toLowerCase().includes(q)
          || (s.official_name ?? '').toLowerCase().includes(q)
          || (s.ministry ?? '').toLowerCase().includes(q);
      })
    : all;

  const pageBg = isHighContrast ? 'bg-black' : 'bg-slate-50';
  const cardBg = isHighContrast ? 'bg-zinc-900 border-yellow-400' : 'bg-white border-slate-200/70';
  const titleColor = isHighContrast ? 'text-white' : 'text-slate-900';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-slate-500';
  const descColor = isHighContrast ? 'text-zinc-300' : 'text-slate-600';
  const summaryBox = isHighContrast
    ? 'bg-zinc-900 border-yellow-400 text-white'
    : 'bg-blue-50 border-blue-100 text-slate-700';
  const inputBg = isHighContrast
    ? 'bg-zinc-900 border-zinc-700 text-white'
    : 'bg-white border-slate-200 text-slate-900';
  const ctaBtn = isHighContrast
    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  const secondaryBtn = isHighContrast
    ? 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white'
    : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700';

  const sizeTitle = isLargeFont ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl';
  const sizeSection = isLargeFont ? 'text-xl' : 'text-lg';
  const sizeSub = isLargeFont ? 'text-lg' : 'text-base';
  const sizeCardTitle = isLargeFont ? 'text-lg' : 'text-base';
  const sizeCardDesc = isLargeFont ? 'text-base' : 'text-sm';

  const navigateToService = (idOrName: string | number) => {
    router.push(`/list/procedure/${encodeURIComponent(String(idOrName))}`);
  };

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="mx-auto max-w-md sm:max-w-3xl lg:max-w-5xl px-5 sm:px-8 pt-4 pb-28">
        <div className="flex items-start justify-end">
          <TopSettings
            lang={lang} setLang={handleLang}
            isHighContrast={isHighContrast} setIsHighContrast={handleContrast}
            isLargeFont={isLargeFont} setIsLargeFont={handleFont} t={t}
          />
        </div>

        <div className="mt-2">
          <h1 className={`font-bold tracking-tight ${titleColor} ${sizeTitle}`}>
            {lang === 'en' ? 'Services' : '민원 둘러보기'}
          </h1>
          <p className={`mt-1 ${subtleColor} ${sizeSub}`}>
            {lang === 'en'
              ? 'Recommendations and the full directory'
              : '맞춤 추천과 전체 민원 목록'}
          </p>
        </div>

        {/* 추천 섹션 */}
        {recs.length > 0 && (
          <section className="mt-7">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-5 h-5 ${isHighContrast ? 'text-yellow-400' : 'text-blue-500'}`} />
              <h2 className={`font-bold ${titleColor} ${sizeSection}`}>
                {lang === 'en' ? 'Matched for you' : '맞춤 추천'}
              </h2>
            </div>
            {aiSummary && (
              <div className={`mt-3 rounded-2xl border p-4 ${summaryBox}`}>
                <p className={`leading-relaxed ${sizeCardDesc}`}>{aiSummary}</p>
              </div>
            )}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recs.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-2xl border shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col ${cardBg}`}
                >
                  <h3 className={`font-bold ${titleColor} ${sizeCardTitle}`}>{item.title}</h3>
                  {item.description && (
                    <p className={`mt-2 flex-1 leading-relaxed ${descColor} ${sizeCardDesc}`}>{item.description}</p>
                  )}
                  <button
                    onClick={() => navigateToService(item.url)}
                    className={`mt-5 w-full py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 ${ctaBtn} ${sizeCardDesc}`}
                  >
                    {t.btn}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 전체 민원 섹션 */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className={`font-bold ${titleColor} ${sizeSection}`}>
              {lang === 'en' ? 'All services' : '전체 민원'}
              {!allLoading && <span className={`ml-2 font-medium ${subtleColor} ${sizeCardDesc}`}>({all.length})</span>}
            </h2>
            {recs.length === 0 && (
              <button
                onClick={() => router.push('/qa')}
                className={`text-xs font-semibold transition-colors ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}
              >
                {lang === 'en' ? '+ Get recommendations' : '+ 맞춤 추천 받기'}
              </button>
            )}
          </div>

          <div className="mt-3 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${subtleColor}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === 'en' ? 'Search by name or ministry...' : '민원명 / 부처로 검색...'}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium ${inputBg} ${sizeCardDesc}`}
            />
          </div>

          {allLoading ? (
            <div className="mt-8 flex flex-col items-center gap-3 text-slate-400">
              <div className="w-7 h-7 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-sm">{lang === 'en' ? 'Loading...' : '불러오는 중...'}</p>
            </div>
          ) : filteredAll.length === 0 ? (
            <div className={`mt-4 rounded-2xl border ${cardBg} p-6 text-center`}>
              <p className={`${titleColor} ${sizeCardTitle}`}>
                {lang === 'en' ? 'No services match your search' : '검색 결과가 없어요'}
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAll.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigateToService(s.id)}
                  className={`group rounded-2xl border shadow-sm hover:shadow-md transition-all p-4 text-left flex flex-col ${cardBg}`}
                >
                  <h3 className={`font-bold ${titleColor} ${sizeCardTitle}`}>{s.name}</h3>
                  {(s.ministry || s.department) && (
                    <div className={`mt-1.5 flex items-center gap-1 text-xs ${subtleColor}`}>
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{s.ministry || s.department}</span>
                    </div>
                  )}
                  <div className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold self-start ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'} group-hover:gap-2 transition-all`}>
                    {lang === 'en' ? 'View' : '자세히 보기'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}

export default RecommendScreen;
