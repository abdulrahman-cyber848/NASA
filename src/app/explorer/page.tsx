'use client';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp, useMounted } from '@/state/app';
import { PageSkeleton, Seg } from '@/components/ui';
import { ALL_SITES, ORIGINAL_SITES, SITE_STATS, SITE_TYPE_ORDER, siteById, type SiteType } from '@/data/sites';
import { ISearch } from '@/components/icons';
import { siteGazetteerUrl } from '@/components/LandmarkDetail';
import { getMoonSnapshot } from '@/services/astro';
import { evaluateLandmarks } from '@/services/visibility';
import { surfaceVector } from '@/services/astro';
import { landmarkById } from '@/data/landmarks';
import { fmtDate } from '@/services/time';
import type { ExplorerSettings, FlyTarget } from '@/components/ExplorerScene';
import LandmarkDetail from '@/components/LandmarkDetail';
import MoonMap from '@/components/MoonMap';
import { ISpinner, IReset, ICube, IInfo } from '@/components/icons';
import { fmtNum } from '@/services/format';

const ExplorerScene = dynamic(() => import('@/components/ExplorerScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[380px] flex-col items-center justify-center gap-3">
      <ISpinner size={30} />
      <LoadingLabel />
    </div>
  ),
});

function LoadingLabel() {
  const { t } = useApp();
  return <p className="text-sm" style={{ color: 'var(--color-dim)' }}>{t('ex.loading3d')}</p>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className="flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors"
      style={{ borderColor: value ? 'rgba(83,216,232,0.5)' : 'var(--line)', background: value ? 'rgba(83,216,232,0.08)' : 'rgba(8,14,27,0.5)' }}
      aria-pressed={value}
      onClick={() => onChange(!value)}
    >
      {label}
      <span className="relative inline-block h-5 w-9 rounded-full transition-colors" style={{ background: value ? 'linear-gradient(90deg,#53D8E8,#6B8DFF)' : '#243350' }} aria-hidden>
        <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ insetInlineStart: value ? '18px' : '2px' }} />
      </span>
    </button>
  );
}

const TYPE_CHIP: Record<string, string> = {
  crater: 'chip-amber', mare: 'chip-cy', basin: 'chip-cy', mountain: 'chip-bl',
  highlands: 'chip-bl', valley: 'chip', rille: 'chip', scarp: 'chip',
  dome: 'chip-ok', landing: 'chip-danger',
};

