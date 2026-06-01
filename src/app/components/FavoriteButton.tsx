"use client"

import React, { useState } from "react";
import { Star } from "lucide-react";
import { apiFetch, getAccessToken } from "@/lib/api-client";

type Props = {
  serviceId: number | string;
  initial?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onChange?: (favorited: boolean) => void;
  label?: boolean; // 텍스트 라벨 표시 여부
};

export default function FavoriteButton({ serviceId, initial = false, size = 'md', onChange, label = false }: Props) {
  const [favorited, setFavorited] = useState(initial);
  const [loading, setLoading] = useState(false);

  const sizes = {
    sm: { btn: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-xs' },
    md: { btn: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-sm' },
    lg: { btn: 'w-11 h-11', icon: 'w-5 h-5', text: 'text-base' },
  }[size];

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (loading || !getAccessToken()) return;
    setLoading(true);
    const next = !favorited;
    setFavorited(next); // optimistic
    try {
      const res = await apiFetch('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ service_id: Number(serviceId) }),
      });
      const data = await res.json();
      if (typeof data?.favorited === 'boolean') {
        setFavorited(data.favorited);
        onChange?.(data.favorited);
      } else {
        setFavorited(!next); // 롤백
      }
    } catch (err) {
      console.error('favorite toggle 실패:', err);
      setFavorited(!next); // 롤백
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-pressed={favorited}
      aria-label={favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      className={`inline-flex items-center justify-center gap-1 rounded-full transition-all disabled:opacity-50 active:scale-90 ${sizes.btn} ${
        favorited
          ? 'bg-amber-50 text-amber-500 hover:bg-amber-100'
          : 'bg-surface-muted text-ink-4 hover:bg-line-soft hover:text-amber-500'
      }`}
    >
      <Star className={`${sizes.icon} transition-all ${favorited ? 'fill-amber-400 stroke-amber-500' : ''}`} />
      {label && (
        <span className={`font-semibold ${sizes.text}`}>
          {favorited ? '저장됨' : '즐겨찾기'}
        </span>
      )}
    </button>
  );
}
