"use client"

import { ChevronRight, FileText, ClipboardCheck, CheckCircle2, FilePlus2, Building2, Coins } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api-client";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";

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

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

const DashboardScreen: React.FC = () => {
  const router = useRouter();
  const [services, setServices] = useState<MyService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/user/login?return=/dashboard');
      return;
    }
    (async () => {
      try {
        const res = await apiFetch('/api/my-services');
        if (res.status === 401) {
          router.replace('/user/login?return=/dashboard');
          return;
        }
        const data = await res.json();
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

  return (
    <div className="min-h-screen bg-surface-page pb-28">
      <div className="mx-auto max-w-md sm:max-w-2xl px-5 sm:px-8">
        <PageHeader
          showBack
          title="내 민원"
          subtitle="진행 중인 민원을 이어서 확인하세요"
        />

        {/* 요약 통계 */}
        {!loading && services.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 ui-enter">
            <div className="ui-card p-4">
              <p className="ui-section-label">진행 중</p>
              <p className="mt-1.5 text-2xl font-bold text-ink-1 tabular-nums">{inProgress}<span className="text-base font-medium text-ink-3 ml-1">건</span></p>
            </div>
            <div className="ui-card p-4">
              <p className="ui-section-label">완료</p>
              <p className="mt-1.5 text-2xl font-bold text-ink-1 tabular-nums">{submitted}<span className="text-base font-medium text-ink-3 ml-1">건</span></p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-ink-3">
            <div className="w-8 h-8 border-[3px] border-line-base border-t-brand-500 rounded-full animate-spin" />
            <p className="text-sm">불러오는 중...</p>
          </div>
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
          <div className="mt-6 flex flex-col gap-3 ui-enter">
            {services.map((svc) => {
              const meta = STEP_META[svc.last_step];
              const Icon = meta.Icon;
              const subtitle = svc.official_name && svc.official_name !== svc.name ? svc.official_name : null;
              return (
                <button
                  key={svc.id}
                  onClick={() => goToService(svc)}
                  className="ui-card-interactive w-full p-5 text-left flex items-start gap-4 group"
                >
                  <div className="shrink-0 w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center mt-0.5">
                    <Icon className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={meta.chip}>{meta.label}</span>
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
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default DashboardScreen;
