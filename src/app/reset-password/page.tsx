'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/state/app';
import { Logo, ISpinner, ICheck, IExternal } from '@/components/icons';

function ResetForm() {
  const { t } = useApp();
  const params = useSearchParams();
  const token = params.get('token');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setError(t('auth.invalidEmail')); return; }
    setError(''); setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(t(data.error === 'invalid_email' ? 'auth.invalidEmail' : 'auth.serverError')); return; }
      setSent(true);
      setResetUrl(data.resetUrl ?? null);
    } catch { setError(t('auth.serverError')); }
    finally { setBusy(false); }
  };

  const confirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError(t('auth.pwShort')); return; }
    if (password !== confirm) { setError(t('auth.pwMismatch')); return; }
    setError(''); setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(t(data.error === 'pw_short' ? 'auth.pwShort' : 'auth.resetInvalid')); return; }
      setDone(true);
    } catch { setError(t('auth.serverError')); }
    finally { setBusy(false); }
  };

  return (
    <div className="container-x flex justify-center py-14">
      <div className="glass w-full max-w-md p-7 rise">
        <div className="flex flex-col items-center text-center gap-2">
          <Logo size={44} />
          <h1 className="h-display text-2xl font-bold">{t('auth.resetTitle')}</h1>
          {!token && !sent && <p className="text-[13px]" style={{ color: 'var(--color-dim)' }}>{t('auth.resetIntro')}</p>}
        </div>

        {done ? (
          <div className="mt-6 text-center space-y-4">
            <p className="flex items-center justify-center gap-2 text-[#86EFAC] font-semibold"><ICheck size={18} /> {t('auth.resetDone')}</p>
            <Link href="/login" className="btn btn-primary w-full">{t('auth.login')}</Link>
          </div>
        ) : token ? (
          <form onSubmit={confirmReset} className="mt-6 space-y-4" noValidate>
            <div>
              <label className="lbl" htmlFor="npw">{t('auth.newPw')}</label>
              <input id="npw" type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
            </div>
            <div>
              <label className="lbl" htmlFor="cpw">{t('auth.confirm')}</label>
              <input id="cpw" type="password" className="input" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required />
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy && <ISpinner size={16} />} {t('common.save')}
            </button>
          </form>
        ) : sent ? (
          <div className="mt-6 space-y-4 text-sm">
            <p className="flex items-start gap-2 text-[#86EFAC]"><ICheck size={17} className="shrink-0 mt-0.5" /> {t('auth.resetSent', { email })}</p>
            {resetUrl && (
              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'rgba(245,184,92,0.4)', background: 'rgba(245,184,92,0.06)' }}>
                <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t('auth.resetLinkShown')}</p>
                <Link href={resetUrl} className="btn btn-primary btn-sm w-full">
                  <IExternal size={14} /> {t('auth.resetTitle')}
                </Link>
              </div>
            )}
            <Link href="/login" className="btn btn-ghost w-full">{t('auth.login')}</Link>
          </div>
        ) : (
          <form onSubmit={request} className="mt-6 space-y-4" noValidate>
            <div>
              <label className="lbl" htmlFor="remail">{t('auth.email')}</label>
              <input id="remail" type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy && <ISpinner size={16} />} {t('auth.sendLink')}
            </button>
            <Link href="/login" className="btn btn-ghost w-full">{t('auth.login')}</Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="container-x py-24 text-center"><ISpinner size={28} className="inline-block" /></div>}>
      <ResetForm />
    </Suspense>
  );
}