'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/state/app';
import { thermalBalance, electrostaticForce, grainMass, grainVerticalAccel, LUNAR_G } from '@/services/dustPhysics';
import { fmtNum } from '@/services/format';
import { Seg } from '@/components/ui';
import { IPlay, IReset, IInfo } from '@/components/icons';

type Demo = 'pressure' | 'thermal' | 'electro' | 'mech' | 'rad';

function PressureDemo({ tick }: { tick: number }) {
  const { t, lang } = useApp();
  const [kpa, setKpa] = useState(30);
  const dots = useMemo(() => Array.from({ length: 90 }, (_, i) => ({ a: Math.abs(Math.sin(i * 12.9) * 43758 % 1), b: Math.abs(Math.sin(i * 78.2) * 12543 % 1), s: 0.5 + Math.abs(Math.sin(i * 3.7) * 999 % 1) })), []);
  const n = Math.floor((kpa / 60) * dots.length);
  const speed = 0.4 + kpa / 40;
  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
      <svg viewBox="0 0 320 210" className="w-full rounded-xl" style={{ background: '#070C16', border: '1px solid var(--line)' }} aria-hidden>
        <text x="160" y="18" fontSize="9" fill="#5f6f8d" textAnchor="middle">{t('env.ph.external')}</text>
        {[...Array(6)].map((_, i) => <circle key={i} cx={20 + i * 56} cy={30 + (i % 2) * 8} r="1" fill="#3d4c68" />)}
        <rect x="70" y="45" width="180" height="140" rx="40" fill="rgba(83,216,232,0.05)" stroke="#8FA6C8" strokeWidth={2 + kpa / 20} />
        <rect x="80" y="55" width="160" height="120" rx="34" fill="none" stroke="#53D8E8" strokeWidth="1.4" strokeDasharray="5 4" />
        {dots.slice(0, n).map((d, i) => {
          const x = 90 + ((d.a * 140 + tick * 22 * speed * (i % 2 ? 1 : -1)) % 140 + 140) % 140;
          const y = 65 + ((d.b * 100 + tick * 17 * speed * (i % 3 ? 1 : -1)) % 100 + 100) % 100;
          return <circle key={i} cx={x} cy={y} r={1.4} fill="#7fe4f0" opacity="0.85" />;
        })}
        {[...Array(8)].map((_, i) => { const a = i * Math.PI / 4; const cx = 160 + 92 * Math.cos(a), cy = 115 + 72 * Math.sin(a); return <path key={i} d={`M${cx} ${cy} l${Math.cos(a) * (4 + kpa / 6)} ${Math.sin(a) * (4 + kpa / 6)}`} stroke="#F5B85C" strokeWidth="1.6" />; })}
        <text x="160" y="200" fontSize="9" fill="#AAB6CC" textAnchor="middle">{t('env.ph.delta')}: ≈{fmtNum(kpa, lang, 0)} kPa</text>
      </svg>
      <div className="space-y-3">
        <div>
          <label className="lbl" htmlFor="pr-kpa">{t('env.ph.internal')} · {fmtNum(kpa, lang, 0)} kPa</label>
          <input id="pr-kpa" type="range" min={10} max={60} step={1} value={kpa} className="w-full" onChange={e => setKpa(Number(e.target.value))} />
        </div>
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>
          {lang === 'ar'
            ? 'يحفظ غشاء الضغط الغاز ضد الفراغ؛ الإجهاد في الجدار يزداد مع الضغط ونصف القطر، وأي ثقب يفتح مسار تسرب. لذلك تُغطى الأختام وتُفحص دوريًا.'
            : 'The bladder holds gas against vacuum; wall stress grows with pressure and radius, and any puncture opens a leak path. That is why seals are covered and leak-checked.'}
        </p>
        <p className="chip chip-amber">{t('env.ph.kpaNote')}</p>
      </div>
    </div>
  );
}

