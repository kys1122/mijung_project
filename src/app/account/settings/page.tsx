"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Save, Lock, UserCog, AlertTriangle } from "lucide-react";
import { apiFetch, getAccessToken, clearTokens } from "@/lib/api-client";
import BottomNav from "../../components/BottomNav";
import PageHeader from "../../components/PageHeader";
import { useAppLang } from "../../lib/app-prefs";
import { useT } from "../../lib/use-t";

type Me = { id: number; email: string; name: string };

export default function AccountSettingsScreen() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang] = useAppLang();
  const tr = useT();
  const t = (ko: string, _en?: string) => tr(ko);

  // 이름 변경
  const [name, setName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // 비밀번호 변경
  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [chkPw, setChkPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // 회원 탈퇴
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/user/login?return=/');
      return;
    }
    (async () => {
      try {
        const res = await apiFetch('/api/users/me');
        if (res.status === 401) {
          router.replace('/user/login?return=/');
          return;
        }
        if (res.ok) {
          const d = await res.json();
          setMe(d?.user ?? null);
          setName(d?.user?.name ?? '');
        }
      } catch (e) { console.error('me 로드 실패:', e); }
      finally { setLoading(false); }
    })();
  }, [router]);

  const saveName = async () => {
    const v = name.trim();
    if (!v) { setNameMsg({ kind: 'err', text: t('이름을 입력해주세요.', 'Please enter your name.') }); return; }
    if (v === me?.name) { setNameMsg({ kind: 'ok', text: t('변경 사항이 없어요.', 'No changes.') }); return; }
    setNameSaving(true);
    setNameMsg(null);
    try {
      const res = await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: v }),
      });
      const d = await res.json();
      if (d?.success) {
        setMe(prev => prev ? { ...prev, name: v } : prev);
        setNameMsg({ kind: 'ok', text: t('이름을 저장했어요.', 'Name saved.') });
      } else {
        setNameMsg({ kind: 'err', text: d?.message ?? t('저장에 실패했어요.', 'Save failed.') });
      }
    } catch (e) {
      console.error('이름 저장 실패:', e);
      setNameMsg({ kind: 'err', text: t('연결이 끊겼어요. 잠시 후 다시 시도해주세요.', 'Connection lost. Try again.') });
    } finally {
      setNameSaving(false);
    }
  };

  const savePassword = async () => {
    if (!currentPw) { setPwMsg({ kind: 'err', text: t('현재 비밀번호를 입력해주세요.', 'Enter current password.') }); return; }
    if (nextPw.length < 8) { setPwMsg({ kind: 'err', text: t('새 비밀번호는 8자 이상이어야 해요.', 'New password must be 8+ characters.') }); return; }
    if (nextPw !== chkPw) { setPwMsg({ kind: 'err', text: t('새 비밀번호가 일치하지 않아요.', "Passwords don't match.") }); return; }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const res = await apiFetch('/api/users/me/password', {
        method: 'POST',
        body: JSON.stringify({ current: currentPw, next: nextPw }),
      });
      const d = await res.json();
      if (d?.success) {
        setCurrentPw(''); setNextPw(''); setChkPw('');
        setPwMsg({ kind: 'ok', text: t('비밀번호를 변경했어요.', 'Password changed.') });
      } else {
        setPwMsg({ kind: 'err', text: d?.message ?? t('변경에 실패했어요.', 'Change failed.') });
      }
    } catch (e) {
      console.error('비밀번호 변경 실패:', e);
      setPwMsg({ kind: 'err', text: t('연결이 끊겼어요. 잠시 후 다시 시도해주세요.', 'Connection lost. Try again.') });
    } finally {
      setPwSaving(false);
    }
  };

  const withdraw = async () => {
    const ok = confirm(t(
      '정말 탈퇴하시겠어요?\n진행 중인 민원, 즐겨찾기, 가족 공유 등 모든 데이터가 삭제되며 되돌릴 수 없어요.',
      "Really delete your account? All services, favorites, and family sharing data will be permanently deleted."
    ));
    if (!ok) return;
    const phrase = prompt(t('계속하려면 "탈퇴"라고 정확히 입력해주세요.', 'Type "DELETE" exactly to continue.'));
    const expected = tr('탈퇴');
    if (phrase !== expected) return;
    setWithdrawing(true);
    try {
      const res = await apiFetch('/api/users/me', { method: 'DELETE' });
      if (res.ok) {
        clearTokens();
        alert(t('탈퇴 처리됐습니다. 그동안 이용해 주셔서 감사해요.', "Account deleted. Thank you for using our service."));
        router.push('/');
      } else {
        const d = await res.json().catch(() => null);
        alert(d?.message ?? t('탈퇴에 실패했어요. 잠시 후 다시 시도해주세요.', 'Failed to delete account. Try again.'));
      }
    } catch (e) {
      console.error('탈퇴 실패:', e);
      alert(t('연결이 끊겼어요. 잠시 후 다시 시도해주세요.', 'Connection lost. Try again.'));
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-page pb-28">
      <div className="mx-auto max-w-md sm:max-w-2xl px-5 sm:px-8">
        <PageHeader showBack title={t('계정 설정', 'Account settings')} subtitle={t('이름·비밀번호·회원 탈퇴', 'Name, password, delete account')} />

        {loading ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-ink-3">
            <div className="w-8 h-8 border-[3px] border-line-base border-t-brand-500 rounded-full animate-spin" />
            <p className="text-sm">{t('불러오는 중...', 'Loading...')}</p>
          </div>
        ) : (
          <>
            {/* 이름 변경 */}
            <section className="mt-6 ui-card p-5 ui-enter">
              <div className="flex items-center gap-2 mb-4">
                <UserCog className="w-5 h-5 text-brand-600" />
                <h2 className="font-bold text-ink-1">{t('프로필', 'Profile')}</h2>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-semibold text-ink-2 mb-1.5">{t('이메일', 'Email')}</label>
                  <input
                    type="email"
                    value={me?.email ?? ''}
                    readOnly
                    disabled
                    className="ui-input bg-surface-muted cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-ink-4">{t('이메일은 변경할 수 없어요.', 'Email cannot be changed.')}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-2 mb-1.5">{t('이름', 'Name')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={50}
                    className="ui-input"
                    placeholder={t('이름', 'Name')}
                  />
                </div>
                {nameMsg && (
                  <div className={`rounded-xl px-3 py-2.5 text-sm ${
                    nameMsg.kind === 'ok'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-danger/10 border border-danger/30 text-danger'
                  }`}>
                    {nameMsg.text}
                  </div>
                )}
                <button
                  onClick={saveName}
                  disabled={nameSaving || !name.trim() || name.trim() === me?.name}
                  className="ui-btn-primary w-full"
                >
                  <Save className="w-4 h-4" />
                  {nameSaving ? t('저장 중...', 'Saving...') : t('이름 저장', 'Save name')}
                </button>
              </div>
            </section>

            {/* 비밀번호 변경 */}
            <section className="mt-6 ui-card p-5 ui-enter" style={{ animationDelay: '50ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-brand-600" />
                <h2 className="font-bold text-ink-1">{t('비밀번호 변경', 'Change password')}</h2>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-semibold text-ink-2 mb-1.5">{t('현재 비밀번호', 'Current password')}</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)}
                      className="ui-input pr-12"
                      placeholder={t('현재 비밀번호', 'Current password')}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ink-3 hover:text-ink-1 hover:bg-surface-muted transition-colors"
                      aria-label={showPw ? t('비밀번호 숨기기', 'Hide password') : t('비밀번호 표시', 'Show password')}
                    >
                      {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-2 mb-1.5">{t('새 비밀번호', 'New password')}</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={nextPw}
                    onChange={e => setNextPw(e.target.value)}
                    className="ui-input"
                    placeholder={t('8자 이상', '8+ characters')}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-2 mb-1.5">{t('새 비밀번호 확인', 'Confirm new password')}</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={chkPw}
                    onChange={e => setChkPw(e.target.value)}
                    className="ui-input"
                    placeholder={t('비밀번호 재입력', 'Re-enter password')}
                    autoComplete="new-password"
                  />
                </div>
                {pwMsg && (
                  <div className={`rounded-xl px-3 py-2.5 text-sm ${
                    pwMsg.kind === 'ok'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-danger/10 border border-danger/30 text-danger'
                  }`}>
                    {pwMsg.text}
                  </div>
                )}
                <button
                  onClick={savePassword}
                  disabled={pwSaving || !currentPw || !nextPw || !chkPw}
                  className="ui-btn-primary w-full"
                >
                  <Save className="w-4 h-4" />
                  {pwSaving ? t('변경 중...', 'Changing...') : t('비밀번호 변경', 'Change password')}
                </button>
              </div>
            </section>

            {/* 회원 탈퇴 — 위험 영역 */}
            <section className="mt-6 ui-card p-5 border-danger/30 ui-enter" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-danger" />
                <h2 className="font-bold text-danger">{t('회원 탈퇴', 'Delete account')}</h2>
              </div>
              <p className="text-sm text-ink-3 leading-relaxed mb-4">
                {t(
                  '탈퇴하시면 진행 중인 민원, 즐겨찾기, 가족 공유 정보 등 모든 데이터가 삭제되고 되돌릴 수 없어요.',
                  'Deleting your account permanently removes all services, favorites, and family sharing data.'
                )}
              </p>
              <button
                onClick={withdraw}
                disabled={withdrawing}
                className="w-full py-3 rounded-2xl font-semibold border border-danger/30 text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
              >
                {withdrawing ? t('처리 중...', 'Processing...') : t('회원 탈퇴', 'Delete account')}
              </button>
            </section>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
