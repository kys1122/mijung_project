"use client"

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  align?: "left" | "center";
};

export default function PageHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  right,
  align = "left",
}: Props) {
  const router = useRouter();
  const handleBack = () => {
    if (onBack) return onBack();
    router.back();
  };

  return (
    <header className="pt-6 ui-enter">
      <div className="flex items-start justify-between gap-3 min-h-[40px]">
        {showBack ? (
          <button
            onClick={handleBack}
            className="ui-btn-ghost -ml-2"
            aria-label="뒤로"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="sr-only sm:not-sr-only sm:inline">뒤로</span>
          </button>
        ) : (
          <span />
        )}
        {right && <div className="shrink-0">{right}</div>}
      </div>

      <div className={`mt-4 ${align === "center" ? "text-center" : ""}`}>
        <h1 className="ui-page-title">{title}</h1>
        {subtitle && <p className="ui-page-subtitle">{subtitle}</p>}
      </div>
    </header>
  );
}
