"use client"

import { ChevronRight, FileText, ClipboardCheck, CheckCircle2, FilePlus2, Building2, Coins, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api-client";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";
import { getCategoryMeta } from "@/lib/category";

type Step = 'description' | 'required_docs' | 'checklist' | 'submitted';

type MyService = {
  id: number;
  name: string;
  official_name?: string | null;
  ministry?: string | null;
  department?: string | null;
  fee?: string | null;
  eligibility?: string | null;
  last_step: Step;
  completed_count: number;
  started_at: string;
  updated_at: string;
};

const STEP_META: Record<Step, { label: string; chip: string; Icon: React.ComponentType<{ className?: string }> }> = {
  description:   { label: '둘러보는 중',       chip: 'ui-chip-neutral', Icon: FilePlus2 },
  required_docs: { label: '준비물 확인 중',     chip: 'ui-chip-warning', Icon: FileText },
  checklist:     { label: '체크리스트 진행 중', chip: 'ui-chip',         Icon: ClipboardCheck },
  submitted:     { label: '신청 완료',         chip: 'ui-chip-success', Icon: CheckCircle2 },
};

const NEXT_STEP_HINT: Record<Step, { label: string; cta: string }> = {
  description:   { label: '준비물 확인하기',     cta: '서류 보기 →' },
  required_docs: { label: '서류 챙기고 체크리스트로', cta: '이어서 진행 →' },
  checklist:     { label: '체크리스트 마저 하기', cta: '이어서 진행 →' },
  submitted:     { label: '신청 완료 ✓',          cta: '결과 보기 →' },
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

function getGreeting(name?: string | null): { hi: string; sub: string } {
  const h = new Date().getHours();
  const part = h < 6 ? '늦은 밤' : h < 12 ? '좋은 아침' : h < 18 ? '좋은 오후' : '좋은 저녁';
  return {
    hi: name ? `${part}이에요, ${name}님` : `${part}이에요`,
    sub: '오늘도 차분히 한 단계씩 나아가 봐요',
  };
}

const DashboardScreen: React.FC = () => {
  const router = useRouter();
  const [services, setServices] = useState<MyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/user/login?return=/dashboard');
      return;
    }
    (async () => {
      try {
        const [meRes, svcRes] = await Promise.all([
          apiFetch('/api/users/me'),
          apiFetch('/api/my-services'),
        ]);
        if (svcRes.status === 401) {
          router.replace('/user/login?return=/dashboard');
          return;
        }
        if (meRes.ok) {
          const md = await meRes.json();
          setUserName(md?.user?.name ?? null);
        }
        const data = await svcRes.json();
        setServices(data.services ?? []);
      } catch (err) {
        console.error('내 민원 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const goToService = (svc: MyService) => {
    const path = svc.last_step === 'required_docs'
      ? `/list/document/${svc.id}`
      : `/list/procedure/${svc.id}`;
    router.push(path);
  };

  const inProgress = services.filter(s => s.last_step !== 'submitted').length;
  const submitted = services.filter(s => s.last_step === 'submitted').length;

  // "다음 할 일" — 가장 최근 활동한 미완료 민원
  const nextItem = [...services]
    .filter(s => s.last_step !== 'submitted')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

  const greeting = getGreeting(userName);

  return (
    <div className="min-h-screen bg-surface-page pb-28">
      <div className="mx-auto max-w-md sm:max-w-2xl px-5 sm:px-8">
        <PageHeader
          showBack
          title={greeting.hi}
          subtitle={greeting.sub}
        />

        {loading ? (
          <DashboardSkeleton />
        ) : services.length === 0 ? (
          <div className="mt-10 ui-card p-8 text-center ui-enter">
            <div className="mx-auto w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
              <FilePlus2 className="w-8 h-8 text-brand-600" />
            </div>
            <p className="mt-5 text-lg font-semibold text-ink-1">아직 진행 중인 민원이 없어요</p>
            <p className="mt-1.5 text-sm text-ink-3">민원 목록에서 원하는 민원을 시작해보세요</p>
            <button
              onClick={() => router.push('/recommend')}
              className="ui-btn-primary w-full mt-6"
            >
              민원 찾아보기
            </button>
          </div>
        ) : (
          <>
            {/* 다음 할 일 — 가장 임박한 미완료 민원 */}
            {nextItem && (() => {
              const cat = getCategoryMeta({ name: nextItem.name, ministry: nextItem.ministry, department: nextItem.department });
              const hint = NEXT_STEP_HINT[nextItem.last_step];
              return (
                <button
                  onClick={() => goToService(nextItem)}
                  className="mt-5 w-full text-left ui-enter ui-card-interactive overflow-hidden active:scale-[0.99] transition-transform"
                  style={{ animationDelay: '40ms' }}
                >
                  <div className="flex items-stretch">
                    <div className={`w-1.5 ${cat.bar}`} />
                    <div className="flex-1 p-5 sm:p-6">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-600" />
                        <span className="ui-section-label text-brand-700">이어서 진행하기</span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className={`shrink-0 w-12 h-12 rounded-2xl ${cat.bg} flex items-center justify-center text-2xl`}>
                          {cat.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-base sm:text-lg font-bold text-ink-1 truncate">{nextItem.name}</h2>
                          <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-semibold ${cat.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cat.bar}`} />
                            {cat.label}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink-2">
                          다음: <span className="text-ink-1">{hint.label}</span>
                        </p>
                        <span className="text-sm font-semibold text-brand-600 inline-flex items-center gap-0.5">
                          {hint.cta}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })()}

            {/* 요약 통계 */}
            <div className="mt-4 grid grid-cols-2 gap-3 ui-enter" style={{ animationDelay: '80ms' }}>
              <div className="ui-card p-4">
                <p className="ui-section-label">진행 중</p>
                <p className="mt-1.5 text-2xl font-bold text-ink-1 tabular-nums">{inProgress}<span className="text-base font-medium text-ink-3 ml-1">건</span></p>
              </div>
              <div className="ui-card p-4">
                <p className="ui-section-label">완료</p>
                <p className="mt-1.5 text-2xl font-bold text-ink-1 tabular-nums">{submitted}<span className="text-base font-medium text-ink-3 ml-1">건</span></p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {services.map((svc, idx) => {
                const meta = STEP_META[svc.last_step];
                const Icon = meta.Icon;
                const cat = getCategoryMeta({ name: svc.name, ministry: svc.ministry, department: svc.department });
                const subtitle = svc.official_name && svc.official_name !== svc.name ? svc.official_name : null;
                return (
                  <button
                    key={svc.id}
                    onClick={() => goToService(svc)}
                    className="ui-card-interactive w-full text-left flex items-stretch group overflow-hidden active:scale-[0.99] transition-transform ui-enter"
                    style={{ animationDelay: `${120 + idx * 50}ms` }}
                  >
                    <div className={`w-1.5 ${cat.bar} shrink-0`} />
                    <div className="flex-1 p-5 flex items-start gap-4">
                      <div className={`shrink-0 w-11 h-11 rounded-2xl ${cat.bg} flex items-center justify-center mt-0.5`}>
                        <Icon className={`w-5 h-5 ${cat.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={meta.chip}>{meta.label}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cat.bg} ${cat.text}`}>
                            {cat.label}
                          </span>
                          {svc.completed_count > 0 && (
                            <span className="text-xs text-ink-4">체크 {svc.completed_count}개</span>
                          )}
                        </div>
                        <h2 className="mt-2 text-base sm:text-lg font-bold text-ink-1 truncate">{svc.name}</h2>
                        {subtitle && <p className="mt-0.5 text-xs text-ink-4 truncate">{subtitle}</p>}
                        {svc.eligibility && (
                          <p className="mt-2 text-sm text-ink-3 line-clamp-2 leading-relaxed">{svc.eligibility}</p>
                        )}
                        {(svc.ministry || svc.department || svc.fee) && (
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
                            {(svc.ministry || svc.department) && (
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-ink-4" />
                                {svc.ministry || svc.department}
                              </span>
                            )}
                            {svc.fee && (
                              <span className="inline-flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5 text-ink-4" />
                                {svc.fee}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="mt-2 text-xs text-ink-4">{timeAgo(svc.updated_at)} 활동</p>
                      </div>
                      <ChevronRight className="shrink-0 w-5 h-5 text-ink-4 mt-3 group-hover:text-ink-2 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

/** 대시보드 스켈레톤 로더 */
function DashboardSkeleton() {
  return (
    <div className="mt-5 flex flex-col gap-3" aria-busy>
      {/* 다음 할 일 스켈 */}
      <div className="ui-card overflow-hidden">
        <div className="flex">
          <div className="w-1.5 bg-line-base" />
          <div className="flex-1 p-5">
            <div className="h-3 w-20 rounded bg-line-base/80 animate-pulse" />
            <div className="mt-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-line-base/80 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-3/4 rounded bg-line-base/80 animate-pulse" />
                <div className="mt-2 h-3 w-1/3 rounded bg-line-base/70 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 통계 스켈 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="ui-card p-4">
          <div className="h-3 w-12 rounded bg-line-base/70 animate-pulse" />
          <div className="mt-2 h-7 w-10 rounded bg-line-base/80 animate-pulse" />
        </div>
        <div className="ui-card p-4">
          <div className="h-3 w-12 rounded bg-line-base/70 animate-pulse" />
          <div className="mt-2 h-7 w-10 rounded bg-line-base/80 animate-pulse" />
        </div>
      </div>
      {/* 서비스 카드 스켈 ×2 */}
      {[0, 1].map(i => (
        <div key={i} className="ui-card overflow-hidden">
          <div className="flex">
            <div className="w-1.5 bg-line-base" />
            <div className="flex-1 p-5 flex gap-4">
              <div className="w-11 h-11 rounded-2xl bg-line-base/80 animate-pulse" />
              <div className="flex-1">
                <div className="h-3 w-16 rounded bg-line-base/70 animate-pulse" />
                <div className="mt-3 h-4 w-3/4 rounded bg-line-base/80 animate-pulse" />
                <div className="mt-2 h-3 w-2/3 rounded bg-line-base/70 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default DashboardScreen;
