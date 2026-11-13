'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp, useMounted } from '@/state/app';
import { getMoonSnapshot } from '@/services/astro';
import { evaluateLandmarks, filterLandmarks, type SitesMode } from '@/services/visibility';
import DateControls from '@/components/DateControls';
import MoonMap from '@/components/MoonMap';
import LandmarkDetail from '@/components/LandmarkDetail';
import WhatYouSee from '@/components/WhatYouSee';
import YourView from '@/components/YourView';
import ChartsPanel from '@/components/ChartsPanel';
import { Seg, EmptyState, PageSkeleton } from '@/components/ui';
import AuthGate from '@/components/AuthGate';
import Link from 'next/link';
import { ICube } from '@/components/icons';
import { IEye, IBino, IScope, ISpinner } from '@/components/icons';
import type { Equipment } from '@/data/landmarks';

function Guide() {
  const { t, date, setDate, prefs, setPrefs } = useApp();
  const mounted = useMounted();
  const params = useSearchParams();
  const [mode, setMode] = useState<SitesMode>('recommended');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const urlInit = useRef(false);

  // deep link ?d=ISO (from calendar / workspace / explorer)
  useEffect(() => {
    if (urlInit.current) return;
    urlInit.current = true;
    const d = params.get('d');
    if (d) {
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) setDate(parsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep URL shareable without router churn
  useEffect(() => {
    if (!urlInit.current) return;
    const u = new URL(window.location.href);
    u.searchParams.set('d', date.toISOString());
    window.history.replaceState(null, '', u.toString());
  }, [date]);

  const snap = useMemo(() => {
    try { return getMoonSnapshot(date); } catch (e) { console.error('snapshot failed', e); return null; }
  }, [date]);

  const evaluated = useMemo(() => snap ? evaluateLandmarks(snap, prefs.equipment) : [], [snap, prefs.equipment]);
  const recommended = useMemo(() => filterLandmarks(evaluated, prefs.equipment, 'recommended'), [evaluated, prefs.equipment]);
  const recIds = useMemo(() => new Set(recommended.map(r => r.landmark.id)), [recommended]);
  const items = useMemo(() => filterLandmarks(evaluated, prefs.equipment, mode), [evaluated, prefs.equipment, mode]);
  const selected = selectedId ? evaluated.find(e => e.landmark.id === selectedId) ?? null : null;

  if (!mounted) return <PageSkeleton />;
  if (!snap) {
    return (
      <div className="container-x py-16">
        <EmptyState icon="⚠️" title={t('common.error')} body="astronomy-engine" />
        <div className="text-center">
          <button className="btn btn-primary" onClick={() => setDate(new Date())}>{t('common.retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8 space-y-6">
      <header className="rise">
        <p className="eyebrow">{t('brand.tag')}</p>
        <h1 className="h-display mt-1 text-3xl sm:text-4xl font-bold">{t('guide.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-[15px]" style={{ color: 'var(--color-dim)' }}>{t('guide.subtitle')}</p>
      </header>

      <div className="rise" style={{ animationDelay: '60ms' }}>
        <DateControls />
      </div>

      {/* observation controls */}
      <div className="glass p-4 flex flex-wrap gap-x-8 gap-y-4 rise" style={{ animationDelay: '100ms' }}>
        <div>
          <p className="lbl">{t('guide.observingWith')}</p>
          <Seg<Equipment>
            label={t('guide.observingWith')}
            value={prefs.equipment}
            onChange={v => setPrefs({ equipment: v })}
            options={[
              { value: 'eye', label: t('equip.eye'), icon: <IEye size={14} /> },
              { value: 'binoculars', label: t('equip.binoculars'), icon: <IBino size={14} /> },
              { value: 'telescope', label: t('equip.telescope'), icon: <IScope size={14} /> },
            ]}
          />
        </div>
        <div>
          <p className="lbl">{t('guide.hemisphere')}</p>
          <Seg
            label={t('guide.hemisphere')}
            value={prefs.hemisphere}
            onChange={v => setPrefs({ hemisphere: v })}
            options={[
              { value: 'north', label: t('hemi.north') },
              { value: 'south', label: t('hemi.south') },
            ]}
          />
        </div>
        <div>
          <p className="lbl">{t('guide.sites')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Seg<SitesMode>
              label={t('guide.sites')}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'recommended', label: t('sites.recommended') },
                { value: 'all', label: t('sites.all') },
              ]}
            />
            <Link href={`/explorer?viewAll=1&d=${encodeURIComponent(date.toISOString())}`} className="btn btn-ghost btn-sm">
              <ICube size={14} /> {t('tel.viewAll')}
            </Link>
          </div>
        </div>
      </div>

      <p className="-mt-3 flex items-center gap-2 text-[11px]" style={{ color: '#5f6f8d' }}>
        <ICube size={12} /> {t('tel.sub')}
      </p>

      {/* hero: the Moon */}
      <div className="grid gap-6 lg:grid-cols-[1.12fr_1fr] items-start">
        <div className="rise lg:sticky lg:top-20" style={{ animationDelay: '140ms' }}>
          <MoonMap
            snap={snap}
            evaluated={evaluated}
            recommendedIds={recIds}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <div className="space-y-4 rise" style={{ animationDelay: '180ms' }}>
          <WhatYouSee
            items={items}
            anyGeoVisible={evaluated.some(e => e.geoVisible)}
            mode={mode}
            selectedId={selectedId}
            onSelect={id => setSelectedId(prev => (prev === id ? null : id))}
            date={date}
          />
          {selected && <LandmarkDetail item={selected} snap={snap} onClose={() => setSelectedId(null)} />}
        </div>
      </div>

      <div className="rise" style={{ animationDelay: '220ms' }}>
        <YourView snap={snap} />
      </div>
      <div className="rise" style={{ animationDelay: '260ms' }}>
        <ChartsPanel date={date} />
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <Suspense fallback={<div className="container-x py-24 text-center"><ISpinner size={28} className="inline-block" /></div>}>
      <AuthGate>
        <Guide />
      </AuthGate>
    </Suspense>
  );
}