/** Telescope atlas: the full lunar site collection with type filters and search. */
function TelescopeAtlas({ selectedId, onPick, viewAll, setViewAll, evaluated }: {
  selectedId: string | null; onPick: (id: string) => void; viewAll: boolean; setViewAll: (b: boolean) => void;
  evaluated: ReturnType<typeof evaluateLandmarks>;
}) {
  const { t, lang } = useApp();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SiteType | 'all'>('all');
  const name = (s: { name: string; nameAr: string }) => (lang === 'ar' ? s.nameAr : s.name);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return evaluated
      .filter(ev => (type === 'all' ? true : ev.landmark.type === type))
      .filter(ev => (!q ? true : name(ev.landmark).toLowerCase().includes(q) || ev.landmark.id.includes(q)))
      .sort((a, b) => name(b.landmark).length - 0 || 0);
  }, [evaluated, type, query, lang]);
  const isOriginal = useMemo(() => new Set(ORIGINAL_SITES.map(s => s.id)), []);

  return (
    <section id="telescope" className="glass p-5 space-y-4 scroll-mt-32" aria-label={t('tel.title')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="h-display text-xl font-bold">{t('tel.title')}</h2>
          <p className="mt-1 max-w-2xl text-[13px]" style={{ color: 'var(--color-dim)' }}>{t('tel.sub')}</p>
        </div>
        <button
          className={`btn ${viewAll ? 'btn-primary' : 'btn-ghost'}`}
          aria-pressed={viewAll}
          onClick={() => setViewAll(!viewAll)}
        >
          <ICube size={15} /> {viewAll ? t('tel.viewAllOn') : t('tel.viewAll')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
        <span className="chip chip-cy">{t('tel.original')}: {fmtNum(SITE_STATS.original, lang)}</span>
        <span className="chip chip-bl">{t('tel.nasa')}: {fmtNum(SITE_STATS.nasaAdded, lang)}</span>
        <span className="chip">{t('sites.all')}: {fmtNum(SITE_STATS.total, lang)}</span>
        <span className="chip chip-ok">{shown.length} {t('tel.shown')}</span>
      </div>

      <div className="relative">
        <ISearch size={15} className="absolute top-1/2 -translate-y-1/2 start-3.5 opacity-60 pointer-events-none" />
        <input className="input ps-10" placeholder={t('guide.searchLandmarks')} value={query}
          aria-label={t('guide.searchLandmarks')}
          onChange={e => setQuery(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('tel.filterType')}>
        <button className="chip" aria-pressed={type === 'all'} style={type === 'all' ? { borderColor: 'rgba(83,216,232,0.6)', background: 'rgba(83,216,232,0.12)', color: '#9EE8F2' } : undefined} onClick={() => setType('all')}>
          {t('tel.all')}
        </button>
        {SITE_TYPE_ORDER.map(ty => (
          <button key={ty} className={`chip ${TYPE_CHIP[ty] ?? 'chip'}`} aria-pressed={type === ty} onClick={() => setType(type === ty ? 'all' : ty)}>
            {t(`lm.${ty}`)}
          </button>
        ))}
      </div>

      <p className="text-[11px]" style={{ color: '#5f6f8d' }}>{t('tel.viewAllHint')}</p>

      <div className="max-h-[340px] overflow-y-auto pe-1 space-y-1.5">
        {shown.length === 0 && <p className="text-sm py-6 text-center" style={{ color: 'var(--color-dim)' }}>{t('guide.noMatch')}</p>}
        {shown.map(ev => {
          const l = ev.landmark;
          return (
            <button key={l.id} onClick={() => onPick(l.id)} aria-pressed={selectedId === l.id}
              className="w-full flex flex-wrap items-center gap-2 rounded-xl border p-2.5 text-start transition-colors hover:border-[rgba(83,216,232,0.5)]"
              style={{ borderColor: selectedId === l.id ? 'rgba(83,216,232,0.6)' : 'var(--line)', background: selectedId === l.id ? 'rgba(83,216,232,0.08)' : 'rgba(8,14,27,0.45)' }}>
              <span className={`chip ${TYPE_CHIP[l.type] ?? 'chip'} shrink-0`}>{t(`lm.${l.type}`)}</span>
              <span className="font-semibold text-[13px]">{name(l)}</span>
              <span className="font-mono text-[11px] ms-auto" style={{ color: '#8b98b5' }}>
                {l.lat >= 0 ? '+' : ''}{l.lat.toFixed(1)}°, {l.lon >= 0 ? '+' : ''}{l.lon.toFixed(1)}°
              </span>
              {!isOriginal.has(l.id) && <span className="chip chip-bl shrink-0">{t('tel.nasa')}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Explorer() {
  const { t, lang, date, setDate, prefs } = useApp();
  const mounted = useMounted();
  const params = useSearchParams();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fly, setFly] = useState<FlyTarget | null>(null);
  const [glbError, setGlbError] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const nonce = useRef(0);
  const init = useRef(false);

  const [settings, setSettings] = useState<ExplorerSettings>({
    autoRotate: true, rotateSpeed: 0.6, lighting: 'phase', relief: true, exaggeration: 4,
    markers: true, labels: false, quality: 'med', model: 'sphere',
  });
  const set = useCallback(<K extends keyof ExplorerSettings>(k: K, v: ExplorerSettings[K]) => setSettings(s => ({ ...s, [k]: v })), []);

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      setWebgl(!!(c.getContext('webgl2') || c.getContext('webgl')));
    } catch { setWebgl(false); }
  }, []);

  const snap = useMemo(() => getMoonSnapshot(date), [date]);
  const evaluated = useMemo(() => evaluateLandmarks(snap, 'telescope'), [snap]);
  const recIds = useMemo(() => new Set(evaluated.filter(e => e.geoVisible && e.practicableNow).sort((a, b) => b.score - a.score).slice(0, 3).map(e => e.landmark.id)), [evaluated]);

  const flyToVec = useCallback((vec: [number, number, number]) => {
    nonce.current += 1;
    setFly({ vec, nonce: nonce.current });
  }, []);

  const flyToLandmark = useCallback((id: string) => {
    const l = siteById(id) ?? landmarkById(id);
    if (!l) return;
    setSelectedId(id);
    // stop the turntable so the camera stays on the site the user asked for
    setSettings(s => ({ ...s, autoRotate: false }));
    flyToVec(surfaceVector(l.lat, l.lon));
  }, [flyToVec]);

  // deep link ?focus=id&d=ISO
  useEffect(() => {
    if (init.current) return;
    init.current = true;
    const d = params.get('d');
    if (d) { const parsed = new Date(d); if (!isNaN(parsed.getTime())) setDate(parsed); }
    const focus = params.get('focus');
    if (focus && landmarkById(focus)) {
      setTimeout(() => flyToLandmark(focus), 900);
    }
    if (params.get('viewAll') === '1') setViewAll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = selectedId ? evaluated.find(e => e.landmark.id === selectedId) ?? null : null;
  const labelFor = useCallback((id: string) => {
    const l = siteById(id) ?? landmarkById(id);
    return l ? (lang === 'ar' ? l.nameAr : l.name) : id;
  }, [lang]);
  const typeLabel = useCallback((ty: string) => t(`lm.${ty}`), [t]);
  const siteEvaluated = useMemo(
    () => evaluateLandmarks(snap, 'telescope').filter(ev => siteById(ev.landmark.id) != null),
    [snap],
  );


  if (!mounted) return <PageSkeleton />;

  const quickViews: { key: string; vec: [number, number, number] }[] = [
    { key: 'ex.nearSide', vec: snap.earthBody },
    { key: 'ex.farSide', vec: [-snap.earthBody[0], -snap.earthBody[1], -snap.earthBody[2]] },
    { key: 'ex.northPole', vec: [0.02, 0, 1] },
    { key: 'ex.southPole', vec: [0.02, 0, -1] },
  ];

  return (
    <div className="container-x py-8 space-y-5">
      <header className="rise">
        <p className="eyebrow">{t('brand.tag')}</p>
        <h1 className="h-display mt-1 text-3xl sm:text-4xl font-bold">{t('ex.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--color-dim)' }}>{t('ex.subtitle')}</p>
      </header>

      <TelescopeAtlas
        selectedId={selectedId}
        onPick={id => { setSelectedId(id); flyToLandmark(id); }}
        viewAll={viewAll}
        setViewAll={setViewAll}
        evaluated={siteEvaluated}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_330px] items-start">
        {/* viewport */}
        <div className="glass overflow-hidden rise relative xl:sticky xl:top-20" style={{ height: 'min(72vh, 680px)', minHeight: 380 }}>
          {webgl === null ? (
            <div className="flex h-full items-center justify-center"><ISpinner size={28} /></div>
          ) : webgl ? (
            <ExplorerScene
              snap={snap}
              evaluated={evaluated}
              selectedId={selectedId}
              onSelect={setSelectedId}
              settings={settings}
              fly={fly}
              labelFor={labelFor}
              viewAll={viewAll}
              sites={siteEvaluated}
              typeLabel={typeLabel}
              onGlbError={() => { setGlbError(true); set('model', 'sphere'); }}
            />
          ) : (
            <div className="h-full overflow-y-auto p-4">
              <p className="chip chip-danger mb-2">{t('ex.noWebgl')}</p>
              <p className="text-sm mb-3" style={{ color: 'var(--color-dim)' }}>{t('ex.fallbackNote')}</p>
              <MoonMap snap={snap} evaluated={evaluated} recommendedIds={recIds} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          )}
          <div className="pointer-events-none absolute top-3 start-3 flex flex-col gap-1.5 items-start">
            <span className="chip chip-bl">{t('ex.sunAtDate', { d: fmtDate(date, 'UTC', lang) })} UTC</span>
            {settings.lighting === 'phase' && <span className="chip">{t('ex.earthshine')}</span>}
            {settings.model === 'glb' && <span className="chip max-w-[300px] whitespace-normal text-start">{t('ex.glbNote')}</span>}
            {glbError && <span className="chip chip-danger">{t('ex.glbError')}</span>}
          </div>
          <span className="pointer-events-none absolute bottom-3 start-3 chip max-w-[85%]">{t('ex.nearSideOnly')}</span>
        </div>

        {/* permanently visible control region */}
        <aside className="space-y-4 rise" style={{ animationDelay: '80ms' }} aria-label={t('ex.controls')}>
          <div className="glass p-4 space-y-3.5">
            <h2 className="h-display font-bold flex items-center gap-2"><ICube size={17} /> {t('ex.controls')}</h2>

            <div>
              <label className="lbl" htmlFor="fly-select">{t('ex.searchFeature')}</label>
              <select id="fly-select" className="input" value={selectedId ?? ''} onChange={e => e.target.value && flyToLandmark(e.target.value)}>
                <option value="" disabled>—</option>
                {evaluated.map(ev => (
                  <option key={ev.landmark.id} value={ev.landmark.id}>{labelFor(ev.landmark.id)}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="lbl">{t('ex.quickViews')}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {quickViews.map(q => (
                  <button key={q.key} className="btn btn-ghost btn-sm" onClick={() => flyToVec(q.vec)}>{t(q.key)}</button>
                ))}
              </div>
            </div>

            <Toggle label={t('ex.autoRotate')} value={settings.autoRotate} onChange={v => set('autoRotate', v)} />
            <div>
              <label className="lbl" htmlFor="rot-speed">{t('ex.rotateSpeed')} · {settings.rotateSpeed.toFixed(1)}</label>
              <input id="rot-speed" type="range" min={0.2} max={3} step={0.1} value={settings.rotateSpeed} className="w-full" onChange={e => set('rotateSpeed', Number(e.target.value))} />
            </div>

            <div>
              <p className="lbl">{t('ex.lighting')}</p>
              <Seg label={t('ex.lighting')} value={settings.lighting} onChange={v => set('lighting', v)} options={[
                { value: 'phase' as const, label: t('ex.sunPhase') },
                { value: 'uniform' as const, label: t('ex.uniform') },
              ]} />
            </div>

            <Toggle label={t('ex.relief')} value={settings.relief} onChange={v => set('relief', v)} />
            <div className={settings.relief ? '' : 'opacity-45 pointer-events-none'}>
              <label className="lbl" htmlFor="exagg">{t('ex.exaggeration')} · ×{settings.exaggeration}</label>
              <input id="exagg" type="range" min={1} max={10} step={1} value={settings.exaggeration} className="w-full" onChange={e => set('exaggeration', Number(e.target.value))} disabled={!settings.relief} />
              <p className="text-[10.5px] mt-1 leading-relaxed" style={{ color: '#5f6f8d' }}>{t('ex.reliefNote', { x: settings.exaggeration })}</p>
            </div>

            <Toggle label={t('ex.markers')} value={settings.markers} onChange={v => set('markers', v)} />
            <Toggle label={t('ex.labels')} value={settings.labels} onChange={v => set('labels', v)} />

            <div>
              <p className="lbl">{t('ex.quality')}</p>
              <Seg label={t('ex.quality')} value={settings.quality} onChange={v => set('quality', v)} options={[
                { value: 'low' as const, label: t('ex.qLow') },
                { value: 'med' as const, label: t('ex.qMed') },
                { value: 'high' as const, label: t('ex.qHigh') },
              ]} />
            </div>

            <div>
              <p className="lbl">{t('ex.model')}</p>
              <div className="flex flex-col gap-1.5">
                <button className="btn btn-ghost btn-sm justify-start" aria-pressed={settings.model === 'sphere'} style={settings.model === 'sphere' ? { borderColor: 'rgba(83,216,232,0.55)', background: 'rgba(83,216,232,0.08)' } : undefined} onClick={() => set('model', 'sphere')}>
                  {t('ex.sphere')}
                </button>
                <button className="btn btn-ghost btn-sm justify-start" aria-pressed={settings.model === 'glb'} style={settings.model === 'glb' ? { borderColor: 'rgba(83,216,232,0.55)', background: 'rgba(83,216,232,0.08)' } : undefined} onClick={() => set('model', 'glb')} disabled={prefs === undefined}>
                  {t('ex.glb')}
                </button>
              </div>
            </div>

            <button className="btn btn-primary w-full" onClick={() => { flyToVec(snap.earthBody); }}>
              <IReset size={15} /> {t('ex.resetView')}
            </button>
          </div>

          <div className="glass p-3.5 flex gap-2">
            <IInfo size={15} className="shrink-0 mt-0.5 opacity-70" />
            <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t('ex.nearSideOnly')}</p>
          </div>

          {selected && <LandmarkDetail item={selected} snap={snap} onClose={() => setSelectedId(null)} />}
        </aside>
      </div>
    </div>
  );
}

export default function ExplorerPage() {
  return (
    <Suspense fallback={<div className="container-x py-24 text-center"><ISpinner size={28} className="inline-block" /></div>}>
      <Explorer />
    </Suspense>
  );
}