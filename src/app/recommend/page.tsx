"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Sparkles, Search, Building2, Loader2 } from "lucide-react";
import TopSettings from '../components/TopSettings';
import BottomNav from '../components/BottomNav';
import { useTranslations } from '../lib/i18n';
import { STRINGS as LIST_STRINGS, type ListStrings } from '../lib/strings/list';
import { DEFAULT_LANG, isSupported, type LangCode } from '../lib/languages';
import { getCategoryMeta } from '@/lib/category';

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
  const router = useRouter();

  // /qa에서 저장한 추천 결과 (있을 때만)
  const [recs, setRecs] = useState<RecItem[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");

  // 전체 민원
  const [all, setAll] = useState<ServiceItem[]>([]);
  const [allLoading, setAllLoading] = useState(true);

  // 검색
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<RecItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");

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

  // 검색어로 챗봇 /analyze 호출 → 결과 setSearchHits
  const runSearch = async () => {
    const q = query.trim();
    if (!q || searchLoading) return;
    setSearchLoading(true);
    setSearchedQuery(q);

    // /qa에서 저장한 컨텍스트 있으면 가져옴, 없으면 기본값
    let ctx: any = null;
    try { ctx = JSON.parse(localStorage.getItem('final_context') ?? 'null'); } catch {}
    const payload = {
      user_type: ctx?.type || '해당없음',
      age_group: ctx?.age || '',
      category: '',
      detail: q,
      lang,
      visa_type: ctx?.visa_type || '',
    };

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const list: any[] = Array.isArray(data?.matched_services) ? data.matched_services : [];
      const mapped: RecItem[] = list.map((s: any, idx: number) => ({
        id: idx + 1,
        url: encodeURIComponent(s.service_name),
        title: s.service_name,
        description: `${s.agency ?? s.official_name ?? ''}${s.eligibility ? ' · ' + s.eligibility : ''}`.trim(),
      }));
      setSearchHits(mapped);
    } catch (e) {
      console.error('검색 실패:', e);
      setSearchHits([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSearchHits(null);
    setSearchedQuery("");
  };

  const filteredAll = query.trim()
    ? all.filter((s) => {
        const q = query.trim().toLowerCase();
        return s.name.toLowerCase().includes(q)
          || (s.official_name ?? '').toLowerCase().includes(q)
          || (s.ministry ?? '').toLowerCase().includes(q);
      })
    : all;

  const pageBg = isHighContrast ? 'bg-black' : 'bg-surface-page';
  const cardCls = isHighContrast ? 'rounded-2xl bg-zinc-900 border border-yellow-400' : 'ui-card-interactive';
  const cardStaticCls = isHighContrast ? 'rounded-2xl bg-zinc-900 border border-yellow-400' : 'ui-card';
  const titleColor = isHighContrast ? 'text-white' : 'text-ink-1';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-ink-3';
  const descColor = isHighContrast ? 'text-zinc-300' : 'text-ink-2';
  const metaColor = isHighContrast ? 'text-zinc-500' : 'text-ink-4';
  const summaryBox = isHighContrast
    ? 'bg-zinc-900 border border-yellow-400 text-white'
    : 'bg-brand-50 border border-brand-100 text-ink-2';
  const inputBg = isHighContrast
    ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500'
    : 'bg-surface border-line-base text-ink-1 placeholder:text-ink-4';
  const ctaBtn = isHighContrast
    ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
    : 'bg-brand-600 hover:bg-brand-700 text-white shadow-[0_4px_12px_rgba(37,99,235,0.22)]';

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
              ? 'Search, browse, or get a personalized match'
              : '검색·둘러보기·맞춤 추천 한 곳에서'}
          </p>
        </div>

        {/* 검색 박스 */}
        <form
          onSubmit={(e) => { e.preventDefault(); runSearch(); }}
          className="mt-5"
        >
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${subtleColor}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === 'en' ? 'Search civil services...' : '예: 기초연금, 건강보험, 외국인 등록...'}
              className={`w-full pl-10 pr-28 py-3.5 rounded-xl border outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium ${inputBg} ${sizeCardDesc}`}
            />
            <button
              type="submit"
              disabled={!query.trim() || searchLoading}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${ctaBtn} text-sm`}
            >
              {searchLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : (lang === 'en' ? 'Search' : '검색')}
            </button>
          </div>
        </form>

        {/* AI 검색 결과 */}
        {searchHits !== null && (
          <section className="mt-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className={`w-5 h-5 ${isHighContrast ? 'text-yellow-400' : 'text-blue-500'}`} />
                <h2 className={`font-bold ${titleColor} ${sizeSection}`}>
                  {lang === 'en' ? 'Search results' : '검색 결과'}
                </h2>
                <span className={`font-medium ${subtleColor} ${sizeCardDesc}`}>
                  &quot;{searchedQuery}&quot;
                </span>
              </div>
              <button
                onClick={clearSearch}
                className={`text-xs font-semibold transition-colors ${isHighContrast ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-800'}`}
              >
                {lang === 'en' ? 'Clear' : '지우기'}
              </button>
            </div>

            {searchHits.length === 0 ? (
              <div className={`mt-3 ${cardStaticCls} p-6 text-center`}>
                <p className={`${titleColor} ${sizeCardTitle}`}>
                  {lang === 'en' ? 'No matches found' : '검색 결과가 없어요'}
                </p>
                <p className={`mt-1 ${subtleColor} text-sm`}>
                  {lang === 'en' ? 'Try different keywords or browse below' : '다른 키워드로 시도하거나 아래 전체 목록에서 찾아보세요'}
                </p>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchHits.map((item) => (
                  <article
                    key={item.id}
                    className={`${cardCls} p-5 flex flex-col`}
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
            )}
          </section>
        )}

        {/* /qa에서 받은 맞춤 추천 (검색 안 했을 때만) */}
        {recs.length > 0 && searchHits === null && (
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
                  className={`${cardCls} p-5 flex flex-col`}
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

        {/* 전체 민원 */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className={`font-bold ${titleColor} ${sizeSection}`}>
              {lang === 'en' ? 'All services' : '전체 민원'}
              {!allLoading && <span className={`ml-2 font-medium ${subtleColor} ${sizeCardDesc}`}>({all.length})</span>}
            </h2>
            {recs.length === 0 && searchHits === null && (
              <button
                onClick={() => router.push('/qa')}
                className={`text-xs font-semibold transition-colors ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}
              >
                {lang === 'en' ? '+ Get recommendations' : '+ 맞춤 추천 받기'}
              </button>
            )}
          </div>

          {allLoading ? (
            <div className="mt-8 flex flex-col items-center gap-3 text-slate-500">
              <div className="w-7 h-7 border-[3px] border-line-base border-t-brand-500 rounded-full animate-spin"></div>
              <p className="text-sm">{lang === 'en' ? 'Loading...' : '불러오는 중...'}</p>
            </div>
          ) : filteredAll.length === 0 ? (
            <div className={`mt-4 ${cardStaticCls} p-6 text-center`}>
              <p className={`${titleColor} ${sizeCardTitle}`}>
                {lang === 'en' ? 'No services match' : '검색 결과가 없어요'}
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAll.map((s, idx) => {
                const cat = getCategoryMeta({ name: s.name, ministry: s.ministry, department: s.department });
                return (
                  <button
                    key={s.id}
                    onClick={() => navigateToService(s.id)}
                    className={`group ${cardCls} text-left flex overflow-hidden active:scale-[0.99] transition-transform ui-enter`}
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className={`w-1.5 ${cat.bar} shrink-0`} />
                    <div className="flex-1 p-4 flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className={`shrink-0 w-9 h-9 rounded-xl ${cat.bg} flex items-center justify-center text-lg`}>
                          {cat.emoji}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cat.bg} ${cat.text}`}>
                          {cat.label}
                        </span>
                      </div>
                      <h3 className={`mt-3 font-bold ${titleColor} ${sizeCardTitle}`}>{s.name}</h3>
                      {(s.ministry || s.department) && (
                        <div className={`mt-1.5 flex items-center gap-1 text-xs ${subtleColor}`}>
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{s.ministry || s.department}</span>
                        </div>
                      )}
                      <div className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold self-start ${isHighContrast ? 'text-yellow-400' : 'text-brand-600'} group-hover:gap-2 transition-all`}>
                        {lang === 'en' ? 'View' : '자세히 보기'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}

export default RecommendScreen;
