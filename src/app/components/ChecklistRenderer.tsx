"use client"

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

// LLM 체크리스트 텍스트(`1. [ ] 항목`, `- [ ] 항목` 등)를 진짜 체크박스 UI로 렌더
// 체크 상태는 localStorage("chk:<serviceName>")에 저장돼 다시 와도 복원
export default function ChecklistRenderer({
  content,
  serviceName,
  isHighContrast = false,
  isLargeFont = false,
}: {
  content: string;
  serviceName: string;
  isHighContrast?: boolean;
  isLargeFont?: boolean;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`chk:${serviceName}`);
      if (stored) setChecked(JSON.parse(stored));
    } catch {}
  }, [serviceName]);

  const toggle = (key: string) => {
    setChecked(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(`chk:${serviceName}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const titleColor = isHighContrast ? 'text-white' : 'text-slate-900';
  const checkboxOn = isHighContrast ? 'bg-yellow-400 border-yellow-400' : 'bg-emerald-500 border-emerald-500';
  const checkboxOff = isHighContrast ? 'bg-transparent border-zinc-500' : 'bg-white border-slate-300';
  const doneColor = isHighContrast ? 'text-zinc-500 line-through' : 'text-slate-400 line-through';
  const accent = isHighContrast ? 'text-yellow-400' : 'text-blue-600';
  const sizeRich = isLargeFont ? 'text-lg' : 'text-base';

  const renderInline = (text: string, keyPrefix: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, j) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={`${keyPrefix}-${j}`} className={isHighContrast ? 'text-yellow-400' : 'text-blue-700'}>{p.slice(2, -2)}</strong>
        : <span key={`${keyPrefix}-${j}`}>{p}</span>
    );
  };

  const lines = content.split('\n');
  const totalItems = lines.filter(l => {
    const t = l.trim();
    return /^(?:\d+\.\s+|[-*•]\s+)?\[\s*[xX ]?\s*\]\s+/.test(t) || /^(\d+)\.\s+/.test(t);
  }).length;
  const doneItems = Object.values(checked).filter(Boolean).length;

  return (
    <div className={sizeRich}>
      {totalItems > 0 && (
        <div className={`flex items-center justify-between text-sm mb-4 pb-3 border-b ${isHighContrast ? 'border-zinc-700' : 'border-slate-200'}`}>
          <span className={`font-semibold ${accent}`}>진행 {doneItems}/{totalItems}</span>
          <div className={`flex-1 ml-3 h-1.5 rounded-full overflow-hidden ${isHighContrast ? 'bg-zinc-800' : 'bg-slate-100'}`}>
            <div
              className={`h-full rounded-full transition-all ${isHighContrast ? 'bg-yellow-400' : 'bg-emerald-500'}`}
              style={{ width: `${totalItems ? (doneItems / totalItems) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;

        const indentSpaces = (line.match(/^(\s*)/)?.[1] ?? '').replace(/\t/g, '  ').length;
        const indentLevel = Math.min(Math.floor(indentSpaces / 2), 3);
        const indentClass = ['pl-0', 'pl-5', 'pl-10', 'pl-14'][indentLevel];

        const trimmed = line.trim();

        // 헤더
        const hMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (hMatch) {
          const level = hMatch[1].length;
          const cls = level <= 2
            ? `block mt-5 first:mt-0 pb-2 font-bold border-b ${isHighContrast ? 'border-yellow-400/40 text-yellow-400' : 'border-blue-200 text-blue-700'} ${isLargeFont ? 'text-2xl' : 'text-xl'}`
            : `block mt-4 first:mt-0 font-bold ${sizeRich} ${isHighContrast ? 'text-yellow-300' : 'text-slate-800'}`;
          return <div key={i} className={cls}>{renderInline(hMatch[2], `${i}h`)}</div>;
        }

        // 마크다운 task — `- [ ]`, `1. [ ]`, `[ ]` 모두 처리
        const taskMatch = trimmed.match(/^(?:(\d+)\.\s+)?(?:[-*•]\s+)?\[\s*[xX ]?\s*\]\s+(.*)$/);
        if (taskMatch) {
          const num = taskMatch[1];
          const key = `t${i}`;
          const isChecked = !!checked[key];
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(key)}
              className={`w-full flex gap-3 items-start mt-2.5 first:mt-0 text-left py-2 px-3 rounded-lg ${indentClass} ${isHighContrast ? 'hover:bg-zinc-800' : 'hover:bg-slate-50'}`}
            >
              <span className={`shrink-0 mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isChecked ? checkboxOn : checkboxOff}`}>
                {isChecked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </span>
              <span className={`flex-1 leading-relaxed ${isChecked ? doneColor : titleColor}`}>
                {num && <span className={`mr-1.5 font-bold ${accent}`}>{num}.</span>}
                {renderInline(taskMatch[2], `${i}t`)}
              </span>
            </button>
          );
        }

        // 일반 번호 리스트 → 체크박스
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          const key = `n${i}`;
          const isChecked = !!checked[key];
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(key)}
              className={`w-full flex gap-3 items-start mt-2.5 first:mt-0 text-left py-2 px-3 rounded-lg ${indentClass} ${isHighContrast ? 'hover:bg-zinc-800' : 'hover:bg-slate-50'}`}
            >
              <span className={`shrink-0 mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isChecked ? checkboxOn : checkboxOff}`}>
                {isChecked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </span>
              <span className={`flex-1 leading-relaxed ${isChecked ? doneColor : titleColor}`}>
                <span className={`mr-1.5 font-bold ${accent}`}>{numMatch[1]}.</span>
                {renderInline(numMatch[2], `${i}n`)}
              </span>
            </button>
          );
        }

        // 불릿 (체크박스 X, 보충 설명)
        if (/^[-*•]\s/.test(trimmed)) {
          return (
            <div key={i} className={`flex gap-2 mt-1.5 first:mt-0 ${indentClass} ${sizeRich}`}>
              <span className={`shrink-0 ${accent}`}>•</span>
              <span className={`flex-1 leading-relaxed ${isHighContrast ? 'text-zinc-300' : 'text-slate-700'}`}>
                {renderInline(trimmed.replace(/^[-*•]\s+/, ''), `${i}b`)}
              </span>
            </div>
          );
        }

        // 일반 문단
        return (
          <div key={i} className={`mt-2 first:mt-0 ${indentClass} leading-relaxed ${isHighContrast ? 'text-zinc-200' : 'text-slate-700'}`}>
            {renderInline(trimmed, `${i}p`)}
          </div>
        );
      })}
    </div>
  );
}
