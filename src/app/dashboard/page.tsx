"use client"

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api-client";

type MyService = {
  id: number;
  name: string;
  last_step: 'description' | 'required_docs' | 'checklist' | 'submitted';
  completed_count: number;
  started_at: string;
  updated_at: string;
};

const STEP_LABEL: Record<MyService['last_step'], string> = {
  description: '민원 살펴보는 중',
  required_docs: '준비물 확인 중',
  checklist: '체크리스트 진행 중',
  submitted: '신청 완료',
};

const DashboardScreen: React.FC = () => {
  const router = useRouter();
  const [services, setServices] = useState<MyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await apiFetch('/api/my-services');
        if (res.status === 401) { setUnauthorized(true); return; }
        const data = await res.json();
        setServices(data.services ?? []);
      } catch (err) {
        console.error('내 민원 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goToService = (svc: MyService) => {
    const path = svc.last_step === 'required_docs'
      ? `/list/document/${svc.id}`
      : `/list/procedure/${svc.id}`;
    router.push(path);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">불러오는 중...</div>;
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-black gap-4">
        <p className="text-[22px]">로그인이 필요합니다.</p>
        <button
          onClick={() => router.push('/user/login')}
          className="px-6 py-2 bg-[#009DFF] rounded-[15px] text-white text-[22px] font-bold"
        >
          로그인하러 가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-white text-black">
      <div className="w-full max-w-[450px]">
        <header className="relative py-4 border-b-2 border-[#C9C9C9]">
          <button onClick={() => router.back()} className="flex items-center gap-1">
            <ChevronLeft className="w-8 h-8" />
            <span className="text-[22px]">뒤로</span>
          </button>
        </header>

        <h1 className="pt-[15px] px-2 text-[33px] font-bold">내가 신청 중인 민원</h1>

        {services.length === 0 ? (
          <div className="mt-12 px-4 text-center text-[20px] text-[#666]">
            아직 진행 중인 민원이 없습니다.
            <br />
            민원 목록에서 원하는 민원을 시작해보세요.
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4 mt-6">
            {services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => goToService(svc)}
                className="flex items-center justify-between p-4 border-2 border-[#C9C9C9] rounded-[15px] bg-white hover:bg-[#F4F8FF] text-left"
              >
                <div className="flex flex-col">
                  <span className="text-[26px] font-bold">{svc.name}</span>
                  <span className="mt-1 text-[18px] text-[#005EFF] font-medium">
                    {STEP_LABEL[svc.last_step]}
                  </span>
                  {svc.completed_count > 0 && (
                    <span className="mt-1 text-[16px] text-[#666]">
                      체크 {svc.completed_count}개 완료
                    </span>
                  )}
                </div>
                <ChevronRight className="w-7 h-7 text-[#999]" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardScreen;
