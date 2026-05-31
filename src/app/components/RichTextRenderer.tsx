"use client"

import React from 'react';

// LLM 마크다운 텍스트(헤더/리스트/굵게)를 가독성 있게 렌더
export default function RichTextRenderer({
  text,
  isHighContrast = false,
  isLargeFont = false,
}: {
  text: string;
  isHighContrast?: boolean;
  isLargeFont?: boolean;
}) {
  const sizeRich = isLargeFont ? 'text-lg' : 'text-base';

  const renderInline = (txt: string, keyPrefix: string) => {
    const parts = txt.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, j) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={`${keyPrefix}-${j}`} className={isHighContrast ? 'text-yellow-400' : 'text-blue-700'}>{p.slice(2, -2)}</strong>
        : <span key={`${keyPrefix}-${j}`}>{p}</span>
    );
  };

  const lines = text.split('\n');
  return (
    <div className={sizeRich}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;

        const indentSpaces = (line.match(/^(\s*)/)?.[1] ?? '').replace(/\t/g, '  ').length;
        const indentLevel = Math.min(Math.floor(indentSpaces / 2), 3);
        const indentClass = ['pl-0', 'pl-5', 'pl-10', 'pl-14'][indentLevel];

        const trimmed = line.trim();
        // 마크다운 task 마커 [ ] / [x] 제거
        const cleaned = trimmed.replace(/^(\d+\.\s+|[-*•]\s+)?\[\s*[xX ]?\s*\]\s*/, '$1');

        // 헤더
        const hMatch = cleaned.match(/^(#{1,6})\s+(.*)$/);
        if (hMatch) {
          const level = hMatch[1].length;
          const cls = level <= 2
            ? `block mt-5 first:mt-0 pb-2 font-bold border-b ${isHighContrast ? 'border-yellow-400/40 text-yellow-400' : 'border-blue-200 text-blue-700'} ${isLargeFont ? 'text-2xl' : 'text-xl'}`
            : `block mt-4 first:mt-0 font-bold ${sizeRich} ${isHighContrast ? 'text-yellow-300' : 'text-slate-800'}`;
          return <div key={i} className={cls}>{renderInline(hMatch[2], `${i}h`)}</div>;
        }
        // 번호 리스트
        const numMatch = cleaned.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={i} className={`flex gap-2 mt-2 first:mt-0 ${indentClass}`}>
              <span className={`shrink-0 font-bold ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}>{numMatch[1]}.</span>
              <span className={`flex-1 ${isHighContrast ? 'text-zinc-200' : 'text-slate-700'}`}>{renderInline(numMatch[2], `${i}n`)}</span>
            </div>
          );
        }
        // 불릿
        if (/^[-*•]\s/.test(cleaned)) {
          return (
            <div key={i} className={`flex gap-2 mt-1.5 first:mt-0 ${indentClass}`}>
              <span className={`shrink-0 ${isHighContrast ? 'text-yellow-400' : 'text-blue-600'}`}>•</span>
              <span className={`flex-1 ${isHighContrast ? 'text-zinc-300' : 'text-slate-700'}`}>{renderInline(cleaned.replace(/^[-*•]\s+/, ''), `${i}l`)}</span>
            </div>
          );
        }
        // 일반 문단
        return (
          <div key={i} className={`mt-2 first:mt-0 ${indentClass} ${isHighContrast ? 'text-zinc-200' : 'text-slate-700'}`}>
            {renderInline(cleaned, `${i}p`)}
          </div>
        );
      })}
    </div>
  );
}