function ThermalDemo() {
  const { t, lang } = useApp();
  const [met, setMet] = useState(300);
  const [sun, setSun] = useState(0.6);
  const [abs, setAbs] = useState(0.35);
  const [temp, setTemp] = useState(300);
  const [dust, setDust] = useState(0.2);
  const [lcvg, setLcvg] = useState(true);
  const r = thermalBalance({ metabolicW: met, sunlitFraction: sun, absorptivity: abs, radiatorTempK: temp, dustCoverage: dust, liquidCoolingW: lcvg ? 200 : 0 });
  const status = r.netW > 40 ? 'env.ph.heating' : r.netW < -40 ? 'env.ph.cooling' : 'env.ph.balanced';
  const bars = [
    { label: t('env.ph.metabolic'), v: met, c: '#F5B85C' },
    { label: '☀ ' + (lang === 'ar' ? 'شمس ممتصة' : 'absorbed sun'), v: r.solarW, c: '#F87171' },
    { label: (lang === 'ar' ? 'إشعاع مطرود' : 'radiated out'), v: r.radiatedW, c: '#53D8E8' },
    { label: t('env.ph.lcvg'), v: r.coolingW, c: '#6B8DFF' },
  ];
  const max = Math.max(...bars.map(b => b.v), 1);
  const S = ({ id, v, set, min, max, step, label, fmt }: { id: string; v: number; set: (n: number) => void; min: number; max: number; step: number; label: string; fmt: string }) => (
    <div>
      <label className="lbl" htmlFor={id}>{label} · {fmtNum(v, lang, step < 1 ? 2 : 0)}{fmt}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={v} className="w-full" onChange={e => set(Number(e.target.value))} />
    </div>
  );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2.5">
        <S id="th-met" v={met} set={setMet} min={100} max={500} step={10} label={t('env.ph.metabolic')} fmt=" W" />
        <S id="th-sun" v={sun} set={setSun} min={0} max={1} step={0.05} label={t('env.ph.sunfrac')} fmt="" />
        <S id="th-abs" v={abs} set={setAbs} min={0.2} max={0.9} step={0.05} label={t('env.ph.absorp')} fmt="" />
        <S id="th-temp" v={temp} set={setTemp} min={280} max={330} step={1} label={t('env.ph.radtemp')} fmt=" K" />
        <S id="th-dust" v={dust} set={setDust} min={0} max={1} step={0.05} label={t('env.ph.dustcov')} fmt="" />
        <button className="btn btn-ghost btn-sm" aria-pressed={lcvg} onClick={() => setLcvg(v => !v)} style={lcvg ? { borderColor: 'rgba(83,216,232,0.55)', background: 'rgba(83,216,232,0.08)' } : undefined}>
          {t('env.ph.lcvg')}: {lcvg ? 'ON' : 'OFF'}
        </button>
      </div>
      <div className="space-y-2">
        {bars.map(b => (
          <div key={b.label}>
            <div className="flex justify-between text-[11px]" style={{ color: 'var(--color-dim)' }}><span>{b.label}</span><span>{fmtNum(b.v, lang, 0)} W</span></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${(b.v / max) * 100}%`, background: b.c }} /></div>
          </div>
        ))}
        <div className="rounded-xl border p-3 mt-2" style={{ borderColor: r.netW > 40 ? 'rgba(248,113,113,0.5)' : 'var(--line)', background: 'rgba(8,14,27,0.5)' }}>
          <p className="h-display text-lg font-bold" style={{ color: r.netW > 40 ? '#F87171' : r.netW < -40 ? '#7fe4f0' : '#86EFAC' }}>
            {t('env.ph.net')}: {r.netW > 0 ? '+' : ''}{fmtNum(r.netW, lang, 0)} W
          </p>
          <p className="text-[12px]" style={{ color: 'var(--color-dim)' }}>{t(status)}</p>
        </div>
        <p className="text-[10.5px] leading-relaxed" style={{ color: '#5f6f8d' }}>{t('env.ph.assumptions')}</p>
      </div>
    </div>
  );
}

function ElectroDemo() {
  const { t, lang } = useApp();
  const [q, setQ] = useState(60);   // fC
  const [E, setE] = useState(60);   // kV/m
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ y: 0.02, v: 0, launched: false });
  const qRef = useRef(q); qRef.current = q;
  const eRef = useRef(E); eRef.current = E;
  const R = 50e-6;
  const qC = q * 1e-15, eV = E * 1000;
  const F = electrostaticForce(qC, eV);
  const a = grainVerticalAccel(qC, eV, R);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const s = state.current;
      const acc = grainVerticalAccel(qRef.current * 1e-15, eRef.current * 1000, R);
      if (s.launched) {
        s.v += acc * dt; s.y += s.v * dt;
        if (s.y <= 0.02) { s.y = 0.02; s.v = 0; }
        if (s.y > 1.6) { s.y = 1.6; s.v = 0; }
      }
      const W = c.width = c.clientWidth * 1.5, H = c.height = c.clientHeight * 1.5;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#070C16'; ctx.fillRect(0, 0, W, H);
      const gY = H * 0.86, scale = H * 0.5;
      const charge = qRef.current;
      ctx.fillStyle = `rgba(83,216,232,${0.25 + Math.min(0.5, Math.abs(charge) / 150)})`;
      ctx.fillRect(W * 0.15, gY, W * 0.7, 6);
      ctx.strokeStyle = 'rgba(83,216,232,0.3)';
      for (let i = 0; i < 6; i++) { const x = W * 0.2 + i * W * 0.12; ctx.beginPath(); ctx.moveTo(x, gY); ctx.lineTo(x, gY - H * 0.55); ctx.stroke(); const up = charge * eRef.current >= 0; ctx.beginPath(); ctx.moveTo(x, up ? gY - H * 0.55 : gY - 4); ctx.lineTo(x - 3, up ? gY - H * 0.55 + 7 : gY - 11); ctx.lineTo(x + 3, up ? gY - H * 0.55 + 7 : gY - 11); ctx.fillStyle = 'rgba(83,216,232,0.5)'; ctx.fill(); }
      const gy = gY - s.y * scale;
      ctx.beginPath(); ctx.arc(W / 2, gy, 7, 0, 7);
      ctx.fillStyle = charge >= 0 ? '#F5B85C' : '#929AFF'; ctx.fill();
      ctx.strokeStyle = '#081020'; ctx.stroke();
      ctx.fillStyle = '#AAB6CC'; ctx.font = '11px Inter';
      ctx.fillText(`g = ${LUNAR_G} m/s²`, 10, H - 10);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
      <canvas ref={ref} className="w-full h-[220px] rounded-xl" style={{ border: '1px solid var(--line)' }} aria-label="Charged grain in electric field" />
      <div className="space-y-2.5">
        <div>
          <label className="lbl" htmlFor="el-q">{t('env.ph.q')} · {fmtNum(q, lang, 0)} fC</label>
          <input id="el-q" type="range" min={-100} max={100} step={5} value={q} className="w-full" onChange={e => setQ(Number(e.target.value))} />
        </div>
        <div>
          <label className="lbl" htmlFor="el-e">{t('env.ph.efield')} · {fmtNum(E, lang, 0)} kV/m</label>
          <input id="el-e" type="range" min={0} max={100} step={5} value={E} className="w-full" onChange={e => setE(Number(e.target.value))} />
        </div>
        <div className="flex flex-wrap gap-2 text-[12px]">
          <span className="chip chip-cy">{t('env.ph.force')} = {fmtNum(F * 1e12, lang, 2)} pN</span>
          <span className="chip">{t('env.ph.accel')} = {fmtNum(a, lang, 2)} m/s²</span>
          <span className={`chip ${a > 0 ? 'chip-ok' : 'chip-amber'}`}>{t(a > 0 ? 'env.ph.lifts' : 'env.ph.settles')}</span>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm" onClick={() => { state.current = { y: 0.02, v: 0, launched: true }; }}><IPlay size={14} /> {t('env.ph.launch')}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { state.current = { y: 0.02, v: 0, launched: false }; }}><IReset size={14} /> {t('common.reset')}</button>
        </div>
        <p className="text-[10.5px] leading-relaxed" style={{ color: '#5f6f8d' }}>{t('env.ph.simplified')} · {lang === 'ar' ? 'نصف قطر الحبة 50 ميكرومتر، كثافة 3100 كغ/م³.' : 'Grain radius 50 µm, density 3100 kg/m³.'}</p>
      </div>
    </div>
  );
}

function MechDemo({ tick }: { tick: number }) {
  const { t, lang } = useApp();
  const [dust, setDust] = useState(0.3);
  const [flex, setFlex] = useState(30);
  const [wear, setWear] = useState(0);
  const dRef = useRef(dust); dRef.current = dust;
  useEffect(() => {
    const iv = setInterval(() => setWear(w => w + dRef.current * 2), 500);
    return () => clearInterval(iv);
  }, []);
  const ang = tick * (1.8 / (1 + dust * 4));
  const torque = 1 + dust * 5;
  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
      <svg viewBox="0 0 320 200" className="w-full rounded-xl" style={{ background: '#070C16', border: '1px solid var(--line)' }} aria-hidden>
        <circle cx="110" cy="100" r="64" fill="none" stroke="#53D8E8" strokeWidth="2.5" opacity="0.7" />
        <circle cx="110" cy="100" r="34" fill="#22334F" stroke="#8FA6C8" strokeWidth="2" />
        {[...Array(8)].map((_, i) => { const a = ang + i * Math.PI / 4; return <circle key={i} cx={110 + 49 * Math.cos(a)} cy={100 + 49 * Math.sin(a)} r="7" fill="#B9C2D4" stroke="#4A5568" />; })}
        {[...Array(Math.floor(dust * 60))].map((_, i) => { const a = Math.abs(Math.sin(i * 91.7) * 6.28) + ang * 0.3; const r = 41 + Math.abs(Math.sin(i * 47.3)) * 16; return <circle key={i} cx={110 + r * Math.cos(a)} cy={100 + r * Math.sin(a)} r={1 + (i % 3) * 0.5} fill="#9A938B" />; })}
        {/* flexing arm */}
        <g transform={`translate(240 60) rotate(${flex})`}>
          <rect x="-8" y="0" width="16" height="80" rx="8" fill="#E8ECF4" />
          <circle cx="0" cy="0" r="12" fill="none" stroke="#53D8E8" strokeWidth="3" />
        </g>
        <text x="240" y="170" fontSize="9" fill="#AAB6CC" textAnchor="middle">{fmtNum(flex, lang, 0)}°</text>
      </svg>
      <div className="space-y-2.5">
        <div>
          <label className="lbl" htmlFor="me-dust">{t('env.ph.dustlevel')} · {fmtNum(dust * 100, lang, 0)}%</label>
          <input id="me-dust" type="range" min={0} max={1} step={0.05} value={dust} className="w-full" onChange={e => setDust(Number(e.target.value))} />
        </div>
        <div>
          <label className="lbl" htmlFor="me-flex">{t('env.ph.flex')} · {fmtNum(flex, lang, 0)}°</label>
          <input id="me-flex" type="range" min={0} max={90} step={5} value={flex} className="w-full" onChange={e => setFlex(Number(e.target.value))} />
        </div>
        <div className="flex flex-wrap gap-2 text-[12px]">
          <span className="chip chip-amber">{t('env.ph.friction')} ×{fmtNum(torque, lang, 1)}</span>
          <span className="chip">{t('env.ph.wear')}: {fmtNum(wear, lang, 0)}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setWear(0)}><IReset size={14} /> {t('common.reset')}</button>
        <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t('env.ph.pressureResist')}</p>
      </div>
    </div>
  );
}

function RadDemo() {
  const { t, lang } = useApp();
  const [threat, setThreat] = useState<'uv' | 'spe' | 'gcr' | 'micro'>('uv');
  const layers = [
    { id: 'outer', c: '#E8ECF4' }, { id: 'tmg', c: '#C8A24A' }, { id: 'restraint', c: '#4A5568' }, { id: 'bladder', c: '#8FA6C8' }, { id: 'lcvg', c: '#3E7FC1' },
  ];
  const depth = threat === 'uv' ? 0 : threat === 'micro' ? 1 : threat === 'spe' ? 2 : 5;
  const result = threat === 'gcr' ? 'env.ph.rad.passes' : threat === 'spe' ? 'env.ph.rad.partial' : 'env.ph.rad.stopped';
  const names = { uv: t('env.ph.rad.uv'), spe: t('env.ph.rad.spe'), gcr: t('env.ph.rad.gcr'), micro: t('env.ph.rad.micro') };
  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
      <svg viewBox="0 0 320 200" className="w-full rounded-xl" style={{ background: '#070C16', border: '1px solid var(--line)' }} aria-hidden>
        {layers.map((l, i) => <rect key={l.id} x={70 + i * 36} y="30" width="30" height="140" rx="6" fill={l.c} fillOpacity="0.75" />)}
        <path d={`M14 100 H${70 + Math.min(depth, 5) * 36 + (depth >= 5 ? 36 : 14)}`} stroke={threat === 'gcr' ? '#F87171' : threat === 'spe' ? '#F5B85C' : '#53D8E8'} strokeWidth="3" strokeDasharray={threat === 'micro' ? '2 4' : '8 4'} />
        <path d={`M${70 + Math.min(depth, 5) * 36 + (depth >= 5 ? 36 : 14)} 100 l-8 -5 v10 z`} fill={threat === 'gcr' ? '#F87171' : '#53D8E8'} />
        {depth < 5 && <circle cx={70 + depth * 36 + 14} cy="100" r={10} fill="none" stroke="#F5B85C" strokeWidth="1.5" opacity="0.8" />}
        <text x="160" y="190" fontSize="9" fill="#5f6f8d" textAnchor="middle">{lang === 'ar' ? 'الخارج ← الداخل' : 'outside → inside'}</text>
      </svg>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(names) as (keyof typeof names)[]).map(k => (
            <button key={k} className="chip" aria-pressed={threat === k} style={threat === k ? { borderColor: 'rgba(83,216,232,0.6)', background: 'rgba(83,216,232,0.12)', color: '#9EE8F2' } : undefined} onClick={() => setThreat(k)}>{names[k]}</button>
          ))}
        </div>
        <span className={`chip ${threat === 'gcr' ? 'chip-danger' : threat === 'spe' ? 'chip-amber' : 'chip-ok'}`}>{t(result)}</span>
        <p className="flex gap-2 text-[12px] leading-relaxed" style={{ color: 'var(--color-dim)' }}><IInfo size={15} className="shrink-0 mt-0.5 text-[#F5B85C]" /> {t('env.ph.rad.limit')}</p>
      </div>
    </div>
  );
}

export default function PhysicsDemos() {
  const { t } = useApp();
  const [demo, setDemo] = useState<Demo>('pressure');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let raf = 0, last = performance.now();
    const loop = (now: number) => { raf = requestAnimationFrame(loop); if (document.hidden) { last = now; return; } if (now - last > 50) { setTick(v => v + (now - last) / 1000); last = now; } };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="space-y-4">
      <Seg<Demo> className="flex-wrap" label={t('env.physics.title')} value={demo} onChange={setDemo} options={[
        { value: 'pressure', label: t('env.ph.pressure') },
        { value: 'thermal', label: t('env.ph.thermal') },
        { value: 'electro', label: t('env.ph.electro') },
        { value: 'mech', label: t('env.ph.mech') },
        { value: 'rad', label: t('env.ph.rad') },
      ]} />
      <div className="glass-deep p-4">
        {demo === 'pressure' && <PressureDemo tick={tick} />}
        {demo === 'thermal' && <ThermalDemo />}
        {demo === 'electro' && <ElectroDemo />}
        {demo === 'mech' && <MechDemo tick={tick} />}
        {demo === 'rad' && <RadDemo />}
      </div>
    </div>
  );
}