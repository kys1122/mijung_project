'use client';
import {Languages, AArrowUp, SunMoon} from 'lucide-react';

interface TopSettingsProps {
  lang: 'ko' | 'en';
  setLang: (lang: 'ko' | 'en') => void;
  isHighContrast: boolean;
  setIsHighContrast: (val: boolean) => void;
  isLargeFont: boolean;
  setIsLargeFont: (val: boolean) => void;
  t: any;
}

export default function TopSettings({ 
  lang, setLang, isHighContrast, setIsHighContrast, isLargeFont, setIsLargeFont, t 
}: TopSettingsProps) {

  return (
    <div className="absolute top-5 right-5 flex justify-end gap-3 z-50">
      <div onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')} className="flex flex-col items-center cursor-pointer w-[42px]">
        <Languages className='w-6 h-6'/>
        {/* <img src={icons.lang} alt="Language" className="w-6 h-6 opacity-90"/> */}
        <span className="text-[10px] font-bold mt-1 text-gray-600 whitespace-nowrap">{t.langText}</span>
      </div>
      <div onClick={() => setIsHighContrast(!isHighContrast)} className="flex flex-col items-center cursor-pointer w-[42px]">
        <SunMoon className='w-6 h-6'/>
        {/* <img src={icons.contrast} alt="Contrast" className={`w-6 h-6 ${isHighContrast ? 'opacity-100' : 'opacity-90'}`}/> */}
        <span className="text-[10px] font-bold mt-1 text-gray-600 whitespace-nowrap">{t.highContrast}</span>
      </div>
      <div onClick={() => setIsLargeFont(!isLargeFont)} className="flex flex-col items-center cursor-pointer w-[42px]">
        <AArrowUp className='w-6 h-6'/>
        {/* <img src={icons.largeFont} alt="Large Font" className={`w-6 h-6 ${isLargeFont ? 'opacity-100' : 'opacity-90'}`}/> */}
        <span className="text-[10px] font-bold mt-1 text-gray-600 whitespace-nowrap">{t.largeFont}</span>
      </div>
    </div>
  );
}