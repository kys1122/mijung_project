"use client"

import React from 'react';
import { ExternalLink } from 'lucide-react';

// LLM 마크다운 텍스트를 가독성+시각적 강조 있게 렌더
// - 헤더에 색 배경 박스
// - 번호 리스트는 동그란 배지
// - 마크다운 링크 [text](url) 자동 인식 → 외부 링크 버튼
// - URL/이메일도 자동 인식
// - **굵게** 부분에 색 하이라이트
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
  const accentBg = isHighContrast ? 'bg-zinc-800' : 'bg-blue-50';
  const accentText = isHighContrast ? 'text-yellow-400' : 'text-blue-700';
  const accentBorder = isHighContrast ? 'border-yellow-400/40' : 'border-blue-200';
  const bodyColor = isHighContrast ? 'text-zinc-200' : 'text-slate-700';
  const softColor = isHighContrast ? 'text-zinc-300' : 'text-slate-600';

  const renderInline = (txt: string, keyPrefix: string) => {
    // 1) 마크다운 링크 [text](url) → <a>
    // 2) bare URL → <a>
    // 3) **굵게** → <strong>
    const tokens: React.ReactNode[] = [];
    let tokenKey = 0;
    const remaining = txt;

    // 마크다운 링크 + URL + bold 한 번에 매치
    const combined = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+|www\.[^\s)]+|[a-z0-9.-]+\.go\.kr[^\s)]*)\))|(\*\*[^*]+\*\*)|((?:https?:\/\/|www\.)[^\s)]+)/gi;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = combined.exec(remaining)) !== null) {
      if (m.index > lastIdx) {
        tokens.push(<span key={`${keyPrefix}-t${tokenKey++}`}>{remaining.slice(lastIdx, m.index)}</span>);
      }
      if (m[1]) {
        // 마크다운 링크
        const label = m[2];
        const url = m[3].startsWith('http') ? m[3] : `https://${m[3]}`;
        tokens.push(
          <a
            key={`${keyPrefix}-l${tokenKey++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-0.5 font-semibold underline underline-offset-2 ${accentText} hover:opacity-80`}
          >
            {label}
            <ExternalLink className="w-3 h-3" />
          </a>
        );
      } else if (m[4]) {
        // **굵게**
        tokens.push(
          <strong
            key={`${keyPrefix}-b${tokenKey++}`}
            className={`px-1 rounded ${isHighContrast ? 'bg-yellow-400/20 text-yellow-300' : 'bg-blue-100/70 text-blue-800'}`}
          >
            {m[4].slice(2, -2)}
          </strong>
        );
      } else if (m[5]) {
        // bare URL
        const url = m[5].startsWith('http') ? m[5] : `https://${m[5]}`;
        tokens.push(
          <a
            key={`${keyPrefix}-u${tokenKey++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-0.5 font-medium underline underline-offset-2 ${accentText} hover:opacity-80 break-all`}
          >
            {m[5]}
            <ExternalLink className="w-3 h-3" />
          </a>
        );
      }
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < remaining.length) {
      tokens.push(<span key={`${keyPrefix}-t${tokenKey++}`}>{remaining.slice(lastIdx)}</span>);
    }
    return tokens.length > 0 ? tokens : <span key={`${keyPrefix}-e`}>{remaining}</span>;
  };

  const lines = text.split('\n');
  return (
    <div className={sizeRich}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;

        const indentSpaces = (line.match(/^(\s*)/)?.[1] ?? '').replace(/\t/g, '  ').length;
        const indentLevel = Math.min(Math.floor(indentSpaces / 2), 3);
        const indentClass = ['pl-0', 'pl-6', 'pl-12', 'pl-16'][indentLevel];

        const trimmed = line.trim();
        const cleaned = trimmed.replace(/^(\d+\.\s+|[-*•]\s+)?\[\s*[xX ]?\s*\]\s*/, '$1');

        // 헤더 — 색 배경 박스로
        const hMatch = cleaned.match(/^(#{1,6})\s+(.*)$/);
        if (hMatch) {
          const level = hMatch[1].length;
          if (level <= 2) {
            return (
              <div
                key={i}
                className={`mt-5 first:mt-0 mb-3 px-4 py-2.5 rounded-xl border ${accentBg} ${accentBorder}`}
              >
                <span className={`font-bold ${accentText} ${isLargeFont ? 'text-2xl' : 'text-xl'}`}>
                  {renderInline(hMatch[2], `${i}h`)}
                </span>
              </div>
            );
          }
          return (
            <div
              key={i}
              className={`mt-4 first:mt-0 font-bold ${isHighContrast ? 'text-yellow-300' : 'text-slate-800'} ${sizeRich}`}
            >
              {renderInline(hMatch[2], `${i}h`)}
            </div>
          );
        }

        // 번호 리스트 → 동그란 배지 번호
        const numMatch = cleaned.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={i} className={`flex gap-3 mt-3 first:mt-0 items-start ${indentClass}`}>
              <span
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  isHighContrast ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white'
                }`}
              >
                {numMatch[1]}
              </span>
              <span className={`flex-1 leading-relaxed pt-0.5 ${bodyColor}`}>
                {renderInline(numMatch[2], `${i}n`)}
              </span>
            </div>
          );
        }

        // 불릿
        if (/^[-*•]\s/.test(cleaned)) {
          return (
            <div key={i} className={`flex gap-2.5 mt-2 first:mt-0 items-start ${indentClass}`}>
              <span
                className={`shrink-0 mt-2 w-1.5 h-1.5 rounded-full ${isHighContrast ? 'bg-yellow-400' : 'bg-blue-500'}`}
              />
              <span className={`flex-1 leading-relaxed ${softColor}`}>
                {renderInline(cleaned.replace(/^[-*•]\s+/, ''), `${i}l`)}
              </span>
            </div>
          );
        }

        // 일반 문단
        return (
          <p
            key={i}
            className={`mt-2.5 first:mt-0 leading-relaxed ${indentClass} ${bodyColor}`}
          >
            {renderInline(cleaned, `${i}p`)}
          </p>
        );
      })}
    </div>
  );
}
