"use client"

import React from "react";

type Segment = { label: string; value: number; color: string };

type Props = {
  segments: Segment[];
  centerLabel?: string;
  centerSub?: string;
  size?: number;
  stroke?: number;
};

/**
 * 의존성 없는 순수 SVG 도넛 차트.
 * - 작은 stroke로 미니멀, 회색 배경 위에 세그먼트 누적.
 */
export default function ActivityDonut({
  segments,
  centerLabel,
  centerSub,
  size = 160,
  stroke = 22,
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, v) => s + v.value, 0) || 1;
  let acc = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-soft)" strokeWidth={stroke} />
        {segments.map((seg, i) => {
          if (seg.value <= 0) return null;
          const len = (seg.value / total) * c;
          const offset = -acc;
          acc += len;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
          );
        })}
      </svg>
      {(centerLabel || centerSub) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {centerLabel && <span className="text-2xl font-bold text-ink-1 tabular-nums leading-none">{centerLabel}</span>}
          {centerSub && <span className="mt-1 text-xs text-ink-3 font-medium">{centerSub}</span>}
        </div>
      )}
    </div>
  );
}
