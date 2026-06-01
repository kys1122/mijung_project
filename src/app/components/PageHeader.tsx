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
            className="inline-flex items-center justify-center w-11 h-11 -ml-2 rounded-full text-ink-2 hover:bg-surface-muted transition-colors"
            aria-label="뒤로"
          >
            <ChevronLeft className="w-6 h-6" />
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
