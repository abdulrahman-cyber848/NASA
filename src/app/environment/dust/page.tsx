'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useApp, useMounted } from '@/state/app';
import { PageSkeleton, Seg } from '@/components/ui';
import { ISpinner, IInfo } from '@/components/icons';
import { EnvTabs, EnvAnchors, EnvSources } from '@/components/environment/EnvChrome';
import { DustEngine, DEFAULT_PARAMS, SUIT_ZONES, type ScenarioId, type SimParams } from '@/features/lunarDust/physics/engine';
import { PhysicsDataPanel, ParamControls } from '@/features/lunarDust/components/DustPanels';
import AdhesionDemo from '@/components/environment/AdhesionDemo';
import HazardLab from '@/components/environment/HazardLab';
import MissionScenarios from '@/components/environment/MissionScenarios';
import PreventionPanel from '@/components/environment/PreventionPanel';
import { fmtNum } from '@/services/format';
import { KEYS } from '@/lib/brand';

const DustLabScene = dynamic(() => import('@/features/lunarDust/components/DustLabScene'), {
  ssr: false,
  loading: () => <div className="flex h-full min-h-[320px] items-center justify-center"><ISpinner size={28} /></div>,
});

const SCENARIOS: { id: ScenarioId; en: string; ar: string }[] = [
  { id: 'footsteps', en: 'Footsteps', ar: 'خطوات' },
  { id: 'rover', en: 'Rover', ar: 'عربة' },
  { id: 'plume', en: 'Landing plume', ar: 'عمود الهبوط' },
  { id: 'adhesion', en: 'Electrostatic adhesion', ar: 'التصاق كهروستاتيكي' },
  { id: 'eds', en: 'EDS shield', ar: 'درع EDS' },
  { id: 'suit', en: 'Suit contamination', ar: 'تلوث البدلة' },
];
const ZONE_LABEL: Record<string, { en: string; ar: string }> = {
  visor: { en: 'Visor', ar: 'الواقي' }, gloves: { en: 'Gloves', ar: 'القفازات' }, boots: { en: 'Boots', ar: 'الأحذية' },
  exterior: { en: 'Exterior', ar: 'الخارج' }, joints: { en: 'Joints', ar: 'المفاصل' }, seals: { en: 'Seals', ar: 'الأختام' }, plss: { en: 'PLSS', ar: 'الحقيبة' },
};
const RISK: Record<string, { mech: { en: string; ar: string }; cons: { en: string; ar: string }; mit: { en: string; ar: string } }> = {
  visor: { mech: { en: 'Adhesion + micro-scratch', ar: 'التصاق + خدش دقيق' }, cons: { en: 'Reduced visibility / glare', ar: 'رؤية أقل / وهج' }, mit: { en: 'Covers, no dry wipe, EDS research', ar: 'أغطية، منع المسح الجاف، أبحاث EDS' } },
  gloves: { mech: { en: 'Abrasion at flex', ar: 'تآكل عند الانثناء' }, cons: { en: 'Dexterity loss, wear', ar: 'فقد براعة وتآكل' }, mit: { en: 'Replaceable outer gloves', ar: 'قفازات خارجية قابلة للاستبدال' } },
  boots: { mech: { en: 'Sole abrasion / carry-back', ar: 'تآكل النعل / نقل الغبار' }, cons: { en: 'Traction loss, habitat dust', ar: 'فقد تماسك وغبار المسكن' }, mit: { en: 'Overboots, brush station', ar: 'أحذية خارجية ومحطة فرشاة' } },
  exterior: { mech: { en: 'Fabric abrasion / soiling', ar: 'تآكل النسيج / اتساخ' }, cons: { en: 'Thermal-optical drift', ar: 'انحراف حراري-بصري' }, mit: { en: 'Coatings, covers', ar: 'طلاءات وأغطية' } },
  joints: { mech: { en: 'Bearing grit wear', ar: 'تآكل المحامل بالحبيبات' }, cons: { en: 'Torque rise / seizure', ar: 'ارتفاع عزم / توقف' }, mit: { en: 'Labyrinth seals, solid lube', ar: 'أختام متاهية وتشحيم صلب' } },
  seals: { mech: { en: 'Seal propping / scoring', ar: 'إبقاء الختم مفتوحًا / خدش' }, cons: { en: 'Leak risk (life-critical)', ar: 'خطر تسرب (حرج للحياة)' }, mit: { en: 'Clean-before-mate, leak checks', ar: 'تنظيف قبل التعشيق وفحوص تسرب' } },
  plss: { mech: { en: 'Radiator / connector fouling', ar: 'اتساخ المشع / الوصلات' }, cons: { en: 'Reduced heat rejection', ar: 'طرد حرارة أقل' }, mit: { en: 'Covers, EDS, orientation', ar: 'أغطية وEDS وتوجيه' } },
};

