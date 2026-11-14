'use client';
import { useEffect, useState } from 'react';
import { useApp, useMounted } from '@/state/app';
import { PageSkeleton, Seg } from '@/components/ui';
import { ISpinner, IInfo } from '@/components/icons';
import { EnvTabs, EnvAnchors, EnvSources } from '@/components/environment/EnvChrome';
import { CONF_STYLE } from '@/features/spacesuit/components/SuitLabConf';
import PhysicsDemos from '@/components/environment/PhysicsDemos';
import dynamic from 'next/dynamic';

const SuitLab = dynamic(() => import('@/features/spacesuit/components/SuitLab'), {
  ssr: false,
  loading: () => (
    <div className="glass flex h-[70vh] min-h-[360px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <ISpinner size={30} />
        <p className="text-sm" style={{ color: 'var(--color-dim)' }}>Preparing the 3D reconstruction…</p>
      </div>
    </div>
  ),
});

export default function SpacesuitPage() {
  const { t, lang } = useApp();
  const mounted = useMounted();
  const [tab, setTab] = useState<'lab' | 'physics'>('lab');
  const L = (en: string, ar: string) => (lang === 'ar' ? ar : en);

  useEffect(() => { if (mounted) window.scrollTo({ top: 0 }); }, [mounted]);
  if (!mounted) return <PageSkeleton />;

  return (
    <div className="container-x py-8 space-y-6">
      <header className="rise">
        <p className="eyebrow">{t('env.lab')}</p>
        <h1 className="h-display mt-1 text-3xl sm:text-4xl font-bold">
          {L('Spacesuit Engineering Lab', 'مختبر هندسة بدلات الفضاء')}
        </h1>
        <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--color-dim)' }}>
          {L(
            'Explore the original Smithsonian scan of Neil Armstrong\'s Apollo A7-L spacesuit: five inspection modes, spatially anchored annotations, guided tours, cross-section cuts and a dust-exposure simulation.',
            'استكشف مسح سميثسونيان الأصلي لبدلة نيل أرمسترونغ أبولو A7-L: خمسة أوضاع فحص، تعليقات مثبتة مكانيًا، جولات إرشادية، مقاطع عرضية، ومحاكاة التعرض للغبار.',
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <EnvTabs />
          <div className="flex flex-wrap gap-1.5">
            {(['official', 'reconstruction', 'generic', 'undisclosed'] as const).map(k => (
              <span key={k} className={`chip ${CONF_STYLE[k].c} !text-[10px]`}>{CONF_STYLE[k][lang]}</span>
            ))}
          </div>
        </div>

        <p className="mt-3 flex gap-2 rounded-xl border p-3 text-[11.5px] leading-relaxed"
          style={{ borderColor: 'rgba(245,184,92,0.35)', background: 'rgba(245,184,92,0.05)', color: 'var(--color-dim)' }}>
          <IInfo size={15} className="shrink-0 mt-0.5 text-[#F5B85C]" />
          {L(
            'All five modes retain the same original Smithsonian Armstrong A7-L scan, digitized by the Smithsonian DPO and National Air and Space Museum. The scan is a single merged surface: Internal and Exploded modes cannot reveal authentic hidden geometry or separate real assemblies. The cross-section clips that same surface only. This artifact is an Apollo A7-L — not an AxEMU, Z-2 or ISS EMU. Smithsonian Terms of Use apply; no endorsement is implied.',
            'تحافظ الأوضاع الخمسة على مسح سميثسونيان الأصلي لبدلة أرمسترونغ A7-L، الذي رقمنه مكتب الرقمنة سميثسونيان والمتحف الوطني للطيران والفضاء. المسح سطح مدمج واحد: لا يمكن للوضعين الداخلي والمفكك إظهار هندسة داخلية أصلية أو فصل تجميعات حقيقية. يقتصر المقطع العرضي على قص السطح نفسه. هذه القطعة بدلة أبولو A7-L — وليست AxEMU ولا Z-2 ولا EMU. تنطبق شروط استخدام سميثسونيان؛ ولا يوجد أي ادعاء بموافقتها.',
          )}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Seg label={L('Section', 'القسم')} value={tab} onChange={setTab} options={[
          { value: 'lab' as const, label: L('3D Suit Lab', 'مختبر البدلة ثلاثي الأبعاد') },
          { value: 'physics' as const, label: t('env.physics.title') },
        ]} />
      </div>

      {tab === 'lab' ? (
        <SuitLab />
      ) : (
        <section className="glass p-6 space-y-4 rise">
          <div>
            <h2 className="h-display text-xl font-bold">{t('env.physics.title')}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-dim)' }}>{t('env.physics.sub')}</p>
          </div>
          <PhysicsDemos />
        </section>
      )}

      <EnvAnchors items={[{ id: 'physics', key: 'env.nav.physics' }]} />


      <EnvSources />
    </div>
  );
}
