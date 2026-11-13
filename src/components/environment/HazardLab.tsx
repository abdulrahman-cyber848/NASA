'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/state/app';
import { HAZARDS, HAZARD_FIELDS, type HazardId } from '@/data/environment/hazards';
import { ENV_SOURCES } from '@/data/environment/sources';
import { fmtNum } from '@/services/format';
import { IInfo } from '@/components/icons';

const seed = (i: number, j: number) => Math.abs(Math.sin(i * 91.7 + j * 47.3) * 24634.6345 % 1);

function HazardViz({ id, x, tick }: { id: HazardId; x: number; tick: number }) {
  const specks = useMemo(() => Array.from({ length: 120 }, (_, i) => ({ a: seed(i, 1), b: seed(i, 2), c: seed(i, 3) })), []);
  const n = Math.floor(x * specks.length);
  const S = '#53D8E8';
  const dust = (fx: (s: { a: number; b: number; c: number }, i: number) => [number, number]) =>
    specks.slice(0, n).map((s, i) => { const [cx, cy] = fx(s, i); return <circle key={i} cx={cx} cy={cy} r={0.9 + s.c * 1.4} fill="#9A938B" opacity="0.85" />; });
  const wobble = Math.sin(tick * 3) * 3;

  switch (id) {
    case 'visor': return (
      <svg viewBox="0 0 320 190" className="w-full" aria-hidden>
        <rect width="320" height="190" rx="12" fill="#0A1322" />
        <circle cx="160" cy="150" r="90" fill="#6E675E" opacity="0.5" />
        <circle cx="120" cy="120" r="12" fill="#4A453E" opacity="0.6" /><circle cx="205" cy="135" r="8" fill="#4A453E" opacity="0.6" />
        <path d="M30 165 Q160 15 290 165" fill="rgba(212,160,23,0.10)" stroke="#D4A017" strokeWidth="2.5" />
        {dust(s => [45 + s.a * 230, 40 + s.b * 115])}
        <path d="M30 165 Q160 15 290 165" fill={`rgba(154,147,139,${x * 0.45})`} />
        <text x="160" y="182" fontSize="9" fill="#5f6f8d" textAnchor="middle">{`clarity ↓ ${Math.round(x * 100)}%`}</text>
      </svg>);
    case 'abrasion': return (
      <svg viewBox="0 0 320 190" className="w-full" aria-hidden>
        <rect width="320" height="190" rx="12" fill="#0A1322" />
        {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M20 ${40 + i * 16} h280`} stroke="#8FA6C8" strokeWidth="2" opacity="0.4" strokeDasharray="8 5" />)}
        {Array.from({ length: Math.floor(x * 14) }, (_, i) => <path key={`w${i}`} d={`M${30 + seed(i, 9) * 250} ${45 + seed(i, 8) * 110} l${8 + seed(i, 7) * 14} ${3 - seed(i, 6) * 6}`} stroke="#F87171" strokeWidth="1.4" opacity="0.8" />)}
        <g transform={`translate(${wobble},0)`}>{specks.slice(0, Math.max(6, n / 2)).map((s, i) => <path key={i} d={`M${30 + s.a * 260} ${35 + s.b * 120} l4 2 l-2 4 l-4 -2 z`} fill="#9A938B" />)}</g>
        <text x="160" y="182" fontSize="9" fill="#5f6f8d" textAnchor="middle">fibers cut per flex cycle</text>
      </svg>);
    case 'seal': return (
      <svg viewBox="0 0 320 190" className="w-full" aria-hidden>
        <rect width="320" height="190" rx="12" fill="#0A1322" />
        <rect x="30" y="55" width="260" height="26" rx="6" fill="#22334F" stroke={S} strokeWidth="1.5" />
        <rect x="30" y={84 + x * 8} width="260" height="26" rx="6" fill="#22334F" stroke={S} strokeWidth="1.5" />
        {specks.slice(0, Math.max(2, n)).map((s, i) => <circle key={i} cx={40 + s.a * 240} cy={84 + s.b * (4 + x * 8)} r={1.2 + s.c * 1.6} fill="#9A938B" />)}
        {x > 0.25 && Array.from({ length: 4 }, (_, i) => <path key={i} d={`M${70 + i * 60} ${86 + x * 8} v${14 + x * 18}`} stroke="#F87171" strokeWidth="1.6" strokeDasharray="3 3" opacity={0.4 + x * 0.6} markerEnd="" />)}
        <text x="160" y="30" fontSize="10" fill={x > 0.5 ? '#F87171' : '#AAB6CC'} textAnchor="middle">{x > 0.5 ? '⚠ leak path forming' : 'seal interface'}</text>
      </svg>);
    case 'joint': {
      const ang = tick * (1.6 - x * 1.3);
      return (
        <svg viewBox="0 0 320 190" className="w-full" aria-hidden>
          <rect width="320" height="190" rx="12" fill="#0A1322" />
          <circle cx="160" cy="95" r="62" fill="none" stroke={S} strokeWidth="2.5" opacity="0.7" />
          <circle cx="160" cy="95" r="34" fill="#22334F" stroke="#8FA6C8" strokeWidth="2" />
          {Array.from({ length: 8 }, (_, i) => { const a = ang + i * Math.PI / 4; return <circle key={i} cx={160 + 48 * Math.cos(a)} cy={95 + 48 * Math.sin(a)} r="7" fill="#B9C2D4" stroke="#4A5568" />; })}
          {specks.slice(0, n).map((s, i) => { const a = s.a * 6.28 + ang * 0.3; return <circle key={i} cx={160 + (40 + s.b * 18) * Math.cos(a)} cy={95 + (40 + s.b * 18) * Math.sin(a)} r={1 + s.c} fill="#9A938B" />; })}
          <path d={`M160 95 m -70 0 a70 70 0 0 1 ${70 * x} ${-20 * x}`} stroke="#F5B85C" strokeWidth={1 + x * 3} fill="none" opacity={0.3 + x * 0.6} />
          <text x="160" y="182" fontSize="9" fill="#5f6f8d" textAnchor="middle">rotation slows as grit enters the race</text>
        </svg>);
    }
    case 'habitat': return (
      <svg viewBox="0 0 320 190" className="w-full" aria-hidden>
        <rect width="320" height="190" rx="12" fill="#0A1322" />
        <rect x="20" y="25" width="280" height="140" rx="10" fill="rgba(20,36,58,0.6)" stroke={S} strokeWidth="1.5" />
        <rect x="20" y="25" width="70" height="140" rx="10" fill="rgba(83,216,232,0.06)" stroke={S} strokeWidth="1" strokeDasharray="4 3" />
        <text x="55" y="45" fontSize="8" fill="#7fe4f0" textAnchor="middle">airlock</text>
        <rect x="252" y="40" width="34" height="40" rx="4" fill="#22334F" stroke="#4ADE80" strokeWidth="1.5" />
        <text x="269" y="63" fontSize="7" fill="#86EFAC" textAnchor="middle">HEPA</text>
        <rect x="120" y="90" width="14" height="42" rx="6" fill="#E8ECF4" /><circle cx="127" cy="82" r="8" fill="#E8ECF4" />
        {specks.slice(0, n).map((s, i) => <circle key={i} cx={30 + ((s.a * 260 + tick * (6 + s.c * 10)) % 258)} cy={35 + s.b * 120} r={0.8 + s.c} fill="#9A938B" opacity="0.7" />)}
      </svg>);
    case 'thermal': return (
      <svg viewBox="0 0 320 190" className="w-full" aria-hidden>
        <rect width="320" height="190" rx="12" fill="#0A1322" />
        {Array.from({ length: 9 }, (_, i) => <rect key={i} x={28 + i * 30} y="55" width="18" height="100" fill="rgba(232,236,244,0.12)" stroke="#B9C2D4" strokeWidth="1.3" />)}
        <rect x="24" y={55} width="272" height={x * 100} fill="rgba(154,147,139,0.55)" />
        {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${45 + i * 46} 50 q4 -8 0 -16 q-4 -8 0 -16`} stroke="#F5B85C" strokeWidth="1.6" fill="none" opacity={Math.max(0.08, 0.8 - x * 0.75)} />)}
        <text x="160" y="178" fontSize="9" fill={x > 0.5 ? '#F5B85C' : '#5f6f8d'} textAnchor="middle">{`heat rejection ↓ ${Math.round(x * 60)}% (model)`}</text>
      </svg>);
    case 'solar': return (
      <svg viewBox="0 0 320 190" className="w-full" aria-hidden>
        <rect width="320" height="190" rx="12" fill="#0A1322" />
        {Array.from({ length: 5 }, (_, i) => <path key={i} d={`M${40 + i * 60} 8 l0 ${26 - x * 14}`} stroke="#F5B85C" strokeWidth="2" opacity={1 - x * 0.7} />)}
        {Array.from({ length: 6 }, (_, c) => Array.from({ length: 2 }, (_, r) => <rect key={`${c}${r}`} x={25 + c * 46} y={45 + r * 58} width="42" height="54" fill={`rgba(62,127,193,${0.3 - x * 0.2})`} stroke="#3E7FC1" strokeWidth="1.3" />))}
        <rect x="22" y="42" width="278" height="118" fill={`rgba(154,147,139,${x * 0.5})`} />
        <rect x="25" y="170" width={270 * (1 - x * 0.7)} height="8" rx="4" fill={x > 0.6 ? '#F87171' : '#4ADE80'} />
        <text x="160" y="167" fontSize="8" fill="#AAB6CC" textAnchor="middle">{`power ≈ ${Math.round(100 * (1 - x * 0.7))}% (illustrative)`}</text>
      </svg>);
  }
}

