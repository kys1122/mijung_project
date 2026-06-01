"use client"

import { Check, ChevronLeft, ChevronRight, ExternalLink, FileText, Volume2, Building2, Coins, ScrollText, Info } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import TopSettings from "../../../components/TopSettings";
import { useTranslations } from '../../../lib/i18n';
import { STRINGS as PROC_STRINGS, type ProcedureStrings } from '../../../lib/strings/procedure';
import { type LangCode } from '../../../lib/languages';
import { useAppLang, useAppContrast, useAppLargeFont } from '../../../lib/app-prefs';
import { useT } from '../../../lib/use-t';
import { apiFetch, getAccessToken } from '@/lib/api-client';
import BottomNav from '../../../components/BottomNav';
import RichTextRenderer from '../../../components/RichTextRenderer';
import FavoriteButton from '../../../components/FavoriteButton';
import { normalizeOfficialLink } from '@/lib/url';
import { useServiceTranslation } from '../../../lib/use-service-translation';
import { tStepTitle } from '../../../lib/chat-options-i18n';

const ProcedureScreen: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const sp = useSearchParams();
  const onBehalfOf = sp.get('on_behalf_of');
  const ctxQs = onBehalfOf ? `?on_behalf_of=${onBehalfOf}` : '';

  const [step, setStep] = useState<any[]>([]);
  const [serviceName, setServiceName] = useState({ ko: "", en: "" });
  const [info, setInfo] = useState<{
    overview: string | null;
    eligibility: string | null;
    ministry: string | null;
    department: string | null;
    fee: string | null;
    official_link: string | null;
  }>({ overview: null, eligibility: null, ministry: null, department: null, fee: null, official_link: null });
  const [loading, setLoading] = useState(true);
  const [llmDetail, setLlmDetail] = useState<string>('');
  const [llmDetailLoading, setLlmDetailLoading] = useState(false);

  const [lang, setLang] = useAppLang();
  const [isHighContrast, setIsHighContrast] = useAppContrast();
  const [isLargeFont, setIsLargeFont] = useAppLargeFont();
  const tx = useT();
  const tr = useServiceTranslation(id, lang);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const sep = ctxQs ? '&' : '?';
        const res = await apiFetch(`/api/checklist/${id}${ctxQs}${sep}lang=${lang}`);
        const data = await res.json();
        setStep(data.steps || []);
        setServiceName({
          ko: data.name,
          en: data.nameEn || data.name
        });
        setInfo({
          overview: data.overview ?? null,
          eligibility: data.eligibility ?? null,
          ministry: data.ministry ?? null,
          department: data.department ?? null,
          fee: data.fee ?? null,
          official_link: data.official_link ?? null,
        });
        // LLM detail은 lang 변경에 반응하도록 별도 useEffect에서 호출
      } catch (err) {
        console.error("데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lang]);

  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (!id || !getAccessToken()) return;
    // 단계 진행 기록
    apiFetch(`/api/my-services/${id}/visit${ctxQs}`, {
      method: 'POST',
      body: JSON.stringify({ step: 'checklist' }),
    }).catch(err => console.error('visit 기록 실패:', err));
    // 최근 본 민원 기록
    apiFetch(`/api/recent-views`, {
      method: 'POST',
      body: JSON.stringify({ service_id: Number(id) }),
    }).catch(err => console.error('recent 기록 실패:', err));
    // 즐겨찾기 여부 확인
    apiFetch('/api/favorites').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.favorites) setIsFavorited(d.favorites.some((f: any) => Number(f.id) === Number(id)));
    }).catch(() => {});
  }, [id]);

  // LLM detail — lang 변경 시 다시 fetch (서비스명 + 언어 둘 다 deps)
  useEffect(() => {
    if (!serviceName.ko) return;
    let cancelled = false;
    setLlmDetailLoading(true);
    fetch('/api/service-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_name: serviceName.ko, lang, user_type: '' }),
    })
      .then(r => r.json())
      .then(d => { if (!cancelled && d?.detail) setLlmDetail(d.detail); })
      .catch(e => console.error('service-detail 호출 실패:', e))
      .finally(() => { if (!cancelled) setLlmDetailLoading(false); });
    return () => { cancelled = true; };
  }, [serviceName.ko, lang]);

  // 트랙별 진행률 — 공통 단계는 양쪽 트랙에 모두 카운트
  const commonSteps = step.filter((s: any) => s.track === 'common' || !s.track);
  const offlineSteps = step.filter((s: any) => s.track === 'offline');
  const onlineSteps = step.filter((s: any) => s.track === 'online');
  const commonDone = commonSteps.filter((s: any) => s.isCompleted).length;
  const offlineDone = offlineSteps.filter((s: any) => s.isCompleted).length;
  const onlineDone = onlineSteps.filter((s: any) => s.isCompleted).length;

  const offlineTotal = commonSteps.length + offlineSteps.length;
  const onlineTotal = commonSteps.length + onlineSteps.length;
  const offlineTrackDone = commonDone + offlineDone;
  const onlineTrackDone = commonDone + onlineDone;
  const offlinePct = offlineTotal > 0 ? (offlineTrackDone / offlineTotal) * 100 : 0;
  const onlinePct = onlineTotal > 0 ? (onlineTrackDone / onlineTotal) * 100 : 0;

  // 트랙이 한쪽만 있으면 단일 진행률로 폴백
  const showOffline = offlineSteps.length > 0;
  const showOnline = onlineSteps.length > 0;
  const showSplit = showOffline && showOnline;

  const [completedToast, setCompletedToast] = useState<string | null>(null);

  const Complete = async (stepId: number) => {
    const target = step.find((s: any) => s.id === stepId);
    if (!target) return;
    const newChecked = !target.isCompleted;
    const nextStep = step.map((s: any) => s.id === stepId ? { ...s, isCompleted: newChecked } : s);
    setStep(nextStep);

    if (!getAccessToken()) return;
    try {
      // 트랙 단위로 완료 여부 판정 — 공통 + offline / 공통 + online
      const commonIds = nextStep.filter((s: any) => s.track === 'common' || !s.track).map((s: any) => `step_${s.id}`);
      const offlineIds = nextStep.filter((s: any) => s.track === 'offline').map((s: any) => `step_${s.id}`);
      const onlineIds = nextStep.filter((s: any) => s.track === 'online').map((s: any) => `step_${s.id}`);
      const tracks: string[][] = [];
      if (offlineIds.length > 0) tracks.push([...commonIds, ...offlineIds]);
      if (onlineIds.length > 0) tracks.push([...commonIds, ...onlineIds]);
      if (tracks.length === 0 && commonIds.length > 0) tracks.push(commonIds);

      const res = await apiFetch(`/api/checklist/${id}/progress${ctxQs}`, {
        method: 'PUT',
        body: JSON.stringify({ item_id: `step_${stepId}`, checked: newChecked, tracks }),
      });
      if (!res.ok) throw new Error(`progress ${res.status}`);
      const data = await res.json().catch(() => null);
      if (data?.auto_submitted) {
        setCompletedToast('🎉 한 신청 절차를 모두 마쳤어요. 내 민원에서 완료로 표시됩니다.');
        setTimeout(() => setCompletedToast(null), 3500);
      }
    } catch (err) {
      console.error('진행도 저장 실패:', err);
    }
  };

  const [markingSubmitted, setMarkingSubmitted] = useState(false);
  const markSubmitted = async (submitted: boolean) => {
    if (!getAccessToken() || markingSubmitted) return;
    setMarkingSubmitted(true);
    try {
      await apiFetch(`/api/my-services/${id}/visit${ctxQs}`, {
        method: 'POST',
        body: JSON.stringify({ step: submitted ? 'submitted' : 'checklist' }),
      });
      setCompletedToast(submitted ? '신청 완료로 표시했어요 ✓' : '진행 중으로 되돌렸어요');
      setTimeout(() => setCompletedToast(null), 2500);
    } catch (e) { console.error('완료 표시 실패:', e); }
    finally { setMarkingSubmitted(false); }
  };

  const [isSubmitted, setIsSubmitted] = useState(false);
  useEffect(() => {
    // 현재 last_step 확인
    if (!id || !getAccessToken()) return;
    apiFetch(`/api/my-services${ctxQs}`).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.services) {
        const me = d.services.find((s: any) => Number(s.id) === Number(id));
        setIsSubmitted(me?.last_step === 'submitted');
      }
    }).catch(() => {});
  }, [id, completedToast]);

  const [ttsLoadingId, setTtsLoadingId] = useState<number | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const handleSpeak = async (s: any) => {
    const text = `${s.title}. ${s.description ?? ''}`.trim();
    if (!text) return;
    try {
      setTtsLoadingId(s.id);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'nova' })
      });
      if (!res.ok) throw new Error(`tts ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e) {
      console.error('TTS 실패:', e);
      alert(lang === 'en' ? "Couldn't play audio. Try again in a moment." : '음성 재생에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setTtsLoadingId(null);
    }
  };

  const t = useTranslations<ProcedureStrings>('procedure', PROC_STRINGS as unknown as { ko: ProcedureStrings; en: ProcedureStrings }, lang);

  // 고대비 모드 — 토큰을 덮어쓸 인라인 클래스
  const pageBg = isHighContrast ? 'bg-black' : 'bg-surface-page';
  const cardCls = isHighContrast ? 'rounded-2xl bg-zinc-900 border border-yellow-400' : 'ui-card';
  const cardDoneCls = isHighContrast ? 'rounded-2xl bg-zinc-900 border border-yellow-300' : 'rounded-2xl bg-success/5 border border-emerald-200 ' + 'shadow-[0_2px_8px_rgba(15,23,42,0.05)]';
  const titleColor = isHighContrast ? 'text-white' : 'text-ink-1';
  const descColor = isHighContrast ? 'text-zinc-300' : 'text-ink-2';
  const subtleColor = isHighContrast ? 'text-zinc-400' : 'text-ink-3';
  const metaColor = isHighContrast ? 'text-zinc-400' : 'text-ink-4';
  const progressBg = isHighContrast ? 'bg-zinc-700' : 'bg-line-soft';
  const progressFill = isHighContrast ? 'bg-yellow-400' : 'bg-brand-600';
  const ttsBtn = isHighContrast
    ? 'bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700'
    : 'bg-surface-muted border border-line-base text-ink-2 hover:bg-line-soft';
  const linkBtn = isHighContrast
    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
    : 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_4px_12px_rgba(37,99,235,0.18)]';
  const docsBtn = isHighContrast
    ? 'bg-zinc-900 border-yellow-400 text-yellow-400 hover:bg-zinc-800'
    : 'bg-brand-50 border border-brand-100 text-brand-700 hover:bg-brand-100/60';
  const checkboxOn = isHighContrast ? 'bg-yellow-400 border-yellow-400' : 'bg-emerald-500 border-emerald-500';
  const checkboxOff = isHighContrast ? 'bg-transparent border-zinc-500' : 'bg-surface border-line-strong';

  const sizeBody = isLargeFont ? 'text-base sm:text-lg' : 'text-sm sm:text-base';
  const sizeStepTitle = isLargeFont ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl';
  const sizeBtn = isLargeFont ? 'text-lg' : 'text-base';

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${pageBg}`}>
        <div className="flex flex-col items-center gap-3">
          <div className={`w-8 h-8 border-[3px] ${progressBg} border-t-brand-500 rounded-full animate-spin`} />
          <p className={subtleColor}>{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="mx-auto max-w-md sm:max-w-2xl px-5 sm:px-8 pt-4 pb-28">
        <header className="pt-2 flex items-center justify-between gap-2 ui-enter">
          <button
            onClick={() => router.back()}
            className={`inline-flex items-center justify-center w-11 h-11 -ml-2 rounded-full transition-colors hover:bg-black/5 ${titleColor}`}
            aria-label={t.back}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <TopSettings
            lang={lang} setLang={setLang}
            isHighContrast={isHighContrast} setIsHighContrast={setIsHighContrast}
            isLargeFont={isLargeFont} setIsLargeFont={setIsLargeFont} t={t}
          />
        </header>

        <div className="mt-5 ui-enter flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {(info.ministry || info.department) && (
              <p className={`ui-section-label ${metaColor}`}>
                {info.ministry || info.department}
              </p>
            )}
            {/* 제목: 원문 한국어 + (영어 사용자에겐) 작게 번역 병기 */}
            <h1 className={`mt-2 ui-page-title ${titleColor}`}>
              {serviceName.ko}
            </h1>
            {lang !== 'ko' && tr?.name && tr.name !== serviceName.ko && (
              <p className={`mt-1 text-base italic ${subtleColor}`}>{tr.name}</p>
            )}
          </div>
          <div className="shrink-0 mt-2">
            <FavoriteButton serviceId={id} initial={isFavorited} size="lg" />
          </div>
        </div>

        {/* 공식 안내 페이지 — '한눈에 보기' 제거 후에도 링크 진입은 유지 */}
        {(() => {
          const officialUrl = normalizeOfficialLink(info.official_link);
          if (!officialUrl) return null;
          return (
            <div className="mt-4 ui-enter">
              <button
                onClick={() => window.open(officialUrl, '_blank', 'noopener,noreferrer')}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold transition-colors ${docsBtn} ${sizeBody}`}
              >
                <ScrollText className="w-4 h-4" />
                {lang === 'en' ? 'Official page' : '공식 안내 페이지'}
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>
          );
        })()}

        {/* 자세한 안내 */}
        {(llmDetail || llmDetailLoading) && (
          <div className={`mt-4 p-5 sm:p-6 ${cardCls} ui-enter`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex w-8 h-8 rounded-xl ${isHighContrast ? 'bg-zinc-800 text-yellow-400' : 'bg-brand-50 text-brand-600'} items-center justify-center`}>
                <Info className="w-4 h-4" />
              </span>
              <h2 className={`font-bold ${titleColor} ${sizeStepTitle}`}>
                {lang === 'en' ? 'Detailed guide' : '민원 자세히 보기'}
              </h2>
            </div>
            {llmDetailLoading && !llmDetail ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-line-base border-t-brand-500 rounded-full animate-spin" />
                <span className={subtleColor}>{lang === 'en' ? 'Loading detailed guide...' : '자세한 안내를 불러오는 중...'}</span>
              </div>
            ) : (
              <RichTextRenderer text={llmDetail} isHighContrast={isHighContrast} isLargeFont={isLargeFont} />
            )}
          </div>
        )}

        {/* 진행률 — 트랙별 분리 표시 */}
        <div className={`mt-4 p-5 ${cardCls} ui-enter`}>
          <div className="flex items-center justify-between">
            <span className={`font-bold ${titleColor} ${sizeBody}`}>{t.progress}</span>
            {!showSplit && (
              <span className={`font-semibold tabular-nums ${metaColor} ${sizeBody}`}>
                {commonDone + offlineDone + onlineDone}<span className="mx-0.5">/</span>{step.length}
              </span>
            )}
          </div>

          {showSplit ? (
            <div className="mt-3 flex flex-col gap-3">
              {/* 오프라인 트랙 */}
              <div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${descColor}`}>
                    <Building2 className="w-4 h-4 opacity-70" />
                    {lang === 'en' ? 'Offline' : '오프라인 신청'}
                  </span>
                  <span className={`text-xs font-semibold tabular-nums ${metaColor}`}>
                    {offlineTrackDone}/{offlineTotal}
                  </span>
                </div>
                <div className={`mt-1.5 w-full h-2 rounded-full overflow-hidden ${progressBg}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressFill}`}
                    style={{ width: `${offlinePct}%` }}
                  />
                </div>
              </div>
              {/* 온라인 트랙 */}
              <div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${descColor}`}>
                    <ExternalLink className="w-4 h-4 opacity-70" />
                    {lang === 'en' ? 'Online' : '온라인 신청'}
                  </span>
                  <span className={`text-xs font-semibold tabular-nums ${metaColor}`}>
                    {onlineTrackDone}/{onlineTotal}
                  </span>
                </div>
                <div className={`mt-1.5 w-full h-2 rounded-full overflow-hidden ${progressBg}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressFill}`}
                    style={{ width: `${onlinePct}%` }}
                  />
                </div>
              </div>
              <p className={`mt-1 text-xs ${metaColor}`}>
                {lang === 'en'
                  ? 'Common steps count toward both tracks'
                  : '공통 단계(신청 자격 확인)는 두 트랙 모두에 반영돼요'}
              </p>
            </div>
          ) : (
            <div className={`mt-3 w-full h-2.5 rounded-full overflow-hidden ${progressBg}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressFill}`}
                style={{ width: `${step.length > 0 ? ((commonDone + offlineDone + onlineDone) / step.length) * 100 : 0}%` }}
              />
            </div>
          )}

          <button
            onClick={() => router.push(`/list/document/${id}`)}
            className={`mt-4 w-full inline-flex items-center justify-between gap-2 px-4 py-3.5 rounded-2xl font-semibold transition-colors ${docsBtn} ${sizeBody}`}
          >
            <span className="inline-flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t.docs}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 체크리스트 단계 — 트랙별 그룹화 */}
        {(() => {
          const renderStepCard = (s: any, displayNum: number) => (
            <div
              key={s.id}
              className={`relative ${s.isCompleted ? cardDoneCls : cardCls} transition-all`}
            >
              <div className={`absolute -top-3 -left-2 w-10 h-10 flex items-center justify-center rounded-2xl font-bold ${
                s.isCompleted
                  ? (isHighContrast ? 'bg-yellow-400 text-black' : 'bg-emerald-500 text-white')
                  : (isHighContrast ? 'bg-zinc-800 text-yellow-400 border border-yellow-400' : 'bg-brand-600 text-white')
              } shadow-[0_4px_12px_rgba(37,99,235,0.18)]`}>
                {displayNum}
              </div>
              <div className="p-5 pt-7">
                <h2 className={`font-bold ${titleColor} ${sizeStepTitle}`}>{tStepTitle(s.title, lang)}</h2>
                {s.description && (
                  <p className={`mt-1.5 leading-relaxed ${descColor} ${sizeBody}`}>{s.description}</p>
                )}
                <div className="mt-5 flex flex-col sm:flex-row gap-2">
                  {s.link && (
                    <button
                      onClick={() => {
                        const url = s.link.startsWith('http') ? s.link : `https://${s.link}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      className={`flex-1 py-3 rounded-2xl font-semibold transition-colors flex items-center justify-center gap-1.5 ${linkBtn} ${sizeBtn}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t.web}
                    </button>
                  )}
                  <button
                    onClick={() => handleSpeak(s)}
                    disabled={ttsLoadingId === s.id}
                    className={`flex-1 py-3 rounded-2xl font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 ${ttsBtn} ${sizeBtn}`}
                  >
                    <Volume2 className="w-4 h-4" />
                    {ttsLoadingId === s.id ? t.voicePlaying : t.voice}
                  </button>
                </div>
                <button
                  onClick={() => Complete(s.id)}
                  className={`mt-5 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold transition-all active:scale-[0.98] ${
                    s.isCompleted
                      ? (isHighContrast
                          ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.25)]')
                      : (isHighContrast
                          ? 'bg-zinc-800 text-yellow-400 border-2 border-yellow-400 border-dashed hover:bg-zinc-700'
                          : 'bg-emerald-50 text-emerald-700 border-2 border-emerald-300 border-dashed hover:bg-emerald-100')
                  }`}
                  aria-pressed={s.isCompleted}
                >
                  <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full ${
                    s.isCompleted
                      ? (isHighContrast ? 'bg-black/20' : 'bg-white/25')
                      : (isHighContrast ? 'bg-yellow-400/10 border border-yellow-400/50' : 'bg-white border-2 border-emerald-400')
                  }`}>
                    {s.isCompleted && <Check className="w-4 h-4" strokeWidth={3} />}
                  </span>
                  {s.isCompleted
                    ? (lang === 'en' ? 'Done ✓' : '완료했어요')
                    : (lang === 'en' ? 'Mark as done' : '이 단계 완료로 표시')}
                </button>
              </div>
            </div>
          );

          const TrackHeader = ({ Icon, label }: { Icon: any; label: string }) => (
            <div className="flex items-center gap-2 mt-7 mb-1">
              <span className={`inline-flex w-7 h-7 rounded-xl items-center justify-center ${isHighContrast ? 'bg-zinc-800 text-yellow-400' : 'bg-brand-50 text-brand-600'}`}>
                <Icon className="w-4 h-4" />
              </span>
              <h3 className={`font-bold ${titleColor} ${sizeBody}`}>{label}</h3>
            </div>
          );

          return (
            <div className="mt-6 flex flex-col gap-4">
              {/* 공통 단계 (자격 확인) — 항상 먼저 */}
              {commonSteps.map((s: any, idx: number) => renderStepCard(s, idx + 1))}

              {showSplit ? (
                <>
                  {/* 오프라인 트랙 */}
                  {offlineSteps.length > 0 && (
                    <>
                      <TrackHeader Icon={Building2} label={lang === 'en' ? 'Offline application' : '오프라인으로 신청'} />
                      {offlineSteps.map((s: any, idx: number) => renderStepCard(s, commonSteps.length + idx + 1))}
                    </>
                  )}
                  {/* 온라인 트랙 */}
                  {onlineSteps.length > 0 && (
                    <>
                      <TrackHeader Icon={ExternalLink} label={lang === 'en' ? 'Online application' : '온라인으로 신청'} />
                      {onlineSteps.map((s: any, idx: number) => renderStepCard(s, commonSteps.length + idx + 1))}
                    </>
                  )}
                </>
              ) : (
                <>
                  {offlineSteps.map((s: any, idx: number) => renderStepCard(s, commonSteps.length + idx + 1))}
                  {onlineSteps.map((s: any, idx: number) => renderStepCard(s, commonSteps.length + idx + 1))}
                </>
              )}
            </div>
          );
        })()}

        {/* 신청 완료 표시 — 수동 토글 */}
        {step.length > 0 && getAccessToken() && (
          <div className="mt-8">
            {isSubmitted ? (
              // === 완료 후 축하 카드 ===
              <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 text-center ui-enter ${
                isHighContrast
                  ? 'bg-zinc-900 border-2 border-yellow-400'
                  : 'bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 border-2 border-emerald-200'
              }`}>
                {/* 배경 장식 */}
                {!isHighContrast && (
                  <>
                    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-300/30 blur-2xl" aria-hidden />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-teal-300/30 blur-2xl" aria-hidden />
                  </>
                )}
                <div className="relative">
                  <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center text-5xl ${
                    isHighContrast ? 'bg-yellow-400' : 'bg-white shadow-[0_8px_24px_rgba(16,185,129,0.30)]'
                  }`} aria-hidden>
                    🎉
                  </div>
                  <h2 className={`mt-5 text-2xl sm:text-[28px] font-bold tracking-tight ${
                    isHighContrast ? 'text-yellow-300' : 'text-emerald-700'
                  }`}>
                    {lang === 'en' ? 'All done! Congratulations 🎊' : '축하해요! 신청을 완료하셨어요'}
                  </h2>
                  <p className={`mt-2 text-base ${
                    isHighContrast ? 'text-zinc-300' : 'text-emerald-800/80'
                  }`}>
                    {lang === 'en'
                      ? 'Your civil service application is marked complete. You can see it in My Services.'
                      : '내 민원 대시보드에 완료된 민원으로 표시돼요.\n수고 많으셨어요!'}
                  </p>
                  <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="ui-btn-primary px-6"
                    >
                      {lang === 'en' ? 'Go to My Services' : '내 민원으로 가기'}
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => markSubmitted(false)}
                      disabled={markingSubmitted}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-ink-3 hover:text-ink-1 transition-colors disabled:opacity-50"
                    >
                      {lang === 'en' ? 'Mark as in progress' : '진행 중으로 되돌리기'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // === 미완료 — 큰 명확한 CTA ===
              <div className={`p-5 sm:p-6 rounded-3xl ${
                isHighContrast ? 'bg-zinc-900 border border-zinc-700' : 'bg-emerald-50/60 border border-emerald-100'
              }`}>
                <p className={`text-sm font-semibold ${
                  isHighContrast ? 'text-zinc-300' : 'text-emerald-800/80'
                } mb-2 inline-flex items-center gap-1.5`}>
                  <span aria-hidden>✅</span>
                  {lang === 'en' ? 'Finished applying?' : '신청을 모두 마치셨나요?'}
                </p>
                <p className={`text-base ${
                  isHighContrast ? 'text-white' : 'text-ink-2'
                } mb-4`}>
                  {lang === 'en'
                    ? 'Mark this as complete to track it as done in My Services.'
                    : '완료로 표시하면 내 민원에서 "완료" 상태로 확인할 수 있어요.'}
                </p>
                <button
                  onClick={() => markSubmitted(true)}
                  disabled={markingSubmitted}
                  className={`w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl text-lg font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
                    isHighContrast
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_8px_20px_rgba(16,185,129,0.30)]'
                  }`}
                >
                  <Check className="w-5 h-5" strokeWidth={3} />
                  {markingSubmitted
                    ? (lang === 'en' ? 'Saving...' : '저장 중...')
                    : (lang === 'en' ? 'Mark application as complete' : '신청 완료로 표시하기')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />

      {/* 완료 토스트 */}
      {completedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-ink-1 text-white text-sm font-medium shadow-lg ui-enter pointer-events-none max-w-[90%] text-center">
          {completedToast}
        </div>
      )}
    </div>
  )
}

export default function ProcedurePage() {
  return (
    <Suspense fallback={null}>
      <ProcedureScreen />
    </Suspense>
  );
}
