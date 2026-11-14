'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useApp } from '@/state/app';
import { COMPONENTS, ASSEMBLIES, compById, srcById } from '../data/axemu';
import { MODES, SCAN_ANNOTATIONS, type Mode } from '../data/annotations';
import { TOURS } from '../data/tours';
import { explain, answer } from '../data/learning';
import { ISearch, IEye, IX, IExternal, IPlay, IPause, IReset, ICrosshair, ICube, ISpinner } from '@/components/icons';
import { CONF_STYLE } from './SuitLabConf';
import { useSmithsonianAvailability, SI_MODEL_PAGE, SI_TERMS, SI_ATTRIBUTION } from './SmithsonianModel';
import { useUserModel, ModelDropZone } from './UserModel';

type View = 'front' | 'back' | 'left' | 'top';
const L = (lang: 'en' | 'ar', en: string, ar: string) => (lang === 'ar' ? ar : en);

export default function SuitLab() {
  const { t, lang } = useApp();
  const [mode, setMode] = useState<Mode>('external');
  const [selected, setSelected] = useState<string | null>('helmet-visor');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [isolated, setIsolated] = useState<string | null>(null);
  const [xray, setXray] = useState(0);
  const [explode, setExplode] = useState(0.75);
  const [section, setSection] = useState(0.35);
  const [sectionOn, setSectionOn] = useState(false);
  const [labels, setLabels] = useState(true);
  const [showAnn, setShowAnn] = useState(true);
  const [measure, setMeasure] = useState(false);
  const [measured, setMeasured] = useState<number | null>(null);
  // CAD-style: the model stays still so annotations and measurements are readable.
  // Auto-rotate remains available as an explicit opt-in.
  const [autoRotate, setAutoRotate] = useState(false);
  // Load the real Smithsonian Armstrong A7L scan when the asset is present.
  // The lab falls back to the labeled reconstruction — never to another suit.
  const [siModel, setSiModel] = useState(true);
  const userModel = useUserModel();
  const [quality, setQuality] = useState<'low' | 'med' | 'high'>('med');
  const [view, setView] = useState<{ v: View; n: number } | null>(null);
  const [dustRate, setDustRate] = useState(0.7);
  const [zoneHits, setZoneHits] = useState<Record<string, number>>({});
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const [tour, setTour] = useState<{ id: string; i: number; playing: boolean } | null>(null);
  const [query, setQuery] = useState('');
  const [fly, setFly] = useState<{ cam: [number, number, number]; n: number } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const L3 = (en: string, ar: string) => L(lang, en, ar);
  const labelFor = useCallback((id: string) => compById(id)?.name[lang] ?? id, [lang]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    try { const c = document.createElement('canvas'); setWebgl(!!(c.getContext('webgl2') || c.getContext('webgl'))); }
    catch { setWebgl(false); }
  }, []);

  // guided tour stepper (Voyager-style narration + camera)
  const activeTour = tour ? TOURS.find(x => x.id === tour.id) : null;
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!tour?.playing || !activeTour) return;
    timer.current = setInterval(() => {
      setTour(t => {
        if (!t) return t;
        if (t.i + 1 >= activeTour.steps.length) return { ...t, playing: false };
        return { ...t, i: t.i + 1 };
      });
    }, 7000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [tour?.playing, tour?.id, activeTour]);

  const gotoStep = (id: string, i: number) => {
    const tt = TOURS.find(x => x.id === id);
    if (!tt) return;
    const step = tt.steps[i];
    setMode(tt.mode);
    setSelected(step.component);
    setFly(f => ({ cam: step.camera, n: (f?.n ?? 0) + 1 }));
  };
  useEffect(() => { if (tour) gotoStep(tour.id, tour.i); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tour?.id, tour?.i]);

  const setModeSafe = (m: Mode) => {
    setMode(m);
    setAutoRotate(false);
    if (m === 'dust') setZoneHits({});
    if (m !== 'cross') setSectionOn(false);
    if (m === 'exploded') setExplode(x => (x < 0.2 ? 0.75 : x));
    setTour(null);
  };
  const onZoneHit = useCallback((z: string) => setZoneHits(prev => ({ ...prev, [z]: (prev[z] ?? 0) + 1 })), []);
  const siInfo = useSmithsonianAvailability();
  const scanOnScreen = siInfo.available && siModel && !userModel.url;
  const comp = selected ? compById(selected) : null;
  const toggleHidden = (id: string) => setHidden(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const topZone = useMemo(() => Object.entries(zoneHits).sort((a, b) => b[1] - a[1])[0]?.[0], [zoneHits]);
  const maxHit = useMemo(() => Math.max(1, ...Object.values(zoneHits)), [zoneHits]);

  return (
    <div className="space-y-3">
      {/* ---------- mode bar ---------- */}
      <div className="glass p-3 flex flex-wrap items-center gap-2">
        <span className="eyebrow">{L3('Viewing mode', 'وضع الفحص')}</span>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={L3('Viewing mode', 'وضع الفحص')}>
          {MODES.map(m => (
            <button key={m.id} role="tab" aria-selected={mode === m.id} className="chip"
              style={mode === m.id ? { borderColor: 'rgba(83,216,232,0.65)', background: 'rgba(83,216,232,0.13)', color: '#9EE8F2' } : undefined}
              onClick={() => setModeSafe(m.id)}>
              {m.label[lang]}
            </button>
          ))}
        </div>
        <span className="text-[11px] ms-auto" style={{ color: 'var(--color-dim)' }}>{MODES.find(m => m.id === mode)?.hint[lang]}</span>
      </div>

      {/* ---------- CAD layout: tree | viewport | dossier ---------- */}
      <div className="grid gap-3 xl:grid-cols-[268px_1fr_326px]">
        {/* LEFT — hierarchical component tree */}
        <aside className="glass p-3 space-y-3 order-2 xl:order-1" aria-label={L3('Component tree', 'شجرة المكونات')}>
          <div className="relative">
            <ISearch size={14} className="absolute top-1/2 -translate-y-1/2 start-3 opacity-60 pointer-events-none" />
            <input className="input ps-9 !py-2 text-[12.5px]" placeholder={L3('Search parts…', 'ابحث في الأجزاء…')} value={query}
              aria-label={L3('Search parts', 'ابحث في الأجزاء')} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="max-h-[330px] overflow-y-auto pe-1 space-y-1">
            {scanOnScreen ? (
              <>
                <p className="px-2 pt-1 text-[10.5px] leading-relaxed" style={{ color: '#5f6f8d' }}>
                  {L3('Regions of the scanned A7-L. The scan is one merged surface, so these are spatial regions — not separable CAD parts.',
                      'مناطق من بدلة A7-L الممسوحة. المسح سطح واحد مدمج، لذا هذه مناطق مكانية — وليست أجزاء CAD قابلة للفصل.')}
                </p>
                {SCAN_ANNOTATIONS
                  .filter(a => !query.trim() || a.title[lang].toLowerCase().includes(query.toLowerCase()))
                  .map(a => (
                    <button key={a.id} onClick={() => setSelected(a.component)}
                      className="w-full rounded-lg px-2 py-1.5 text-start text-[12px] transition-colors"
                      aria-pressed={selected === a.component}
                      style={{ background: selected === a.component ? 'rgba(83,216,232,0.12)' : undefined,
                               color: selected === a.component ? '#9EE8F2' : 'var(--color-dim)' }}>
                      {a.title[lang]}
                    </button>
                  ))}
              </>
            ) : (
              <TreeBody query={query} selected={selected} onSelect={setSelected} hidden={hidden} onToggleHidden={toggleHidden}
                isolated={isolated} onIsolate={setIsolated} />
            )}
          </div>
          <div className="divider" />
          <div className="space-y-1.5 text-[11px]">
            <p className="lbl !mb-0">{L3('Display', 'العرض')}</p>
            <Toggle label={L3('Part labels', 'تسميات الأجزاء')} value={labels} onChange={setLabels} />
            <Toggle label={L3('Annotations', 'التعليقات')} value={showAnn} onChange={setShowAnn} />
            <Toggle label={L3('Auto-rotate', 'دوران تلقائي')} value={autoRotate} onChange={setAutoRotate} />
            <button className="btn btn-ghost btn-sm w-full" aria-pressed={measure} onClick={() => setMeasure(v => !v)}
              style={measure ? { borderColor: 'rgba(245,184,92,0.6)' } : undefined}>
              <ICrosshair size={13} /> {L3('Measure', 'قياس')}
            </button>
            {measure && <p className="text-[10.5px]" style={{ color: '#5f6f8d' }}>{measured != null ? `${measured.toFixed(3)} m` : L3('Click two points on the model.', 'انقر نقطتين على النموذج.')}</p>}
            <div>
              <p className="lbl !mb-1">{L3('Quality', 'الجودة')}</p>
              <div className="flex gap-1">
                {(['low', 'med', 'high'] as const).map(q => (
                  <button key={q} className="chip flex-1 justify-center" aria-pressed={quality === q} onClick={() => setQuality(q)}
                    style={quality === q ? { borderColor: 'rgba(83,216,232,0.6)', color: '#9EE8F2' } : undefined}>
                    {L3({ low: 'Low', med: 'Med', high: 'High' }[q], { low: 'منخفضة', med: 'متوسطة', high: 'عالية' }[q])}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER — viewport */}
        <div className="glass overflow-hidden relative order-1 xl:order-2" style={{ height: 'min(70vh, 640px)', minHeight: 360 }}>
          {webgl === null ? <div className="flex h-full items-center justify-center"><ISpinner size={26} /></div>
            : webgl ? (
              <SceneHost
                mode={mode} selected={selected} onSelect={setSelected} hidden={hidden} isolated={isolated}
                xray={xray} explode={explode} section={sectionOn ? section : -1} labels={labels}
                showAnnotations={showAnn} quality={quality} autoRotate={autoRotate} view={view}
                measure={measure} onMeasure={setMeasured} dustRate={dustRate} labelFor={labelFor}
                onZoneHit={onZoneHit} zoneLevels={zoneHits} fly={fly} lang={lang} siModel={siModel} userModelUrl={userModel.url}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <p className="chip chip-amber">{L3('WebGL unavailable', 'WebGL غير متاح')}</p>
                <p className="text-sm" style={{ color: 'var(--color-dim)' }}>{L3('The 3D view needs WebGL. Component data, guided tours and the physics demos still work.', 'يحتاج العرض ثلاثي الأبعاد إلى WebGL. بيانات المكونات والجولات الإرشادية وعروض الفيزياء ما تزال تعمل.')}</p>
              </div>
            )}

          <div className="absolute top-3 start-3 flex flex-wrap gap-1.5 pointer-events-none">
            <span className="chip chip-cy">{MODES.find(m => m.id === mode)?.label[lang]}</span>
            {isolated && <span className="chip chip-bl">{L3('Isolated', 'معزول')}</span>}
            {measure && <span className="chip chip-amber">{measured != null ? `${measured.toFixed(3)} m` : L3('measuring', 'قياس')}</span>}
          </div>
          <div className="absolute bottom-3 start-3 end-3 flex flex-wrap items-center gap-1.5">
            {(['front', 'back', 'left', 'top'] as View[]).map(v => (
              <button key={v} className="btn btn-ghost btn-sm !py-1" onClick={() => setView(prev => ({ v, n: (prev?.n ?? 0) + 1 }))}>
                {L3({ front: 'Front', back: 'Back', left: 'Side', top: 'Top' }[v], { front: 'أمام', back: 'خلف', left: 'جانب', top: 'أعلى' }[v])}
              </button>
            ))}
            <button className="btn btn-ghost btn-sm !py-1" onClick={() => { setView(null); setAutoRotate(false); setTimeout(() => setView({ v: 'front', n: Math.random() }), 0); }} aria-label={L3('Reset view', 'إعادة العرض')}><IReset size={13} /></button>
          </div>
          {mode === 'dust' && topZone && (
            <span className="absolute top-3 end-3 chip chip-amber max-w-[46%] whitespace-normal text-start">
              {L3('Most exposed', 'الأكثر تعرضًا')}: {compById(topZone)?.name[lang] ?? topZone}
            </span>
          )}
        </div>

        {/* RIGHT — dossier + explainer */}
        <aside className="glass p-4 order-3 space-y-3 max-h-[720px] overflow-y-auto" aria-label={L3('Component information', 'معلومات المكوّن')}>
          {comp ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="h-display font-bold text-[16px] leading-snug">{comp.name[lang]}</h3>
                  <p className="text-[11px] mt-0.5" style={{ color: '#5f6f8d' }}>
                    {ASSEMBLIES.find(a => a.id === comp.assembly)?.name[lang]} · {comp.category[lang]}
                  </p>
                </div>
                <span className={`chip ${scanOnScreen ? 'chip-ok' : CONF_STYLE[comp.confidence].c} shrink-0`}>
                  {scanOnScreen ? L3('Smithsonian scan region', 'منطقة من مسح سميثسونيان') : CONF_STYLE[comp.confidence][lang]}
                </span>
              </div>

              <Dossier id={comp.id} />

              <div className="divider" />
              <Explainer id={comp.id} />

              <div className="divider" />
              <div className="space-y-1">
                <p className="lbl !mb-1">{L3('References', 'المراجع')}</p>
                {comp.sources.map(sid => {
                  const s = srcById(sid);
                  return <a key={sid} className="ref-link block text-[11.5px]" href={s.url} target="_blank" rel="noopener noreferrer">{s.label} <IExternal size={10} className="inline" /></a>;
                })}
              </div>
              <p className="text-[10.5px] leading-relaxed" style={{ color: '#5f6f8d' }}>
                {L3(
                  'Exterior form follows public AxEMU references; internal arrangements use the generic EVA reference architecture and are labeled as such. Not official NASA or Axiom CAD.',
                  'الشكل الخارجي يتبع مراجع AxEMU العامة؛ الترتيبات الداخلية تستخدم مرجع EVA العام وتُوسم كذلك. ليست CAD رسمية لناسا أو أكسيوم.',
                )}
              </p>

              <SourcePanel
                siModel={siModel} onToggle={setSiModel}
                userModel={userModel} lang={lang}
                onUseFile={f => { userModel.accept(f); setAutoRotate(false); }}
              />
            </>
          ) : (
            <p className="py-8 text-center text-[13px]" style={{ color: 'var(--color-dim)' }}>
              {L3('Select a component in the tree or click the model.', 'اختر مكوّنًا من الشجرة أو انقر النموذج.')}
            </p>
          )}
        </aside>
      </div>

      {/* ---------- BOTTOM — inspection controls, tours, timeline ---------- */}
      <div className="glass p-4 space-y-3" aria-label={L3('Inspection controls', 'أدوات الفحص')}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Slider label={L3('X-ray transparency', 'شفافية الأشعة')} value={xray} min={0} max={1} step={0.05}
            onChange={v => { setXray(v); if (v > 0.05) setMode('internal'); }} pct />
          <Slider label={L3('Explode amount', 'مقدار التفكيك')} value={explode} min={0} max={1} step={0.05}
            onChange={v => { setExplode(v); if (v > 0.05) setMode('exploded'); }} pct />
          <div className={mode === 'cross' ? '' : 'opacity-50'}>
            <label className="lbl !mb-1 flex items-center gap-2" htmlFor="sec-chk">
              <input id="sec-chk" type="checkbox" checked={sectionOn} disabled={mode !== 'cross'}
                onChange={e => { setSectionOn(e.target.checked); if (e.target.checked) setMode('cross'); }} />
              {L3('Cross-section cut', 'مقطع عرضي')}
            </label>
            <input type="range" min={-1.2} max={0.5} step={0.02} value={section} className="w-full"
              disabled={mode !== 'cross'} aria-label={L3('Cut position', 'موضع المقطع')}
              onChange={e => { setSection(Number(e.target.value)); setSectionOn(true); setMode('cross'); }} />
            <p className="text-[10px]" style={{ color: '#5f6f8d' }}>z = {section.toFixed(2)} m</p>
          </div>
          <div className={mode === 'dust' ? '' : 'opacity-50'}>
            <Slider label={L3('Dust exposure rate', 'معدل التعرض للغبار')} value={dustRate} min={0.1} max={2} step={0.1}
              onChange={v => { setDustRate(v); setMode('dust'); }} unit="×" />
          </div>
        </div>

        <div className="divider" />

        {/* guided tours */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">{L3('Guided tours', 'جولات إرشادية')}</span>
          {TOURS.map(tt => (
            <button key={tt.id} className="chip" aria-pressed={tour?.id === tt.id}
              style={tour?.id === tt.id ? { borderColor: 'rgba(83,216,232,0.65)', color: '#9EE8F2' } : undefined}
              onClick={() => setTour(t => (t?.id === tt.id ? t : { id: tt.id, i: 0, playing: true }))}>
              {tt.label[lang]}
            </button>
          ))}
          {tour && activeTour && (
            <div className="flex items-center gap-1.5 ms-auto">
              <button className="btn btn-ghost btn-icon" aria-label={L3('Previous step', 'الخطوة السابقة')}
                onClick={() => setTour(tt => tt && { ...tt, i: Math.max(0, tt.i - 1), playing: false })}>‹</button>
              <button className="btn btn-primary btn-icon" aria-label={tour.playing ? L3('Pause tour', 'إيقاف الجولة') : L3('Play tour', 'تشغيل الجولة')}
                onClick={() => setTour(tt => tt && { ...tt, playing: !tt.playing })}>
                {tour.playing ? <IPause size={14} /> : <IPlay size={14} />}
              </button>
              <button className="btn btn-ghost btn-icon" aria-label={L3('Next step', 'الخطوة التالية')}
                onClick={() => setTour(tt => tt && { ...tt, i: Math.min(activeTour.steps.length - 1, tt.i + 1), playing: false })}>›</button>
              <span className="font-mono text-[11px] text-[#9EE8F2]">{tour.i + 1}/{activeTour.steps.length}</span>
              <button className="btn btn-ghost btn-icon" aria-label={L3('Close tour', 'إغلاق الجولة')} onClick={() => setTour(null)}><IX size={14} /></button>
            </div>
          )}
        </div>

        {/* tour narration + timeline */}
        {tour && activeTour && (
          <div className="glass-deep p-3.5 rise">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="chip chip-cy">{activeTour.steps[tour.i].title[lang]}</span>
              <span className="font-mono text-[10.5px]" style={{ color: '#5f6f8d' }}>{activeTour.label[lang]}</span>
            </div>
            <p className="text-[13px] leading-relaxed">{activeTour.steps[tour.i].body[lang]}</p>
            <div className="mt-2.5 flex items-center gap-1" role="group" aria-label={L3('Tour timeline', 'الخط الزمني للجولة')}>
              {activeTour.steps.map((st, i) => (
                <button key={i} onClick={() => setTour(tt => tt && { ...tt, i, playing: false })}
                  className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{ background: i === tour.i ? '#53D8E8' : i < tour.i ? 'rgba(83,216,232,0.45)' : 'rgba(107,141,255,0.2)' }}
                  aria-label={`${i + 1}: ${st.title[lang]}`} />
              ))}
            </div>
          </div>
        )}

        {/* dust timeline / risk strip */}
        {mode === 'dust' && (
          <div className="glass-deep p-3.5 space-y-2">
            <p className="lbl !mb-0">{L3('Accumulation by component — graphical only', 'التراكم حسب المكوّن — رسومي فقط')}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(zoneHits).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([z, n]) => (
                <button key={z} className="text-start" onClick={() => setSelected(z)}>
                  <p className="text-[11.5px] mb-0.5 truncate">{compById(z)?.name[lang] ?? z}</p>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${(n / maxHit) * 100}%`, background: 'linear-gradient(90deg,#F5B85C,#F87171)' }} /></div>
                </button>
              ))}
            </div>
            {Object.keys(zoneHits).length === 0 && <p className="text-[12px]" style={{ color: 'var(--color-dim)' }}>{L3('Raise the exposure rate to begin the simulation.', 'ارفع معدل التعرض لبدء المحاكاة.')}</p>}
            <p className="text-[10.5px]" style={{ color: '#5f6f8d' }}>
              {L3('Screen accumulation is an educational visualization, not a validated contamination prediction.', 'التراكم على الشاشة تصور تعليمي وليس تنبؤ تلوث مُتحققًا منه.')}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

/** Source + attribution panel for the bundled Smithsonian Armstrong A7-L scan. */
function SourcePanel({ siModel, onToggle, userModel, onUseFile }: {
  siModel: boolean; onToggle: (v: boolean) => void;
  userModel: ReturnType<typeof useUserModel>;
  onUseFile: (f: File) => void; lang: 'en' | 'ar';
}) {
  const { lang } = useApp();
  const si = useSmithsonianAvailability();
  const L3 = (en: string, ar: string) => L(lang, en, ar);
  const usingScan = si.available && siModel;
  return (
    <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'rgba(107,141,255,0.35)', background: 'rgba(20,36,58,0.5)' }}>
      <p className="lbl !mb-0">{L3('3D model source', 'مصدر النموذج ثلاثي الأبعاد')}</p>

      {si.checking ? (
        <p className="text-[11.5px]" style={{ color: 'var(--color-dim)' }}>{L3('Loading source information…', 'جارٍ تحميل بيانات المصدر…')}</p>
      ) : usingScan ? (
        <>
          <span className="chip chip-ok">{L3('Original Smithsonian scan', 'مسح سميثسونيان الأصلي')}</span>
          <p className="text-[11.5px] font-semibold">{L3('Neil Armstrong Spacesuit — Apollo A7-L', 'بدلة نيل أرمسترونغ — أبولو A7-L')}</p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>
            {L3(
              `Digitized by the Smithsonian Digitization Programs Office and the National Air and Space Museum. Bundled locally (${si.bytes ? `${(si.bytes / 1048576).toFixed(1)} MB` : 'GLB'}) and rendered with its original materials and textures — not an image, iframe or substitute.`,
              `رقمنتها مكتب برامج الرقمنة سميثسونيان والمتحف الوطني للطيران والفضاء. مضمّنة محليًا (${si.bytes ? `${(si.bytes / 1048576).toFixed(1)} م.ب` : 'GLB'}) وتُعرض بموادها وخاماتها الأصلية — ليست صورة ولا iframe ولا بديلًا.`,
            )}
          </p>
          <p className="text-[10.5px] leading-relaxed" style={{ color: '#F5B85C' }}>
            {L3(
            'This is an Apollo A7-L, not an AxEMU. The same scan stays in all five modes, but it is one merged surface: its hidden internal geometry and separable assemblies are not available. Internal and exploded interpretations are not fabricated.',
            'هذه بدلة أبولو A7-L وليست AxEMU. يبقى المسح نفسه في الأوضاع الخمسة، لكنه سطح مدمج واحد: هندسته الداخلية المخفية وتجميعاته القابلة للفصل غير متاحة. لا تُختلق الأجزاء الداخلية أو التفكيك.',
            )}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <a className="ref-link text-[11px]" href={SI_MODEL_PAGE} target="_blank" rel="noopener noreferrer">{L3('Smithsonian object', 'قطعة سميثسونيان')} ↗</a>
            <a className="ref-link text-[11px]" href={SI_TERMS} target="_blank" rel="noopener noreferrer">{L3('Terms of use', 'شروط الاستخدام')} ↗</a>
            <a className="ref-link text-[11px]" href={SI_ATTRIBUTION} target="_blank" rel="noopener noreferrer">{L3('Attribution', 'النسب')} ↗</a>
          </div>
        </>
      ) : (
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>
          {L3(
            'The bundled scan is unavailable, so the labeled generic EVA reconstruction is shown. No substitute is presented as the Smithsonian artifact.',
            'المسح المضمّن غير متاح، لذا تُعرض إعادة البناء التعليمية الموسومة. لا يُقدَّم أي بديل على أنه قطعة سميثسونيان.',
          )}
        </p>
      )}

      <label className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-dim)' }}>
        <input type="checkbox" checked={siModel} onChange={e => onToggle(e.target.checked)} />
        {L3('Use the Smithsonian scan as the shared model in all modes', 'استخدم مسح سميثسونيان كنموذج مشترك في جميع الأوضاع')}
      </label>

      <details className="text-[10.5px]">
        <summary className="cursor-pointer" style={{ color: '#5f6f8d' }}>
          {L3('Load a higher-resolution export instead', 'حمّل نسخة أعلى دقة بدلاً منها')}
        </summary>
        <div className="mt-2">
          <ModelDropZone
            lang={lang}
            name={userModel.name} bytes={userModel.bytes} error={userModel.error}
            onFile={onUseFile} onClear={userModel.clear}
            persisted={userModel.persisted} restoring={userModel.restoring}
          />
        </div>
      </details>

      <p className="text-[10px]" style={{ color: '#5f6f8d' }}>
        {L3(
          '© Smithsonian Institution. Non-commercial / educational use under Smithsonian Terms of Use. No endorsement implied.',
          '© مؤسسة سميثسونيان. استخدام غير تجاري/تعليمي وفق شروط سميثسونيان. دون أي ادعاء بموافقة المؤسسة.',
        )}
      </p>
    </div>
  );
}

/** Engineering dossier for one component (right panel body). */
function Dossier({ id }: { id: string }) {
  const { lang } = useApp();
  const c = compById(id);
  if (!c) return null;
  const fields: [string, string, string | undefined][] = [
    ['fn', L(lang, 'Primary function', 'الوظيفة الأساسية'), undefined],
    ['principle', L(lang, 'Operating principle', 'مبدأ العمل'), undefined],
    ['materials', L(lang, 'Materials', 'المواد'), undefined],
    ['failure', L(lang, 'Failure modes', 'أنماط الفشل'), '#FCA5A5'],
    ['dust', L(lang, 'Dust vulnerability', 'قابلية التأثر بالغبار'), '#F5B85C'],
    ['protection', L(lang, 'Protective measures', 'تدابير الحماية'), '#86EFAC'],
  ];
  return (
    <div className="space-y-2">
      {fields.map(([k, label, color]) => {
        const v = (c as unknown as Record<string, { en: string; ar: string }>)[k];
        return (
          <div key={k} className="rounded-lg border p-2.5" style={{ borderColor: 'var(--line)', background: 'rgba(8,14,27,0.4)' }}>
            <p className="lbl !mb-1" style={{ color }}>{label}</p>
            <p className="text-[12.5px] leading-relaxed">{v[lang]}</p>
          </div>
        );
      })}
      {c.equation && (
        <div className="rounded-lg border p-2.5 font-mono text-[12.5px] text-[#9EE8F2]" style={{ borderColor: 'rgba(83,216,232,0.35)', background: 'rgba(83,216,232,0.06)' }}>
          {c.equation}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ tree */

function TreeBody({ query, selected, onSelect, hidden, onToggleHidden, isolated, onIsolate }: {
  query: string; selected: string | null; onSelect: (id: string) => void;
  hidden: Set<string>; onToggleHidden: (id: string) => void; isolated: string | null; onIsolate: (id: string | null) => void;
}) {
  const { lang } = useApp();
  const [open, setOpen] = useState<Set<string>>(new Set(['helmet', 'plss', 'hut']));
  const groups = useMemo(() => ASSEMBLIES.map(a => ({
    a,
    items: COMPONENTS.filter(c => c.assembly === a.id && (!query.trim() || `${c.name.en} ${c.name.ar}`.toLowerCase().includes(query.toLowerCase()))),
  })).filter(g => g.items.length), [query, lang]);
  return (
    <>
      {groups.map(({ a, items }) => {
        const isOpen = query.trim() !== '' || open.has(a.id);
        return (
          <div key={a.id}>
            <button className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-bold hover:bg-[rgba(107,141,255,0.08)]"
              aria-expanded={isOpen}
              onClick={() => setOpen(prev => { const n = new Set(prev); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })}>
              <span className={`transition-transform ${isOpen ? 'rotate-90' : ''} rtl:rotate-180`}>›</span>
              {a.name[lang]} <span className="ms-auto opacity-50">{items.length}</span>
            </button>
            {isOpen && items.map(c => {
              const isHidden = hidden.has(c.id);
              return (
                <div key={c.id} className="group flex items-center gap-1 rounded-lg ps-6 pe-1"
                  style={{ background: selected === c.id ? 'rgba(83,216,232,0.12)' : undefined }}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.confidence === 'official' ? '#4ADE80' : c.confidence === 'reconstruction' ? '#53D8E8' : c.confidence === 'generic' ? '#6B8DFF' : '#F5B85C' }} />
                  <button className="flex-1 truncate py-1.5 text-start text-[12px]" style={{ color: selected === c.id ? '#9EE8F2' : 'var(--color-dim)', opacity: isHidden ? 0.4 : 1 }}
                    aria-pressed={selected === c.id} onClick={() => onSelect(c.id)}>
                    {c.name[lang]}
                  </button>
                  <button className="opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100 focus-visible:opacity-100"
                    aria-label={isolated === c.id ? 'Show all' : 'Isolate'}
                    onClick={() => onIsolate(isolated === c.id ? null : c.id)} title="Isolate">
                    <ICube size={12} />
                  </button>
                  <button className="opacity-70 hover:opacity-100" aria-label={isHidden ? 'Show part' : 'Hide part'} onClick={() => onToggleHidden(c.id)}>
                    {isHidden ? <IX size={12} /> : <IEye size={12} />}
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------- scene host */
const LabScene = dynamic(() => import('./LabScene'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center"><ISpinner size={26} /></div>,
});

interface SceneProps {
  mode: Mode; selected: string | null; onSelect: (id: string | null) => void;
  hidden: Set<string>; isolated: string | null; xray: number; explode: number;
  section: number; labels: boolean; showAnnotations: boolean; quality: 'low' | 'med' | 'high';
  autoRotate: boolean; view: { v: 'front' | 'back' | 'left' | 'top'; n: number } | null;
  measure: boolean; onMeasure: (m: number | null) => void; dustRate: number;
  labelFor: (id: string) => string; onZoneHit: (z: string) => void; zoneLevels: Record<string, number>;
  fly: { cam: [number, number, number]; n: number } | null;
  lang: 'en' | 'ar';
  siModel: boolean;
  userModelUrl: string | null;
}

function SceneHost(props: SceneProps) {
  return <LabScene {...props} />;
}

/* -------------------------------------------------- small controls */
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold"
      style={{ borderColor: value ? 'rgba(83,216,232,0.5)' : 'var(--line)', background: value ? 'rgba(83,216,232,0.08)' : 'rgba(8,14,27,0.4)' }}
      aria-pressed={value} onClick={() => onChange(!value)}>
      {label}
      <span className="relative h-4 w-7 rounded-full" style={{ background: value ? 'linear-gradient(90deg,#53D8E8,#6B8DFF)' : '#243350' }} aria-hidden>
        <span className="absolute top-0.5 h-3 w-3 rounded-full bg-white" style={{ insetInlineStart: value ? '14px' : '2px' }} />
      </span>
    </button>
  );
}

function Slider({ label, value, min, max, step, onChange, unit, pct }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string; pct?: boolean;
}) {
  return (
    <div>
      <label className="lbl !mb-1">{label} · <span className="font-mono text-[#9EE8F2]">{pct ? Math.round(value * 100) : value.toFixed(2).replace(/\.00$/, '')}{pct ? '%' : unit ?? ''}</span></label>
      <input type="range" min={min} max={max} step={step} value={value} className="w-full" onChange={e => onChange(Number(e.target.value))} aria-label={label} />
    </div>
  );
}

/* -------------------------------------------- explainer (Atlas3D-style) */
function Explainer({ id }: { id: string }) {
  const { lang } = useApp();
  const [extra, setExtra] = useState<string | null>(null);
  const c = compById(id)!;
  const ex = explain(c, lang);
  const prompts = ex.follow;
  useEffect(() => { setExtra(null); }, [id]);
  return (
    <div className="space-y-2">
      <p className="lbl !mb-0 flex items-center gap-1.5">
        {lang === 'ar' ? 'شرح مبسّط' : 'Plain-language explainer'}
        <span className="chip !py-0 text-[9.5px]">{lang === 'ar' ? 'مولّد محليًا' : 'local generator'}</span>
      </p>
      <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>
        {lang === 'ar' ? ex.textAr : ex.text}
      </p>
      {extra && (
        <div className="rounded-lg border p-2.5 text-[12.5px] leading-relaxed rise" style={{ borderColor: 'rgba(83,216,232,0.4)', background: 'rgba(83,216,232,0.06)' }}>
          {extra}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {prompts.slice(0, 3).map(q => (
          <button key={q} className="chip !py-1" onClick={() => {
            const r = answer(q, lang);
            setExtra(r ? (lang === 'ar' ? r.textAr : r.text) : (lang === 'ar' ? 'لا توجد بيانات موثقة لهذا السؤال في قاعدة المكونات.' : 'No documented data for that question in the component database.'));
          }}>
            {q}
          </button>
        ))}
      </div>
      <p className="text-[10px]" style={{ color: '#5f6f8d' }}>
        {lang === 'ar'
          ? 'يُولَّد هذا الشرح محليًا من قاعدة بيانات المكوّنات الموثقة نفسها — دون أي خدمة ذكاء اصطناعي خارجية.'
          : 'Generated locally from the same cited component database — no external AI service is called.'}
      </p>
    </div>
  );
}
