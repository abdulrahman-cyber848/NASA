'use client';
import { useState } from 'react';
import { useApp } from '@/state/app';
import { sig } from '../physics/physicsUnits';
import { GRAIN_PROFILES } from '../physics/particlePhysics';
import type { DustEngine, SimParams } from '../physics/engine';
import { IPlay, IPause, IReset, IChevronR, IExternal } from '@/components/icons';

const L = (lang: string, en: string, ar: string) => (lang === 'ar' ? ar : en);

export function PhysicsDataPanel({ engine }: { engine: DustEngine }) {
  const { lang } = useApp();
  const [showEq, setShowEq] = useState(false);
  const t = engine.telemetry();
  const rows: [string, string, string, string, string][] = [
    ['d', sig(t.d * 1e6), 'µm', 'input', L(lang, 'Equivalent spherical diameter (profile)', 'قطر مكافئ كروي (نمط)')],
    ['m', sig(t.m), 'kg', 'm=ρπd³/6', L(lang, 'Equivalent-sphere mass', 'كتلة الكرة المكافئة')],
    ['ρ', sig(t.rho), 'kg/m³', 'input', L(lang, 'Grain material density', 'كثافة مادة الحبيبة')],
    ['q', sig(t.q * 1e15), 'fC', 'input', L(lang, 'User/reference charge (not universal)', 'شحنة مستخدم/مرجع (ليست عامة)')],
    ['g', sig(t.g), 'm/s²', 'g=GM/r²', L(lang, 'Lunar gravity (1.62 near-surface)', 'جاذبية القمر (1.62 قرب السطح)')],
    ['v₀', sig(t.v0), 'm/s', 'input', L(lang, 'Launch speed', 'سرعة الإطلاق')],
    ['v', sig(t.v), 'm/s', '|v(t)|', L(lang, 'Current speed', 'السرعة الحالية')],
    ['a', t.a == null ? '—' : sig(t.a), 'm/s²', 'a=F/m', L(lang, 'Net acceleration', 'التسارع الصافي')],
    ['x,y,z', `${sig(t.p.x)},${sig(t.p.y)},${sig(t.p.z)}`, 'm', 'r(t)', L(lang, 'Selected particle position', 'موضع الجسيم المحدد')],
    ['t', sig(t.t), 's', 'step count', L(lang, 'Particle flight time', 'زمن طيران الجسيم')],
    ['T', sig(t.T), 's', '2v₀z/g', L(lang, 'Same-height flight time', 'زمن الطيران لنفس الارتفاع')],
    ['H', sig(t.H), 'm', 'v₀z²/2g', L(lang, 'Max height', 'أقصى ارتفاع')],
    ['R', sig(t.R), 'm', 'v₀x·T', L(lang, 'Horizontal range', 'المدى الأفقي')],
    ['KE', sig(t.ke), 'J', '½mv²', L(lang, 'Kinetic energy', 'الطاقة الحركية')],
    ['p', sig(t.mom), 'kg·m/s', 'mv', L(lang, 'Momentum', 'الزخم')],
    ['Fe', sig(t.fe), 'N', 'qE', L(lang, 'Electric force', 'القوة الكهربائية')],
    ['Fg', sig(t.fg), 'N', 'mg', L(lang, 'Gravitational force', 'قوة الجاذبية')],
    ['Γ', t.ratio == null ? '—' : sig(t.ratio), '—', '|qE|/mg', L(lang, 'Electric/gravity ratio', 'نسبة كهربائي/جاذبية')],
    ['n', String(t.collisions), '—', 'count', L(lang, 'Collision count', 'عدد الاصطدامات')],
    ['t_sim', sig(t.simTime), 's', 'Σdt', L(lang, 'Simulation time', 'زمن المحاكاة')],
  ];
  const eqs: [string, string][] = [
    ['m = ρ·(π/6)·d³', L(lang, 'Equivalent-sphere mass of an irregular grain.', 'كتلة كرة مكافئة لحبيبة غير منتظمة.')],
    ['F_g = m·g', L(lang, 'Weight in the lunar near-surface field.', 'الوزن في مجال القمر قرب السطح.')],
    ['F_e = q·E', L(lang, 'Electrostatic force on a charged grain.', 'قوة كهروستاتيكية على حبيبة مشحونة.')],
    ['a = F_net / m', L(lang, "Newton's second law.", 'قانون نيوتن الثاني.')],
    ['v = v₀ + g·t', L(lang, 'Velocity under constant g.', 'السرعة تحت g ثابت.')],
    ['h = v₀z·t − ½g·t²', L(lang, 'Height in vacuum ballistics.', 'الارتفاع في قذفيات الفراغ.')],
    ['KE = ½·m·v²', L(lang, 'Kinetic energy.', 'الطاقة الحركية.')],
    ['p = m·v', L(lang, 'Momentum.', 'الزخم.')],
    ['F_f = μk·N', L(lang, 'Kinetic Coulomb friction at contact.', 'احتكاك كولوم الحركي عند التلامس.')],
    ["v'ₙ = −e·vₙ", L(lang, 'Restitution rebound (0≤e≤1).', 'ارتداد معامل الارتداد.')],
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="lbl !mb-0">{L(lang, 'Live physics · SI', 'فيزياء حية · SI')}</p>
        <button className="btn btn-ghost btn-sm !py-1" aria-expanded={showEq} onClick={() => setShowEq(v => !v)}>
          <IChevronR size={12} className={showEq ? 'rotate-90' : ''} /> {L(lang, 'Show equations', 'أظهر المعادلات')}
        </button>
      </div>
      {showEq && (
        <div className="rounded-xl border p-3 space-y-1.5" style={{ borderColor: 'rgba(83,216,232,0.3)', background: 'rgba(83,216,232,0.05)' }}>
          {eqs.map(([f, d]) => <div key={f} className="flex flex-wrap items-baseline gap-2"><code className="text-[12px] text-[#9EE8F2]">{f}</code><span className="text-[10.5px]" style={{ color: 'var(--color-dim)' }}>{d}</span></div>)}
        </div>
      )}
      <div className="max-h-[300px] overflow-y-auto rounded-xl border" style={{ borderColor: 'var(--line)' }}>
        <table className="w-full text-[11px]">
          <thead className="sticky top-0" style={{ background: '#0c1729' }}>
            <tr>{[L(lang, 'Sym', 'رمز'), L(lang, 'Value', 'قيمة'), L(lang, 'Unit', 'وحدة'), L(lang, 'Formula', 'صيغة')].map(h => <th key={h} className="p-1.5 text-start lbl !mb-0">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(([s, v, u, f, note]) => (
              <tr key={s} style={{ borderTop: '1px solid var(--line)' }} title={note}>
                <td className="p-1.5 font-mono text-[#9EE8F2]">{s}</td>
                <td className="p-1.5 font-mono">{v}</td>
                <td className="p-1.5" style={{ color: 'var(--color-dim)' }}>{u}</td>
                <td className="p-1.5 font-mono" style={{ color: '#5f6f8d' }}>{f}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px]" style={{ color: '#5f6f8d' }}>{L(lang, 'Rendered grain count is a visualization setting, never a physical sample count.', 'عدد الحبيبات المعروضة إعداد تصور وليس عدد عينة فيزيائي.')}</p>
    </div>
  );
}

function Slider({ id, label, value, min, max, step, unit, onChange, note }: { id: string; label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (n: number) => void; note?: string }) {
  return (
    <div title={note}>
      <label className="lbl !mb-0.5" htmlFor={id}>{label} · <span className="font-mono text-[#9EE8F2]">{sig(value)}</span>{unit ? ` ${unit}` : ''}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} className="w-full" onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

export function ParamControls(props: {
  params: SimParams; set: (p: Partial<SimParams>) => void; running: boolean; setRunning: (b: boolean) => void;
  onStep: () => void; onRestart: () => void; onDefaults: () => void; onCsv: () => void; onSave: () => void;
  grainScale: number; setGrainScale: (n: number) => void; showField: boolean; setShowField: (b: boolean) => void;
  showTrail: boolean; setShowTrail: (b: boolean) => void;
}) {
  const { lang } = useApp();
  const { params: P, set } = props;
  const [tab, setTab] = useState<'phys' | 'viz'>('phys');
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <button className="chip" aria-pressed={tab === 'phys'} style={tab === 'phys' ? { borderColor: 'rgba(83,216,232,0.6)', color: '#9EE8F2' } : undefined} onClick={() => setTab('phys')}>{L(lang, 'Physical', 'فيزيائي')}</button>
        <button className="chip" aria-pressed={tab === 'viz'} style={tab === 'viz' ? { borderColor: 'rgba(83,216,232,0.6)', color: '#9EE8F2' } : undefined} onClick={() => setTab('viz')}>{L(lang, 'Visual', 'بصري')}</button>
      </div>
      {tab === 'phys' ? (
        <div className="space-y-2">
          <div>
            <p className="lbl !mb-1">{L(lang, 'Grain profile', 'نمط الحبيبات')}</p>
            <div className="flex flex-wrap gap-1">
              {GRAIN_PROFILES.map(g => <button key={g.id} className="chip" title={g.source[lang]} aria-pressed={Math.abs(P.diameterUm - g.diameter * 1e6) < 1} onClick={() => set({ diameterUm: g.diameter * 1e6, density: g.density })} style={Math.abs(P.diameterUm - g.diameter * 1e6) < 1 ? { borderColor: 'rgba(83,216,232,0.6)', color: '#9EE8F2' } : undefined}>{g.label[lang]}</button>)}
            </div>
          </div>
          <Slider id="p-d" label={L(lang, 'Diameter', 'القطر')} value={P.diameterUm} min={5} max={1000} step={5} unit="µm" onChange={v => set({ diameterUm: v })} note="Equivalent sphere; configurable" />
          <Slider id="p-rho" label={L(lang, 'Density', 'الكثافة')} value={P.density} min={1500} max={3500} step={50} unit="kg/m³" onChange={v => set({ density: v })} />
          <Slider id="p-q" label={L(lang, 'Charge', 'الشحنة')} value={P.chargeFc} min={-500} max={500} step={10} unit="fC" onChange={v => set({ chargeFc: v })} note="User/reference, not universal" />
          <Slider id="p-E" label={L(lang, 'E-field', 'المجال')} value={P.fieldKVpm} min={0} max={100} step={1} unit="kV/m" onChange={v => set({ fieldKVpm: v })} />
          <Slider id="p-v" label={L(lang, 'Launch speed', 'سرعة الإطلاق')} value={P.launchSpeed} min={0.2} max={15} step={0.1} unit="m/s" onChange={v => set({ launchSpeed: v })} />
          <Slider id="p-ang" label={L(lang, 'Ejection angle', 'زاوية القذف')} value={P.launchAngleDeg} min={5} max={85} step={1} unit="°" onChange={v => set({ launchAngleDeg: v })} />
          <Slider id="p-h" label={L(lang, 'Launch height', 'ارتفاع الإطلاق')} value={P.launchHeight} min={0.01} max={1} step={0.01} unit="m" onChange={v => set({ launchHeight: v })} />
          <Slider id="p-mu" label="μk" value={P.contact.muKinetic} min={0} max={1.2} step={0.05} onChange={v => set({ contact: { ...P.contact, muKinetic: v } })} note="Illustrative simulant range" />
          <Slider id="p-e" label={L(lang, 'Restitution e', 'معامل الارتداد')} value={P.contact.restitution} min={0} max={1} step={0.05} onChange={v => set({ contact: { ...P.contact, restitution: v } })} />
          <Slider id="p-dt" label={L(lang, 'Timestep', 'خطوة الزمن')} value={P.dtMs} min={4} max={33} step={1} unit="ms" onChange={v => set({ dtMs: v })} />
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={P.altitudeGravity} onChange={e => set({ altitudeGravity: e.target.checked })} /> {L(lang, 'Altitude-dependent g(r)', 'جاذبية حسب الارتفاع g(r)')}</label>
        </div>
      ) : (
        <div className="space-y-2">
          <Slider id="v-den" label={L(lang, 'Render density', 'كثافة العرض')} value={P.vizDensity} min={0.1} max={1} step={0.05} onChange={v => set({ vizDensity: v })} note="Visualization only" />
          <Slider id="v-size" label={L(lang, 'Grain visual size', 'حجم الحبيبة بصريًا')} value={props.grainScale} min={0.5} max={4} step={0.1} unit="×" onChange={props.setGrainScale} />
          <Slider id="v-speed" label={L(lang, 'Sim speed', 'سرعة المحاكاة')} value={P.speed} min={0.1} max={3} step={0.1} unit="×" onChange={v => set({ speed: v })} />
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={props.showField} onChange={e => props.setShowField(e.target.checked)} /> {L(lang, 'Field vectors', 'متجهات المجال')}</label>
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={props.showTrail} onChange={e => props.setShowTrail(e.target.checked)} /> {L(lang, 'Selected trail', 'مسار المحدد')}</label>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <button className="btn btn-primary btn-sm" onClick={() => props.setRunning(!props.running)}>{props.running ? <IPause size={13} /> : <IPlay size={13} />}{props.running ? L(lang, 'Pause', 'إيقاف') : L(lang, 'Resume', 'استئناف')}</button>
        <button className="btn btn-ghost btn-sm" onClick={props.onStep}>{L(lang, 'Step', 'خطوة')}</button>
        <button className="btn btn-ghost btn-sm" onClick={props.onRestart}><IReset size={13} />{L(lang, 'Restart', 'إعادة')}</button>
        <button className="btn btn-ghost btn-sm" onClick={props.onDefaults}>{L(lang, 'Defaults', 'افتراضي')}</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button className="btn btn-ghost btn-sm" onClick={props.onCsv}><IExternal size={13} />CSV</button>
        <button className="btn btn-ghost btn-sm" onClick={props.onSave}>{L(lang, 'Save config', 'حفظ الإعداد')}</button>
      </div>
    </div>
  );
}