'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/state/app';
import { Logo, IGoogle, ISpinner, IEye, IInfo } from '@/components/icons';
import { KEYS } from '@/lib/brand';

function LoginForm() {
  const { t, applyServerProfile, refreshAuth, pushToast } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') || '/workspace';
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [googleInfo, setGoogleInfo] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = t('auth.invalidEmail');
    if (password.length < 8) e.password = t('auth.pwShort');
    if (mode === 'signup' && confirm !== password) e.confirm = t('auth.pwMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const continueAsGuest = () => {
    try { localStorage.setItem(KEYS.guest, '1'); } catch { /* ignore */ }
    router.push(from.startsWith('/') ? from : '/');
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'signup'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, displayName: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        const map: Record<string, string> = {
          bad_creds: t('auth.badCreds'), email_taken: t('auth.emailTaken'),
          invalid_email: t('auth.invalidEmail'), pw_short: t('auth.pwShort'),
        };
        setErrors({ form: map[data.error] ?? t('auth.serverError') });
        return;
      }
      applyServerProfile(data.user, data.profile);
      await refreshAuth();
      pushToast('ok', mode === 'login' ? t('auth.welcome') : t('auth.createTitle'));
      router.push(from.startsWith('/') ? from : '/workspace');
    } catch {
      setErrors({ form: t('auth.serverError') });
    } finally { setBusy(false); }
  };

  return (
    <div className="container-x flex justify-center py-14">
      <div className="glass w-full max-w-md p-7 rise">
        <div className="flex flex-col items-center text-center gap-2">
          <Logo size={44} />
          <h1 className="h-display text-2xl font-bold">{t(mode === 'login' ? 'auth.welcome' : 'auth.createTitle')}</h1>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t('auth.intro')}</p>
        </div>

        <div className="seg w-full mt-6" role="tablist" aria-label={t('auth.login')}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} role="tab" aria-selected={mode === m} aria-pressed={mode === m} className="seg-btn flex-1 justify-center"
              onClick={() => { setMode(m); setErrors({}); }}>
              {t(m === 'login' ? 'auth.login' : 'auth.signup')}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          {mode === 'signup' && (
            <div>
              <label className="lbl" htmlFor="name">{t('auth.name')} ({t('common.optional')})</label>
              <input id="name" className="input" value={name} onChange={e => setName(e.target.value)} maxLength={60} autoComplete="nickname" />
            </div>
          )}
          <div>
            <label className="lbl" htmlFor="email">{t('auth.email')}</label>
            <input id="email" type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required aria-invalid={!!errors.email} />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
          <div>
            <label className="lbl" htmlFor="password">{t('auth.password')}</label>
            <div className="relative">
              <input id="password" type={showPw ? 'text' : 'password'} className="input pe-11" value={password}
                onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required aria-invalid={!!errors.password} />
              <button type="button" className="absolute end-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100" onClick={() => setShowPw(s => !s)} aria-label={t(showPw ? 'auth.hidePw' : 'auth.showPw')} aria-pressed={showPw}>
                <IEye size={17} />
              </button>
            </div>
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>
          {mode === 'signup' && (
            <div>
              <label className="lbl" htmlFor="confirm">{t('auth.confirm')}</label>
              <input id="confirm" type={showPw ? 'text' : 'password'} className="input" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required aria-invalid={!!errors.confirm} />
              {errors.confirm && <p className="field-error">{errors.confirm}</p>}
            </div>
          )}
          {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy && <ISpinner size={16} />} {t(mode === 'login' ? 'auth.login' : 'auth.signup')}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-3 text-center">
            <Link href="/reset-password" className="text-[13px] hover:underline" style={{ color: 'var(--color-cy)' }}>{t('auth.forgot')}</Link>
          </div>
        )}

        <div className="flex items-center gap-3 my-5">
          <div className="divider flex-1" /><span className="text-[11px]" style={{ color: '#5f6f8d' }}>{t('auth.or')}</span><div className="divider flex-1" />
        </div>

        <button className="btn btn-ghost w-full" onClick={() => setGoogleInfo(v => !v)} aria-expanded={googleInfo}>
          <IGoogle size={16} /> {t('auth.google')}
        </button>
        {googleInfo && (
          <div className="mt-3 flex gap-2 rounded-xl border p-3 text-[12px] leading-relaxed rise" style={{ borderColor: 'rgba(245,184,92,0.4)', background: 'rgba(245,184,92,0.06)', color: 'var(--color-dim)' }} role="status">
            <IInfo size={15} className="shrink-0 mt-0.5 text-[#F5B85C]" />
            {t('auth.googleBlocked')}
          </div>
        )}

        <button className="btn btn-ghost w-full mt-3" onClick={continueAsGuest}>
          {t('auth.guest')}
        </button>
        <p className="mt-2 text-center text-[11.5px] leading-relaxed" style={{ color: '#5f6f8d' }}>{t('auth.guestNote')}</p>

        <p className="mt-6 text-center text-[13px]" style={{ color: 'var(--color-dim)' }}>
          {t(mode === 'login' ? 'auth.noAccount' : 'auth.haveAccount')}{' '}
          <button className="font-semibold hover:underline" style={{ color: 'var(--color-cy)' }} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErrors({}); }}>
            {t(mode === 'login' ? 'auth.signup' : 'auth.login')}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-x py-24 text-center"><ISpinner size={28} className="inline-block" /></div>}>
      <LoginForm />
    </Suspense>
  );
}