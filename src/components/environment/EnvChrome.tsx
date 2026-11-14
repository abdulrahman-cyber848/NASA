'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/state/app';
import { ENV_SOURCES } from '@/data/environment/sources';
import { AllSources } from '@/components/SourceLinks';
import { IInfo } from '@/components/icons';

export function EnvTabs() {
  const { t } = useApp();
  const path = usePathname();
  const tabs = [
    { href: '/environment/spacesuit', key: 'env.tab.suit' },
  ];
  return (
    <div className="seg" role="tablist" aria-label={t('env.lab')}>
      {tabs.map(tb => (
        <Link key={tb.href} href={tb.href} role="tab" aria-selected={path === tb.href} className="seg-btn" aria-pressed={path === tb.href}>
          {t(tb.key)}
        </Link>
      ))}
    </div>
  );
}

export function EnvAnchors({ items }: { items: { id: string; key: string }[] }) {
  const { t } = useApp();
  return (
    <nav className="sticky top-16 z-30 -mx-1 px-1 py-2 flex gap-1.5 overflow-x-auto" style={{ background: 'rgba(8,14,27,0.85)', backdropFilter: 'blur(12px)' }} aria-label={t('env.lab')}>
      {items.map(a => (
        <a key={a.id} href={`#${a.id}`} className="chip shrink-0 hover:border-[rgba(83,216,232,0.5)]">{t(a.key)}</a>
      ))}
    </nav>
  );
}

export function EnvDisclaimer() {
  const { t } = useApp();
  return (
    <p className="flex gap-2 rounded-xl border p-3 text-[11.5px] leading-relaxed" style={{ borderColor: 'rgba(245,184,92,0.35)', background: 'rgba(245,184,92,0.05)', color: 'var(--color-dim)' }}>
      <IInfo size={15} className="shrink-0 mt-0.5 text-[#F5B85C]" /> {t('env.disclaimer')}
    </p>
  );
}

export function EnvSources() {
  const { t } = useApp();
  return (
    <section className="glass p-5 space-y-3" aria-label={t('refs.title')}>
      <h2 className="h-display text-lg font-bold">{t('refs.title')}</h2>
      <ul className="space-y-1.5">
        {ENV_SOURCES.map(s => (
          <li key={s.id} className="text-[12.5px]">
            <a className="ref-link" href={s.url} target="_blank" rel="noopener noreferrer">{s.label} ↗</a>
            <span style={{ color: '#5f6f8d' }}> — {s.publisher}</span>
          </li>
        ))}
      </ul>
      <div className="divider" />
      <AllSources compact />
      <p className="text-[10.5px]" style={{ color: '#5f6f8d' }}>{t('refs.newTab')}</p>
    </section>
  );
}
