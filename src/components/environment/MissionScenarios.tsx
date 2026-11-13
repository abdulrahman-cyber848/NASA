'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/state/app';
import { MISSIONS, type MissionViz } from '@/data/environment/missions';
import { IPlay, IPause, IReset, IInfo } from '@/components/icons';

function MissionViz({ viz, tick, playing }: { viz: MissionViz; tick: number; playing: boolean }) {
  const t = playing ? tick : 0;
  const ax = 40 + ((t * 26) % 200);
  const dust = (cx: number, cy: number, n: number) => [...Array(n)].map((_, i) => {
    const ph = (t * 2 + i * 0.7) % 2; const a = 0.6 + i * 0.35;
    const x = cx - ph * 26 * Math.cos(a); const y = cy - (ph * 30 * Math.sin(a) - 0.81 * ph * ph); // ½·g_moon
    return ph < 1.6 ? <circle key={i} cx={x} cy={y} r="1.4" fill="#9A938B" opacity={1 - ph / 1.8} /> : null;
  });
  return (
    <svg viewBox="0 0 320 170" className="w-full rounded-xl" style={{ background: '#070C16', border: '1px solid var(--line)' }} aria-hidden>
      <rect y="130" width="320" height="40" fill="#6E675E" />
      {viz === 'walk' && <><rect x={ax} y="92" width="10" height="30" rx="4" fill="#E8ECF4" /><circle cx={ax + 5} cy="86" r="7" fill="#E8ECF4" />{dust(ax, 128, 8)}</>}
      {viz === 'instrument' && <><rect x="250" y="86" width="26" height="44" rx="4" fill="#22334F" stroke="#53D8E8" /><circle cx="263" cy="82" r="9" fill="none" stroke="#53D8E8" strokeWidth="2" /><rect x={ax} y="92" width="10" height="30" rx="4" fill="#E8ECF4" /><circle cx={ax + 5} cy="86" r="7" fill="#E8ECF4" />{dust(ax + 10, 128, 7)}</>}
      {viz === 'rover' && <><rect x={ax - 40} y="106" width="34" height="12" rx="3" fill="#B9C2D4" /><circle cx={ax - 32} cy="122" r="6" fill="#4A5568" /><circle cx={ax - 14} cy="122" r="6" fill="#4A5568" />{dust(ax - 44, 126, 10)}<rect x="270" y="92" width="10" height="30" rx="4" fill="#E8ECF4" /><circle cx="275" cy="86" r="7" fill="#E8ECF4" /></>}
      {viz === 'airlock' && <><rect x="200" y="50" width="100" height="80" rx="8" fill="rgba(20,36,58,0.7)" stroke="#53D8E8" /><rect x="200" y="50" width="34" height="80" fill="rgba(83,216,232,0.07)" stroke="#53D8E8" strokeDasharray="4 3" /><rect x={Math.min(ax + 60, 240)} y="92" width="10" height="30" rx="4" fill="#E8ECF4" /><circle cx={Math.min(ax + 65, 245)} cy="86" r="7" fill="#E8ECF4" />{[...Array(10)].map((_, i) => <circle key={i} cx={210 + ((t * 12 + i * 17) % 84)} cy={60 + (i * 13) % 60} r="1.1" fill="#9A938B" opacity="0.7" />)}</>}
      {viz === 'seal' && <><rect x="70" y="70" width="180" height="20" rx="5" fill="#22334F" stroke="#53D8E8" /><rect x="70" y="94" width="180" height="20" rx="5" fill="#22334F" stroke="#53D8E8" />{[...Array(12)].map((_, i) => <circle key={i} cx={80 + i * 15} cy={91 + Math.sin(t * 2 + i) * 1.5} r="1.6" fill="#9A938B" />)}<text x="160" y="55" fontSize="9" fill="#AAB6CC" textAnchor="middle">sealing face</text></>}
    </svg>
  );
}

export default function MissionScenarios() {
  const { t, lang } = useApp();
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let raf = 0, last = performance.now();
    const loop = (now: number) => { raf = requestAnimationFrame(loop); if (document.hidden || !playing) { last = now; return; } if (now - last > 60) { setTick(v => v + (now - last) / 1000); last = now; } };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  const m = MISSIONS[idx];
  const picked = choice !== null ? m.options[choice] : null;
  const qColor = picked?.quality === 'good' ? '#86EFAC' : picked?.quality === 'partial' ? '#F5B85C' : '#F87171';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {MISSIONS.map((mi, i) => (
          <button key={mi.id} className="chip" aria-pressed={idx === i} style={idx === i ? { borderColor: 'rgba(83,216,232,0.6)', background: 'rgba(83,216,232,0.12)', color: '#9EE8F2' } : undefined}
            onClick={() => { setIdx(i); setChoice(null); }}>{mi.title[lang]}</button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <MissionViz viz={m.viz} tick={tick} playing={playing} />
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-icon" onClick={() => setPlaying(p => !p)} aria-label={t(playing ? 'learn.pause' : 'learn.play')}>{playing ? <IPause size={15} /> : <IPlay size={15} />}</button>
            <button className="btn btn-ghost btn-icon" onClick={() => { setTick(0); setChoice(null); }} aria-label={t('learn.restart')}><IReset size={15} /></button>
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-snow)' }}>{m.setup[lang]}</p>
          <div className="rounded-xl border p-3 space-y-1.5" style={{ borderColor: 'var(--line)', background: 'rgba(8,14,27,0.4)' }}>
            <p className="lbl !mb-0">{t('env.missions.hazard')}</p>
            <p className="text-[12.5px]" style={{ color: '#FCA5A5' }}>{m.hazard[lang]}</p>
            <p className="lbl !mb-0 pt-1">{t('env.missions.physics')}</p>
            <p className="text-[12.5px]" style={{ color: 'var(--color-dim)' }}>{m.physics[lang]}</p>
          </div>
        </div>
        <div className="space-y-3">
          <p className="lbl">{t('env.missions.choose')}</p>
          {m.options.map((o, i) => (
            <button key={i} className="w-full text-start rounded-xl border px-4 py-3 text-sm transition-colors"
              style={{ borderColor: choice === i ? qColor! : 'var(--line)', background: choice === i ? 'rgba(83,216,232,0.06)' : 'rgba(8,14,27,0.45)' }}
              onClick={() => setChoice(i)} disabled={choice !== null && choice !== i}>
              {o.label[lang]}
            </button>
          ))}
          {picked && (
            <div className="rounded-xl border p-4 rise" style={{ borderColor: qColor!, background: 'rgba(8,14,27,0.55)' }}>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-snow)' }}>{picked.outcome[lang]}</p>
              <p className="lbl !mb-0 pt-2" style={{ color: '#F5B85C' }}>{t('env.missions.residual')}</p>
              <p className="text-[12px]" style={{ color: 'var(--color-dim)' }}>{m.residual[lang]}</p>
              <button className="btn btn-ghost btn-sm mt-3" onClick={() => setChoice(null)}><IReset size={13} /> {t('learn.retry')}</button>
            </div>
          )}
          <p className="flex gap-2 text-[11px]" style={{ color: '#5f6f8d' }}><IInfo size={14} className="shrink-0 mt-0.5" /> {t('env.missions.notOfficial')}</p>
        </div>
      </div>
    </div>
  );
}