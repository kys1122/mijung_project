"use client"

import { ChevronLeft, ChevronRight, FileText, ClipboardCheck, CheckCircle2, FilePlus2, Building2, Coins } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api-client";
import BottomNav from "../components/BottomNav";

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

const STEP_META: Record<Step, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  description:   { label: '둘러보는 중', color: 'bg-slate-100 text-slate-700',  Icon: FilePlus2 },
  required_docs: { label: '준비물 확인 중', color: 'bg-amber-100 text-amber-800',  Icon: FileText },
  checklist:     { label: '체크리스트 진행 중', color: 'bg-blue-100 text-blue-700',  Icon: ClipboardCheck },
  submitted:     { label: '신청 완료', color: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
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
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      // 비로그인 — 로그인 페이지로 자동 이동
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-md sm:max-w-2xl md:max-w-3xl px-5 sm:px-8 pb-24">
        <header className="pt-6 flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="-ml-2 p-2 rounded-full hover:bg-slate-200/60 transition-colors"
            aria-label="뒤로"
          >
            <ChevronLeft className="w-6 h-6 text-slate-700" />
          </button>
          <span className="text-sm text-slate-600">뒤로</span>
        </header>

        <div className="mt-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">내 민원</h1>
          <p className="mt-1 text-sm text-slate-600">진행 중인 민원을 이어서 확인하세요</p>
        </div>

        {loading ? (
          <div className="mt-12 flex flex-col items-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : unauthorized ? (
          <div className="mt-16 rounded-2xl bg-white border border-slate-200/70 shadow-sm p-8 text-center">
            <p className="text-base text-slate-700">로그인이 필요합니다</p>
            <p className="mt-1 text-sm text-slate-500">진행 중인 민원을 보려면 먼저 로그인해주세요</p>
            <button
              onClick={() => router.push('/user/login')}
              className="mt-5 w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors rounded-xl text-white font-semibold"
            >
              로그인하기
            </button>
          </div>
        ) : services.length === 0 ? (
          <div className="mt-16 rounded-2xl bg-white border border-slate-200/70 shadow-sm p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <FilePlus2 className="w-7 h-7 text-slate-500" />
            </div>
            <p className="mt-4 text-base text-slate-700">아직 진행 중인 민원이 없어요</p>
            <p className="mt-1 text-sm text-slate-500">민원 목록에서 원하는 민원을 시작해보세요</p>
            <button
              onClick={() => router.push('/list')}
              className="mt-5 w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors rounded-xl text-white font-semibold"
            >
              민원 찾아보기
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((svc) => {
              const meta = STEP_META[svc.last_step];
              const Icon = meta.Icon;
              const subtitle = svc.official_name && svc.official_name !== svc.name ? svc.official_name : null;
              return (
                <button
                  key={svc.id}
                  onClick={() => goToService(svc)}
                  className="group w-full rounded-2xl bg-white border border-slate-200/70 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{meta.label}</span>
                      </div>
                      <h2 className="mt-3 text-lg font-semibold text-slate-900 truncate">{svc.name}</h2>
                      {subtitle && <p className="mt-0.5 text-xs text-slate-600 truncate">{subtitle}</p>}
                      {svc.eligibility && (
                        <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">{svc.eligibility}</p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        {(svc.ministry || svc.department) && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {svc.ministry || svc.department}
                          </span>
                        )}
                        {svc.fee && (
                          <span className="inline-flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />
                            {svc.fee}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <span>{timeAgo(svc.updated_at)}</span>
                        {svc.completed_count > 0 && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span>체크 {svc.completed_count}개 완료</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="shrink-0 w-5 h-5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
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
