'use client';
import { AArrowUp, SunMoon } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type LangCode } from '../lib/languages';

interface TopSettingsProps {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  isHighContrast: boolean;
  setIsHighContrast: (val: boolean) => void;
  isLargeFont: boolean;
  setIsLargeFont: (val: boolean) => void;
  t: { highContrast: string; largeFont: string };
}

export default function TopSettings({
  lang, setLang, isHighContrast, setIsHighContrast, isLargeFont, setIsLargeFont, t,
}: TopSettingsProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as LangCode)}
        aria-label="Language"
        className="h-11 px-3 rounded-xl border border-line-base bg-surface text-ink-1 text-sm font-semibold cursor-pointer focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-colors"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.native}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setIsHighContrast(!isHighContrast)}
        aria-label={t.highContrast}
        aria-pressed={isHighContrast}
        title={t.highContrast}
        className={`inline-flex items-center gap-1.5 h-11 px-3 rounded-xl text-sm font-semibold transition-colors ${
          isHighContrast
            ? 'bg-ink-1 text-white shadow-[0_2px_8px_rgba(15,23,42,0.15)]'
            : 'bg-surface border border-line-base text-ink-2 hover:bg-surface-muted'
        }`}
      >
        <SunMoon className="w-5 h-5 shrink-0" />
        <span className="whitespace-nowrap hidden sm:inline">{t.highContrast}</span>
      </button>

      <button
        type="button"
        onClick={() => setIsLargeFont(!isLargeFont)}
        aria-label={t.largeFont}
        aria-pressed={isLargeFont}
        title={t.largeFont}
        className={`inline-flex items-center gap-1.5 h-11 px-3 rounded-xl text-sm font-semibold transition-colors ${
          isLargeFont
            ? 'bg-brand-600 text-white shadow-[0_2px_8px_rgba(37,99,235,0.22)]'
            : 'bg-surface border border-line-base text-ink-2 hover:bg-surface-muted'
        }`}
      >
        <AArrowUp className="w-5 h-5 shrink-0" />
        <span className="whitespace-nowrap hidden sm:inline">{t.largeFont}</span>
      </button>
    </div>
  );
}
