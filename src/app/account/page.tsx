"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, UserPlus, Check, X, Users, Mail, Trash2, Settings } from "lucide-react";
import { apiFetch, getAccessToken, clearTokens } from "@/lib/api-client";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";
import TopSettings from "../components/TopSettings";
import { useTranslations } from '../lib/i18n';
import { STRINGS as LIST_STRINGS, type ListStrings } from '../lib/strings/list';
import { type LangCode } from '../lib/languages';
import { useAppLang, useAppContrast, useAppLargeFont } from '../lib/app-prefs';

type Me = { id: number; email: string; name: string };
type Delegation = {
  id: number;
  user_id: number;
  name: string;
  email: string;
  relation: string | null;
  status: 'pending' | 'active' | 'revoked';
};

const STATUS_LABEL: Record<Delegation['status'], { label: string; chip: string }> = {
  pending: { label: '수락 대기', chip: 'bg-amber-50 text-amber-800 border-amber-200' },
  active:  { label: '활성',      chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  revoked: { label: '해제됨',    chip: 'bg-surface-muted text-ink-3 border-line-soft' },
};

export default function AccountScreen() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOwner, setAsOwner] = useState<Delegation[]>([]);
  const [asDelegate, setAsDelegate] = useState<Delegation[]>([]);

  // 초대 폼
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRelation, setInviteRelation] = useState("");
  const [inviteMsg, setInviteMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // 접근성 토글
  const [lang, setLang] = useAppLang();
  const [isHighContrast, setIsHighContrast] = useAppContrast();
  const [isLargeFont, setIsLargeFont] = useAppLargeFont();
  const tSet = useTranslations<ListStrings>('list', LIST_STRINGS as unknown as { ko: ListStrings; en: ListStrings }, lang);

  const reload = async () => {
    try {
      const [meRes, dRes] = await Promise.all([
        apiFetch('/api/users/me'),
        apiFetch('/api/delegations'),
      ]);
      if (meRes.status === 401) {
        router.replace('/user/login?return=/');
        return;
      }
      if (meRes.ok) {
        const d = await meRes.json();
        setMe(d?.user ?? null);
      }
      if (dRes.ok) {
        const dd = await dRes.json();
        setAsOwner(dd.as_owner ?? []);
        setAsDelegate(dd.as_delegate ?? []);
      }
    } catch (e) { console.error('account 로드 실패:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/user/login?return=/');
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    clearTokens();
    router.push('/');
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || inviteLoading) return;
    setInviteLoading(true);
    setInviteMsg(null);
    try {
      const res = await apiFetch('/api/delegations', {
        method: 'POST',
        body: JSON.stringify({ email, relation: inviteRelation.trim() || null }),
      });
      const data = await res.json();
      if (data?.success) {
        setInviteMsg({ kind: 'ok', text: lang === 'en'
          ? "Invitation sent. They'll be active once accepted."
          : '초대를 보냈어요. 상대방이 수락하면 활성 상태가 돼요.' });
        setInviteEmail('');
        setInviteRelation('');
        await reload();
      } else {
        setInviteMsg({ kind: 'err', text: data?.message ?? (lang === 'en' ? 'Invitation failed.' : '초대에 실패했어요.') });
      }
    } catch (e) {
      console.error('초대 실패:', e);
      setInviteMsg({ kind: 'err', text: lang === 'en' ? 'Connection lost. Try again shortly.' : '연결이 끊겼어요. 잠시 후 다시 시도해 주세요.' });
    } finally {
      setInviteLoading(false);
    }
  };

  const updateStatus = async (id: number, status: 'active' | 'revoked') => {
    await apiFetch(`/api/delegations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await reload();
  };

  const removeRelation = async (id: number) => {
    if (!confirm(lang === 'en' ? 'Remove this relationship?' : '이 관계를 삭제할까요?')) return;
    await apiFetch(`/api/delegations/${id}`, { method: 'DELETE' });
    await reload();
  };

  const pendingForMe = asDelegate.filter(d => d.status === 'pending');

  return (
    <div className="min-h-screen bg-surface-page pb-28">
      <div className="mx-auto max-w-md sm:max-w-2xl px-5 sm:px-8">
        <PageHeader
          title={lang === 'en' ? 'My Account' : '내 계정'}
          subtitle={lang === 'en' ? 'Manage profile and family sharing' : '프로필과 가족 공유를 관리해요'}
          right={
            <TopSettings
              lang={lang} setLang={setLang}
              isHighContrast={isHighContrast} setIsHighContrast={setIsHighContrast}
              isLargeFont={isLargeFont} setIsLargeFont={setIsLargeFont}
              t={tSet}
            />
          }
        />

        {loading ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-ink-3">
            <div className="w-8 h-8 border-[3px] border-line-base border-t-brand-500 rounded-full animate-spin" />
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* 프로필 카드 */}
            <div data-tour="account-profile" className="mt-6 ui-card p-5 flex items-center gap-4 ui-enter">
              <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xl">
                {me?.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-ink-1 truncate">{me?.name ?? '—'}</p>
                <p className="text-sm text-ink-3 truncate">{me?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ui-btn-ghost"
                aria-label="로그아웃"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>

            {/* 계정 설정 진입 */}
            <button
              data-tour="account-settings"
              onClick={() => router.push('/account/settings')}
              className="mt-3 w-full ui-card-interactive p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform ui-enter"
              style={{ animationDelay: '30ms' }}
            >
              <div className="shrink-0 w-10 h-10 rounded-2xl bg-surface-muted flex items-center justify-center">
                <Settings className="w-5 h-5 text-ink-2" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-ink-1">{lang === 'en' ? 'Account settings' : '계정 설정'}</p>
                <p className="text-sm text-ink-3 mt-0.5">{lang === 'en' ? 'Change name, password, or delete account' : '이름·비밀번호 변경, 회원 탈퇴'}</p>
              </div>
              <span className="text-ink-4 text-lg">›</span>
            </button>

            {/* 받은 초대 — pending */}
            {pendingForMe.length > 0 && (
              <section className="mt-6 ui-enter" style={{ animationDelay: '60ms' }}>
                <h2 className="ui-section-label mb-2">{lang === 'en' ? 'INVITATIONS RECEIVED' : '받은 초대'}</h2>
                <div className="flex flex-col gap-2">
                  {pendingForMe.map(d => (
                    <div key={d.id} className="ui-card p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                        {d.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink-1 truncate">{d.name}{d.relation ? ` (${d.relation})` : ''}</p>
                        <p className="text-xs text-ink-3 truncate">{lang === 'en' ? `${d.email} invited you to view their services.` : `${d.email} 님이 본인 민원을 함께 보자고 초대했어요.`}</p>
                      </div>
                      <button
                        onClick={() => updateStatus(d.id, 'active')}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                        aria-label="수락"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateStatus(d.id, 'revoked')}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-surface-muted text-ink-3 hover:bg-line-soft transition-colors"
                        aria-label="거부"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 가족 초대 폼 */}
            <section data-tour="account-invite" className="mt-6 ui-card p-5 ui-enter" style={{ animationDelay: '90ms' }}>
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-5 h-5 text-brand-600" />
                <h2 className="font-bold text-ink-1">{lang === 'en' ? 'Invite family or helper' : '가족·도우미 초대하기'}</h2>
              </div>
              <p className="text-sm text-ink-3 mb-4 leading-relaxed">
                {lang === 'en'
                  ? "Enter their signup email. Once accepted, they can view your service progress with you."
                  : '상대방의 가입 이메일을 적어주세요. 수락하면 내 민원 진행 상황을 같이 볼 수 있어요.'}
              </p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-semibold text-ink-2 mb-1.5">이메일</label>
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="ui-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-2 mb-1.5">{lang === 'en' ? 'Relationship (optional)' : '관계 (선택)'}</label>
                  <input
                    type="text"
                    placeholder="예: 자녀, 배우자, 도우미"
                    value={inviteRelation}
                    onChange={e => setInviteRelation(e.target.value)}
                    maxLength={20}
                    className="ui-input"
                  />
                </div>
                {inviteMsg && (
                  <div className={`rounded-xl px-3 py-2.5 text-sm ${
                    inviteMsg.kind === 'ok'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-danger/10 border border-danger/30 text-danger'
                  }`}>
                    {inviteMsg.text}
                  </div>
                )}
                <button
                  onClick={handleInvite}
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="ui-btn-primary w-full"
                >
                  <Mail className="w-4 h-4" />
                  {inviteLoading
                    ? (lang === 'en' ? 'Sending...' : '초대 보내는 중...')
                    : (lang === 'en' ? 'Send invitation' : '초대 보내기')}
                </button>
              </div>
            </section>

            {/* 내가 초대한 사람들 */}
            {asOwner.length > 0 && (
              <section className="mt-6 ui-enter" style={{ animationDelay: '120ms' }}>
                <h2 className="ui-section-label mb-2">{lang === 'en' ? 'PEOPLE I INVITED' : '내가 초대한 사람'}</h2>
                <div className="flex flex-col gap-2">
                  {asOwner.map(d => {
                    const meta = STATUS_LABEL[d.status];
                    return (
                      <div key={d.id} className="ui-card p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-muted text-ink-2 flex items-center justify-center font-bold">
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ink-1 truncate">{d.name}{d.relation ? ` (${d.relation})` : ''}</p>
                          <p className="text-xs text-ink-3 truncate">{d.email}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${meta.chip}`}>
                          {meta.label}
                        </span>
                        <button
                          onClick={() => removeRelation(d.id)}
                          className="text-ink-4 hover:text-danger hover:bg-danger/10 p-2 rounded-lg transition-colors"
                          aria-label="관계 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 내가 대리 중인 사람들 */}
            {asDelegate.filter(d => d.status === 'active').length > 0 && (
              <section className="mt-6 ui-enter" style={{ animationDelay: '150ms' }}>
                <h2 className="ui-section-label mb-2">{lang === 'en' ? "PEOPLE I'M HELPING" : '내가 도와드리는 사람'}</h2>
                <div className="flex flex-col gap-2">
                  {asDelegate.filter(d => d.status === 'active').map(d => (
                    <div key={d.id} className="ui-card-interactive p-4 flex items-center gap-3 active:scale-[0.99] transition-transform">
                      <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink-1 truncate">{d.name}{d.relation ? ` (${d.relation})` : ''}</p>
                        <p className="text-xs text-ink-3 truncate">{lang === 'en' ? `Switch to "${d.name}" in dashboard to help them.` : `대시보드에서 "${d.name}"으로 전환해서 함께 진행할 수 있어요.`}</p>
                      </div>
                      <button
                        onClick={() => removeRelation(d.id)}
                        className="text-ink-4 hover:text-danger hover:bg-danger/10 p-2 rounded-lg transition-colors"
                        aria-label="관계 해제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
