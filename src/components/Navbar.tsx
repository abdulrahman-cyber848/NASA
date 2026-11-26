'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/state/app';
import { Logo, IMenu, IX, IUser, IChevronR } from './icons';

const LINKS = [
  { href: '/', key: 'nav.guide' },
  { href: '/explorer', key: 'nav.explorer' },
  { href: '/calendar', key: 'nav.calendar' },
  { href: '/learn', key: 'nav.learn' },
  { href: '/environment/spacesuit', key: 'nav.environment' },
];

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/'
    : href.startsWith('/environment') ? pathname.startsWith('/environment')
      : pathname.startsWith(href);

export default function Navbar() {
  const { t, prefs, setPrefs, user, logout, authLoading, pushToast } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMobile(false); setMenu(false); }, [pathname]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const doLogout = async () => {
    await logout();
    pushToast('info', t('auth.loggedOut'));
    router.push('/');
  };

  const switchers = (
    <div className="flex items-center gap-2">
      <button
        className="btn btn-ghost btn-sm"
        aria-label={t('a11y.langSwitch')}
        onClick={() => setPrefs({ lang: prefs.lang === 'en' ? 'ar' : 'en' })}
      >
        {prefs.lang === 'en' ? 'عربي' : 'EN'}
      </button>
      <div className="seg" role="group" aria-label={t('a11y.units')}>
        {(['km', 'mi'] as const).map(u => (
          <button key={u} className="seg-btn" aria-pressed={prefs.units === u} onClick={() => setPrefs({ units: u })}>
            {u === 'km' ? t('common.km') : t('common.mi')}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b" style={{ borderColor: 'var(--line)', background: 'rgba(8,14,27,0.82)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="container-x flex h-16 items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="LunaNav home">
          <Logo size={30} />
          <span className="h-display text-[17px] font-700 font-bold tracking-[0.14em]">LunaNav</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 ms-4" aria-label="Main">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} className="nav-link" aria-current={isActive(pathname, l.href) ? 'page' : undefined}>
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto hidden md:flex items-center gap-3">
          {switchers}
          {authLoading ? (
            <div className="h-9 w-20 rounded-xl animate-pulse" style={{ background: 'rgba(107,141,255,0.12)' }} />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button className="btn btn-ghost btn-sm" onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-haspopup="menu">
                <IUser size={15} />
                <span className="max-w-[120px] truncate">{user.email.split('@')[0]}</span>
              </button>
              {menu && (
                <div className="glass-deep absolute end-0 top-[calc(100%+8px)] w-52 p-1.5 shadow-2xl" role="menu">
                  <Link href="/workspace" role="menuitem" className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-[rgba(107,141,255,0.1)]">
                    {t('nav.workspace')} <IChevronR size={14} className="rtl:rotate-180" />
                  </Link>
                  <button role="menuitem" onClick={doLogout} className="w-full text-start rounded-lg px-3 py-2.5 text-sm text-[#FCA5A5] hover:bg-[rgba(248,113,113,0.08)]">
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">{t('nav.login')}</Link>
          )}
        </div>

        <button className="btn btn-ghost btn-icon ms-auto md:ms-2 lg:hidden" onClick={() => setMobile(m => !m)} aria-expanded={mobile} aria-label={t('nav.menu')}>
          {mobile ? <IX size={18} /> : <IMenu size={18} />}
        </button>
      </div>

      {mobile && (
        <div className="lg:hidden border-t px-4 py-4 flex flex-col gap-2" style={{ borderColor: 'var(--line)', background: 'rgba(8,14,27,0.97)' }}>
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} className="nav-link text-base py-3" aria-current={isActive(pathname, l.href) ? 'page' : undefined}>
              {t(l.key)}
            </Link>
          ))}
          <div className="divider my-2" />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {switchers}
            {user ? (
              <div className="flex gap-2">
                <Link href="/workspace" className="btn btn-ghost btn-sm">{t('nav.workspace')}</Link>
                <button className="btn btn-danger btn-sm" onClick={doLogout}>{t('nav.logout')}</button>
              </div>
            ) : (
              <Link href="/login" className="btn btn-primary btn-sm">{t('nav.login')}</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