export default function HazardLab() {
  const { t, lang } = useApp();
  const [active, setActive] = useState<HazardId>('visor');
  const [exposure, setExposure] = useState(0.35);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) { last = now; return; }
      if (now - last > 66) { setTick(v => v + (now - last) / 1000); last = now; }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const hz = HAZARDS.find(h => h.id === active)!;
  const severity = Math.min(1, exposure * (active === 'seal' ? 1.15 : 0.95));
  const src = ENV_SOURCES[active === 'visor' || active === 'abrasion' || active === 'habitat' ? 1 : 0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('env.hazards.title')}>
        {HAZARDS.map(h => (
          <button key={h.id} role="tab" aria-selected={active === h.id} className="chip"
            style={active === h.id ? { borderColor: 'rgba(83,216,232,0.6)', background: 'rgba(83,216,232,0.12)', color: '#9EE8F2' } : undefined}
            onClick={() => setActive(h.id)}>
            <span className="h-display font-bold">{h.letter}</span> {h.title[lang]}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <HazardViz id={active} x={exposure} tick={tick} />
          <div>
            <label className="lbl" htmlFor="hz-exp">{t('env.hazards.exposure')} · {fmtNum(exposure * 100, lang, 0)}%</label>
            <input id="hz-exp" type="range" min={0} max={1} step={0.02} value={exposure} className="w-full" onChange={e => setExposure(Number(e.target.value))} />
          </div>
          <div>
            <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--color-dim)' }}>
              <span>{t('env.hazards.severity')}</span>
              <span style={{ color: severity > 0.66 ? '#F87171' : severity > 0.33 ? '#F5B85C' : '#86EFAC' }}>
                {severity > 0.66 ? '●●●' : severity > 0.33 ? '●●○' : '●○○'}
              </span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${severity * 100}%`, background: severity > 0.66 ? 'linear-gradient(90deg,#F5B85C,#F87171)' : undefined }} /></div>
          </div>
          {active === 'seal' && (
            <p className="flex gap-2 rounded-xl border p-3 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(248,113,113,0.45)', background: 'rgba(248,113,113,0.07)', color: '#FCA5A5' }}>
              <IInfo size={15} className="shrink-0 mt-0.5" /> {t('env.hazards.sealWarning')}
            </p>
          )}
        </div>

        <div className="glass-deep p-4 space-y-2.5 max-h-[430px] overflow-y-auto">
          <h3 className="h-display font-bold text-lg">{hz.letter} · {hz.title[lang]}</h3>
          {HAZARD_FIELDS.map(f => (
            <div key={f} className="rounded-lg border p-2.5" style={{ borderColor: 'var(--line)', background: 'rgba(8,14,27,0.4)' }}>
              <p className="lbl !mb-1" style={{ color: f === 'residual' ? '#F5B85C' : f === 'mitigation' ? '#86EFAC' : undefined }}>{t(`env.field.${f}`)}</p>
              <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--color-snow)' }}>{hz[f][lang]}</p>
            </div>
          ))}
          <p className="text-[10.5px] pt-1" style={{ color: '#5f6f8d' }}>
            <a className="ref-link" href={src.url} target="_blank" rel="noopener noreferrer">{src.label} ↗</a> · {src.publisher}
          </p>
        </div>
      </div>
    </div>
  );
}