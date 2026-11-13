'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useApp } from '@/state/app';
import { ADHESION_SURFACES, dustCoverage, type AdhesionSurfaceId } from '@/services/dustPhysics';
import { fmtNum } from '@/services/format';
import { Seg } from '@/components/ui';
import { IReset, ISun } from '@/components/icons';

const seed = (i: number, j: number) => Math.abs(Math.sin(i * 127.1 + j * 311.7) * 43758.5453 % 1);

function SurfaceArt({ id, coverage }: { id: AdhesionSurfaceId; coverage: number }) {
  const specks = useMemo(() => Array.from({ length: 260 }, (_, i) => ({
    x: 12 + seed(i, 1) * 276, y: 12 + seed(i, 2) * 156, r: 0.8 + seed(i, 3) * 1.6,
  })), []);
  const n = Math.floor(coverage * specks.length);
  const stroke = '#53D8E8';
  return (
    <svg viewBox="0 0 300 180" className="w-full rounded-xl" style={{ background: 'rgba(8,14,27,0.7)', border: '1px solid var(--line)' }} aria-hidden>
      {id === 'visor' && <path d="M40 140 Q150 10 260 140" fill="none" stroke={stroke} strokeWidth="3" opacity="0.8" />}
      {id === 'visor' && <path d="M55 140 Q150 30 245 140" fill="rgba(212,160,23,0.12)" stroke="#D4A017" strokeWidth="1.5" />}
      {id === 'suit' && Array.from({ length: 9 }, (_, i) => <path key={i} d={`M20 ${25 + i * 16} h260`} stroke={stroke} strokeWidth="1" opacity="0.35" strokeDasharray="6 4" />)}
      {id === 'suit' && Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${25 + i * 19} 15 v150`} stroke="#8FA6C8" strokeWidth="1" opacity="0.3" strokeDasharray="5 5" />)}
      {id === 'camera' && <><circle cx="150" cy="90" r="62" fill="none" stroke={stroke} strokeWidth="3" opacity="0.8" /><circle cx="150" cy="90" r="44" fill="rgba(83,216,232,0.07)" stroke={stroke} strokeWidth="1.2" /><circle cx="150" cy="90" r="20" fill="rgba(107,141,255,0.15)" stroke="#6B8DFF" /></>}
      {id === 'solar' && Array.from({ length: 6 }, (_, c) => Array.from({ length: 3 }, (_, r) => <rect key={`${c}${r}`} x={22 + c * 44} y={22 + r * 47} width="40" height="43" fill="rgba(62,127,193,0.22)" stroke="#3E7FC1" strokeWidth="1.2" />))}
      {id === 'radiator' && Array.from({ length: 10 }, (_, i) => <rect key={i} x={20 + i * 27} y="20" width="16" height="140" fill="rgba(232,236,244,0.1)" stroke="#B9C2D4" strokeWidth="1.2" />)}
      {id === 'connector' && <><rect x="60" y="55" width="180" height="70" rx="10" fill="none" stroke={stroke} strokeWidth="2.5" opacity="0.8" />{Array.from({ length: 6 }, (_, i) => <circle key={i} cx={90 + i * 24} cy="90" r="6" fill="rgba(212,160,23,0.3)" stroke="#D4A017" strokeWidth="1.5" />)}</>}
      {specks.slice(0, n).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#9A938B" opacity="0.85" />)}
    </svg>
  );
}

export default function AdhesionDemo() {
  const { t, lang } = useApp();
  const [surface, setSurface] = useState<AdhesionSurfaceId>('visor');
  const [charge, setCharge] = useState(0.6);
  const [elapsed, setElapsed] = useState(0);
  const [sweep, setSweep] = useState(0); // 0 idle, >0 animating
  const chargeRef = useRef(charge); chargeRef.current = charge;

  useEffect(() => {
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) { last = now; return; }
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      setElapsed(e => e + dt * (0.4 + chargeRef.current));
      setSweep(s => (s > 0 ? Math.max(0, s - dt * 1.4) : 0));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const affinity = ADHESION_SURFACES.find(s => s.id === surface)!.affinity;
  const coverage = dustCoverage(elapsed, affinity, charge);
  const data = ADHESION_SURFACES.map(s => ({
    id: s.id, name: t(`env.surf.${s.id}`),
    pct: Math.round(dustCoverage(elapsed, s.affinity, charge) * 100),
  }));

  const clean = () => { setSweep(1); setTimeout(() => setElapsed(e => e * 0.22), 550); };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('env.adhesion.surface')}>
          {ADHESION_SURFACES.map(s => (
            <button key={s.id} className="chip" aria-pressed={surface === s.id}
              style={surface === s.id ? { borderColor: 'rgba(83,216,232,0.6)', background: 'rgba(83,216,232,0.12)', color: '#9EE8F2' } : undefined}
              onClick={() => setSurface(s.id)}>
              {t(`env.surf.${s.id}`)}
            </button>
          ))}
        </div>
        <div className="relative">
          <SurfaceArt id={surface} coverage={coverage} />
          {sweep > 0 && (
            <div className="pointer-events-none absolute inset-y-0 w-10 rounded"
              style={{ insetInlineStart: `${(1 - sweep) * 92}%`, background: 'linear-gradient(90deg, transparent, rgba(83,216,232,0.55), transparent)' }} />
          )}
          <span className="absolute top-2 end-2 chip chip-cy">{t('env.adhesion.coverage')}: {fmtNum(coverage * 100, lang, 0)}%</span>
        </div>
        <div>
          <label className="lbl" htmlFor="adh-charge">{t('env.charge')} · {fmtNum(charge * 100, lang, 0)}%</label>
          <input id="adh-charge" type="range" min={0} max={1} step={0.05} value={charge} className="w-full" onChange={e => setCharge(Number(e.target.value))} />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm" onClick={clean}><ISun size={14} /> {t('env.adhesion.clean')}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setElapsed(0)}><IReset size={14} /> {t('common.reset')}</button>
        </div>
        <p className="text-[11px]" style={{ color: '#5f6f8d' }}>{t('env.adhesion.qualitative')}</p>
      </div>
      <div>
        <p className="lbl">{t('env.adhesion.compare')}</p>
        <div className="h-[280px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 30, bottom: 0, left: 8 }}>
              <XAxis type="number" domain={[0, 100]} stroke="#5f6f8d" fontSize={10.5} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="name" width={110} stroke="#AAB6CC" fontSize={10.5} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(107,141,255,0.08)' }} contentStyle={{ background: '#0c1729', border: '1px solid rgba(107,141,255,0.34)', borderRadius: 10, fontSize: 12 }} formatter={(v) => [`${v}%`, t('env.adhesion.coverage')]} />
              <Bar dataKey="pct" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                {data.map(d => <Cell key={d.id} fill={d.id === surface ? '#53D8E8' : '#3E5F8F'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Seg label={t('env.adhesion.surface')} value={surface} onChange={v => setSurface(v)} className="mt-2 lg:hidden"
          options={ADHESION_SURFACES.slice(0, 3).map(s => ({ value: s.id, label: t(`env.surf.${s.id}`) }))} />
      </div>
    </div>
  );
}