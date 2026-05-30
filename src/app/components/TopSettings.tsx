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
    <div className="absolute top-5 right-5 flex justify-end items-center gap-3 z-50">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as LangCode)}
        aria-label="Language"
        className="h-8 px-2 rounded border border-gray-300 bg-white text-black text-[14px] font-semibold cursor-pointer"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.native}</option>
        ))}
      </select>

      <div onClick={() => setIsHighContrast(!isHighContrast)} className="flex flex-col items-center cursor-pointer w-[42px]">
        <SunMoon className="w-6 h-6" />
        <span className="text-[10px] font-bold mt-1 text-gray-600 whitespace-nowrap">{t.highContrast}</span>
      </div>
      <div onClick={() => setIsLargeFont(!isLargeFont)} className="flex flex-col items-center cursor-pointer w-[42px]">
        <AArrowUp className="w-6 h-6" />
        <span className="text-[10px] font-bold mt-1 text-gray-600 whitespace-nowrap">{t.largeFont}</span>
      </div>
    </div>
  );
}