function download(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export default function DustPage() {
  const { t, lang } = useApp();
  const mounted = useMounted();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const engineRef = useRef<DustEngine | null>(null);
  if (!engineRef.current) engineRef.current = new DustEngine(DEFAULT_PARAMS);
  const engine = engineRef.current;
  const [scenario, setScenario] = useState<ScenarioId>('footsteps');
  const [params, setParams] = useState<SimParams>(DEFAULT_PARAMS);
  const [running, setRunning] = useState(true);
  const [, setTick] = useState(0);
  const [stats, setStats] = useState({ live: 0, settled: 0 });
  const [grainScale, setGrainScale] = useState(1.4);
  const [showField, setShowField] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [camera, setCamera] = useState<'surface' | 'overhead' | 'follow'>('surface');
  const [suitState, setSuitState] = useState<'clean' | 'exposure' | 'accumulated' | 'mitigation'>('exposure');
  const [quality, setQuality] = useState<'low' | 'med' | 'high'>('med');
  const L = (en: string, ar: string) => (lang === 'ar' ? ar : en);

  useEffect(() => {
    try { const c = document.createElement('canvas'); setWebgl(!!(c.getContext('webgl2') || c.getContext('webgl'))); }
    catch { setWebgl(false); }
  }, []);
  // keep engine params in sync
  useEffect(() => { engine.setParams(params); }, [params, engine]);
  useEffect(() => { engine.setScenario(scenario); setTick(v => v + 1); }, [scenario, engine]);
  // data-panel refresh
  useEffect(() => { const iv = setInterval(() => setTick(v => v + 1), 250); return () => clearInterval(iv); }, []);

  const set = (p: Partial<SimParams>) => setParams(prev => ({ ...prev, ...p }));
  const onStats = (live: number, settled: number) => setStats({ live, settled });
  const maxHits = useMemo(() => Math.max(1, ...SUIT_ZONES.map(z => engine.zoneHits[z])), [stats, engine]);

  if (!mounted) return <PageSkeleton />;

  return (
    <div className="container-x py-8 space-y-6">
      <header className="rise">
        <p className="eyebrow">{t('env.lab')}</p>
        <h1 className="h-display mt-1 text-3xl sm:text-4xl font-bold">{L('Lunar Dust Physics Simulator', 'محاكي فيزياء الغبار القمري')}</h1>
        <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--color-dim)' }}>
          {L('Deterministic fixed-timestep vacuum ballistics with terrain collision, restitution, Coulomb friction and electrostatics — every value below is computed in SI from the implemented equations, not animated by eye.', 'قذفيات فراغ حتمية بخطوة زمنية ثابتة مع اصطدام بالتضاريس وارتداد واحتكاك كولوم وكهروستاتيكا — كل قيمة أدناه محسوبة بوحدات SI من المعادلات المنفذة وليست حركة بالعين.')}
        </p>
        <div className="mt-4"><EnvTabs /></div>
      </header>

      <EnvAnchors items={[{ id: 'sim', key: 'env.nav.sim' }, { id: 'risk', key: 'env.nav.hazards' }, { id: 'adhesion', key: 'env.nav.adhesion' }, { id: 'hazards', key: 'env.nav.hazards' }, { id: 'missions', key: 'env.nav.missions' }, { id: 'prevention', key: 'env.nav.prevention' }]} />

      <section id="sim" className="scroll-mt-32 space-y-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="scenario">
          {SCENARIOS.map(s => <button key={s.id} role="tab" aria-selected={scenario === s.id} className="chip" style={scenario === s.id ? { borderColor: 'rgba(83,216,232,0.6)', background: 'rgba(83,216,232,0.12)', color: '#9EE8F2' } : undefined} onClick={() => setScenario(s.id)}>{L(s.en, s.ar)}</button>)}
        </div>
        {scenario === 'plume' && <p className="flex gap-2 rounded-xl border p-3 text-[11.5px]" style={{ borderColor: 'rgba(245,184,92,0.4)', background: 'rgba(245,184,92,0.06)', color: 'var(--color-dim)' }}><IInfo size={14} className="shrink-0 mt-0.5 text-[#F5B85C]" /> {L('Educational approximation — not validated CFD or flight-prediction software. Plume–surface interaction is a multiphase rarefied-flow problem.', 'تقريب تعليمي — ليس CFD مُتحققًا منه ولا برنامج تنبؤ طيران. تفاعل العمود مع السطح مسألة تدفق متعدد الأطوار ومخلخل.')}</p>}
        <div className="grid gap-4 xl:grid-cols-[280px_1fr_320px] items-start">
          <aside className="glass p-4 order-2 xl:order-1"><ParamControls params={params} set={set} running={running} setRunning={setRunning}
            onStep={() => { engine.singleStep(); setTick(v => v + 1); }} onRestart={() => { engine.reset(); setTick(v => v + 1); }}
            onDefaults={() => { setParams(DEFAULT_PARAMS); engine.setParams(DEFAULT_PARAMS); engine.reset(); }}
            onCsv={() => download('lunanav-dust.csv', engine.csv(), 'text/csv')}
            onSave={() => { localStorage.setItem(KEYS.dustConfig, engine.configJson()); download('lunanav-dust-config.json', engine.configJson(), 'application/json'); }}
            grainScale={grainScale} setGrainScale={setGrainScale} showField={showField} setShowField={setShowField} showTrail={showTrail} setShowTrail={setShowTrail} /></aside>

          <div className="glass overflow-hidden relative order-1 xl:order-2" style={{ height: 'min(66vh, 620px)', minHeight: 360 }}>
            {webgl === null ? <div className="flex h-full items-center justify-center"><ISpinner size={26} /></div>
              : webgl ? <DustLabScene engine={engine} running={running} vizDensity={params.vizDensity} quality={quality} showField={showField} showTrail={showTrail} grainScale={grainScale} scenario={scenario} suitState={suitState} onStats={onStats} camera={camera} labelZone={z => ZONE_LABEL[z][lang]} />
                : <div className="flex h-full items-center justify-center p-6 text-center text-sm" style={{ color: 'var(--color-dim)' }}>{L('WebGL unavailable — physics still runs; use the data panel and CSV export.', 'WebGL غير متاح — الفيزياء ما تزال تعمل؛ استخدم لوحة البيانات وتصدير CSV.')}</div>}
            <div className="absolute top-3 start-3 flex flex-wrap gap-1.5">
              <span className="chip chip-cy">{L('live', 'حي')} {fmtNum(stats.live, lang)} · {L('settled', 'مستقر')} {fmtNum(stats.settled, lang)}</span>
              <span className="chip">t={engine.time.toFixed(1)}s</span>
            </div>
            <div className="absolute bottom-3 start-3 end-3 flex flex-wrap items-center gap-1.5">
              {(['surface', 'overhead', 'follow'] as const).map(c => <button key={c} className="btn btn-ghost btn-sm !py-1" aria-pressed={camera === c} onClick={() => setCamera(c)}>{L({ surface: 'Surface', overhead: 'Top', follow: 'Follow' }[c], { surface: 'سطح', overhead: 'أعلى', follow: 'تتبع' }[c])}</button>)}
              <div className="ms-auto"><Seg label="quality" value={quality} onChange={setQuality} options={[{ value: 'low' as const, label: t('ex.qLow') }, { value: 'med' as const, label: t('ex.qMed') }, { value: 'high' as const, label: t('ex.qHigh') }]} /></div>
            </div>
          </div>

          <aside className="glass p-4 order-3"><PhysicsDataPanel engine={engine} /></aside>
        </div>
        {/* timeline */}
        <div className="glass p-3 flex items-center gap-3">
          <span className="lbl !mb-0">{L('Timeline', 'الخط الزمني')}</span>
          <div className="progress-track flex-1"><div className="progress-fill" style={{ width: `${Math.min(100, (engine.time % 30) / 30 * 100)}%` }} /></div>
          <span className="font-mono text-[11px] text-[#9EE8F2]">{engine.time.toFixed(2)} s</span>
        </div>
      </section>

      {/* integration risk dashboard */}
      <section id="risk" className="scroll-mt-32 glass p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="h-display text-xl font-bold">{L('Suit contamination & risk', 'تلوث البدلة والمخاطر')}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-dim)' }}>{L('Run the “Suit contamination” scenario, then read per-assembly exposure. Graphical coverage ≠ validated mass deposition.', 'شغّل سيناريو «تلوث البدلة» ثم اقرأ التعرض لكل مجموعة. التغطية الرسومية ≠ ترسب كتلي مُتحقق منه.')}</p></div>
          <div className="flex gap-1.5">{(['clean', 'exposure', 'accumulated', 'mitigation'] as const).map(s => <button key={s} className="chip" aria-pressed={suitState === s} style={suitState === s ? { borderColor: 'rgba(83,216,232,0.6)', color: '#9EE8F2' } : undefined} onClick={() => setSuitState(s)}>{L({ clean: 'Clean', exposure: 'Exposure', accumulated: 'Accumulated', mitigation: 'Mitigation' }[s], { clean: 'نظيف', exposure: 'تعرض', accumulated: 'متراكم', mitigation: 'تخفيف' }[s])}</button>)}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SUIT_ZONES.map(z => (
            <div key={z} className="glass-deep p-3 space-y-1.5">
              <div className="flex items-center justify-between"><span className="font-semibold text-[13px]">{ZONE_LABEL[z][lang]}</span><span className="chip chip-amber">{engine.zoneHits[z]}</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, engine.zoneHits[z] / maxHits * 100)}%`, background: 'linear-gradient(90deg,#F5B85C,#F87171)' }} /></div>
              <p className="text-[11px]" style={{ color: '#FCA5A5' }}>{RISK[z].mech[lang]}</p>
              <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>{RISK[z].cons[lang]}</p>
              <p className="text-[11px]" style={{ color: '#86EFAC' }}>{RISK[z].mit[lang]}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="adhesion" className="scroll-mt-32 glass p-6 space-y-4"><div><h2 className="h-display text-xl font-bold">{t('env.adhesion.title')}</h2><p className="mt-1 text-sm" style={{ color: 'var(--color-dim)' }}>{t('env.adhesion.sub')}</p></div><AdhesionDemo /></section>
      <section id="hazards" className="scroll-mt-32 glass p-6 space-y-4"><div><h2 className="h-display text-xl font-bold">{t('env.hazards.title')}</h2><p className="mt-1 text-sm" style={{ color: 'var(--color-dim)' }}>{t('env.hazards.sub')}</p></div><HazardLab /></section>
      <section id="missions" className="scroll-mt-32 glass p-6 space-y-4"><div><h2 className="h-display text-xl font-bold">{t('env.missions.title')}</h2><p className="mt-1 text-sm" style={{ color: 'var(--color-dim)' }}>{t('env.missions.sub')}</p></div><MissionScenarios /></section>
      <section id="prevention" className="scroll-mt-32 glass p-6 space-y-4"><div><h2 className="h-display text-xl font-bold">{t('env.prevention.title')}</h2><p className="mt-1 text-sm" style={{ color: 'var(--color-dim)' }}>{t('env.prevention.sub')}</p></div><PreventionPanel /></section>
      <EnvSources />
    </div>
  );
}