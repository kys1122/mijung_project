"use client"

import React from "react";
import { AlertCircle, Building2, FileText, X } from "lucide-react";

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

const DetailModal = ({ isOpen, onClose, data }: DetailModalProps) => {
  if (!isOpen || !data) return null;

  const detail = data.detail;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#2e2e2e]/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="p-5 relative w-full max-w-[400px] bg-white rounded-[10px]"
      >
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-[32px] font-bold text-black">{data.title}</h2>
          <button onClick={onClose}>
            <X className="w-8 h-8 text-black"/>
          </button>
        </div>
        <div className="p-5 bg-[#E9F1FF] rounded-[15px]">
          {detail ? (
            <>
              {(detail.online || detail.offline) && (
                <div className="mb-6">
                  <div className="flex items-center">
                    <Building2 className="w-7 h-7 text-black" />
                    <span className="ml-2 text-[26px] font-bold text-black">발급기관</span>
                  </div>
                  <div className="ml-1.5">
                    {detail.online && (
                      <div>
                        <p className="text-[22px] font-bold text-black">온라인</p>
                        <div className="flex items-center">
                          <span className="text-[20px] text-[#374151]">{detail.online.name}</span>
                          {detail.online.link && (
                            <a href={detail.online.link}
                            className="ml-1 text-[#0044FF] text-[18px]"
                            style={{textDecoration: 'underline', textUnderlineOffset: '4px'}}>
                              바로가기</a>
                          )}
                        </div>
                      </div>
                    )}
                    {detail.offline && (
                      <div>
                        <p className="text-[22px] font-bold text-black">오프라인</p>
                        <p className="text-[20px] text-[#374151]">{detail.offline}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detail.requirements && detail.requirements.length > 0 && (
                <div>
                  <div className="flex items-center">
                    <FileText className="w-7 h-7 text-black" />
                    <span className="ml-2 text-[26px] font-bold text-black">준비물</span>
                  </div>
                  <div className="ml-1.5">
                    {detail.requirements.map((item: string, idx: number) => (
                      <p key={idx} className="text-[20px] text-[#374151]">{idx + 1}. {item}</p>
                    ))}
                    
                    {detail.warning && (
                      <div className="mt-2 p-3 bg-white border-2 border-[#FFD0D0] rounded-[10px]">
                        <div className="flex items-center text-[#FF0000]">
                          <AlertCircle className="w-5 h-5 fill-[#FF0000] text-white" />
                          <span className="ml-1. font-bold text-[18px]">주의사항</span>
                        </div>
                        <p className="p-1.5 text-[17px] text-[#374151] leading-tight">{detail.warning}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-10 text-center text-[#374151] text-[20px]">
              상세 정보가 등록되지 않았습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailModal;