'use client';
import { useApp } from '@/state/app';
import { Logo } from './icons';
import { AllSources } from './SourceLinks';

export default function Footer() {
  const { t } = useApp();
  return (
    <footer className="relative z-10 mt-16 border-t" style={{ borderColor: 'var(--line)', background: 'rgba(8,14,27,0.6)' }}>
      <div className="container-x py-8 flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Logo size={22} />
          <span className="h-display text-sm font-bold tracking-[0.14em]">LunaNav</span>
          <span className="text-xs" style={{ color: 'var(--color-dim)' }}>· {t('brand.tag')}</span>
        </div>
        <p className="text-[12.5px] leading-relaxed max-w-3xl" style={{ color: 'var(--color-dim)' }}>
          {t('footer.disclaimer')}
        </p>
        <AllSources />
      </div>
    </footer>
  );
}