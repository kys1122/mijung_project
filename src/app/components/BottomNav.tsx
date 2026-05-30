"use client"

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle, ListChecks, ClipboardList, User } from "lucide-react";

const TABS = [
  { key: 'chat',      ko: '챗봇',     en: 'Chat',     icon: MessageCircle, path: '/chat' },
  { key: 'list',      ko: '민원',     en: 'Services', icon: ListChecks,    path: '/recommend' },
  { key: 'dashboard', ko: '내 진행', en: 'My',       icon: ClipboardList, path: '/dashboard' },
  { key: 'account',   ko: '내 계정', en: 'Account',  icon: User,          path: '/' },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (localStorage.getItem('app_lang') === 'en') setLang('en');
    if (localStorage.getItem('app_contrast') === 'true') setIsHighContrast(true);
    setLoggedIn(!!localStorage.getItem('accessToken'));
  }, []);

  if (loggedIn !== true) return null;

  const isActive = (path: string) => {
    if (path === '/recommend') return pathname === '/recommend' || pathname?.startsWith('/list/') || false;
    return pathname === path;
  };

  const navBg = isHighContrast
    ? 'bg-black/95 border-zinc-700'
    : 'bg-white/95 border-slate-200/70';
  const inactive = isHighContrast ? 'text-zinc-500' : 'text-slate-400';
  const active = isHighContrast ? 'text-yellow-400' : 'text-blue-600';

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md ${navBg}`}>
      <div className="mx-auto max-w-md sm:max-w-2xl grid grid-cols-4 h-16">
        {TABS.map(({ key, ko, en, icon: Icon, path }) => {
          const isAct = isActive(path);
          return (
            <button
              key={key}
              onClick={() => router.push(path)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${isAct ? active : inactive}`}
            >
              <Icon className="w-5 h-5" />
              <span className={`text-xs ${isAct ? 'font-semibold' : 'font-medium'}`}>
                {lang === 'en' ? en : ko}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
