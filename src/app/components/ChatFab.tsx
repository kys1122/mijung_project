'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

interface ChatFabProps {
  isHighContrast?: boolean;
  label?: string;
}

/**
 * 모든 화면 우하단에 띄우는 챗봇 진입 버튼.
 * /chat 페이지로 이동.
 */
export default function ChatFab({ isHighContrast = false, label = '챗봇' }: ChatFabProps) {
  const colorClass = isHighContrast
    ? 'bg-[#FDC700] text-black'
    : 'bg-[#009DFF] text-white';

  return (
    <Link
      href="/chat"
      aria-label={label}
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 h-14 rounded-full shadow-lg active:scale-95 transition-transform ${colorClass}`}
    >
      <MessageCircle className="w-6 h-6" />
      <span className="text-[18px] font-bold">{label}</span>
    </Link>
  );
}
