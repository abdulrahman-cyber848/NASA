'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as A from 'astronomy-engine';
import { useApp, useMounted } from '@/state/app';
import { PageSkeleton } from '@/components/ui';
import { getMoonSnapshot, moonFrame, vecToLatLon, phaseKeyFromLongitude, apsidesAround, type MoonSnapshot } from '@/services/astro';
import { loadMoonTexture, renderMoon, type MoonTexture } from '@/services/render';
import { fmtNum, fmtDistance } from '@/services/format';
import { fmtDate } from '@/services/time';
import { PhaseIcon, IPlay, IPause, IReset, ICheck, IX } from '@/components/icons';
import { Seg } from '@/components/ui';

const SPEEDS = [0.5, 1, 2, 4];

function MiniMoon({ snap }: { snap: MoonSnapshot }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [tex, setTex] = useState<MoonTexture | null>(null);
  useEffect(() => { loadMoonTexture().then(setTex); }, []);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (c.width !== 200) { c.width = 200; c.height = 200; }
    renderMoon(c, snap, tex, { earthshine: 0.06 });
  }, [snap, tex]);
  return <canvas ref={ref} className="h-[150px] w-[150px] sm:h-[180px] sm:w-[180px]" aria-label="Moon phase preview" />;
}

/** Orbit seen from above the north pole; Sun to the right. */
function OrbitDiagram({ theta }: { theta: number }) {
  const rad = (theta * Math.PI) / 180;
  const cx = 150, cy = 110, R = 74;
  const mx = cx + R * Math.cos(rad), my = cy - R * Math.sin(rad);
  return (
    <svg viewBox="0 0 320 220" className="w-full max-w-[340px]" aria-hidden>
      {[70, 110, 150].map(y => (
        <g key={y} stroke="#F5B85C" strokeWidth="1.5" opacity="0.75">
          <line x1="316" y1={y} x2="272" y2={y} />
          <path d={`M272 ${y} l7 -4 v8 z`} fill="#F5B85C" stroke="none" />
        </g>
      ))}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(107,141,255,0.35)" strokeDasharray="4 5" />
      <line x1={cx} y1={cy} x2={mx} y2={my} stroke="rgba(146,154,255,0.4)" strokeDasharray="3 4" />
      <circle cx={cx} cy={cy} r="13" fill="#2a5fa8" />
      <path d={`M ${cx} ${cy - 13} A 13 13 0 0 1 ${cx} ${cy + 13} Z`} fill="#4a8fe0" />
      <circle cx={mx} cy={my} r="10" fill="#3a4763" />
      <path d={`M ${mx} ${my - 10} A 10 10 0 0 1 ${mx} ${my + 10} Z`} fill="#E6EDFF" />
      <circle cx={mx} cy={my} r="10" fill="none" stroke="rgba(241,245,255,0.35)" strokeWidth="0.8" />
    </svg>
  );
}

function LockingDiagram({ theta }: { theta: number }) {
  const rad = (theta * Math.PI) / 180;
  const cx = 130, cy = 100, R = 62;
  const mx = cx + R * Math.cos(rad), my = cy - R * Math.sin(rad);
  // near-side marker points toward Earth (angle theta+180)
  const fx = mx + 9 * Math.cos(rad + Math.PI), fy = my - 9 * Math.sin(rad + Math.PI);
  const bx = mx + 9 * Math.cos(rad), by = my - 9 * Math.sin(rad);
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-[280px] mx-auto" aria-hidden>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(107,141,255,0.35)" strokeDasharray="4 5" />
      <circle cx={cx} cy={cy} r="14" fill="#2a5fa8" />
      <circle cx={mx} cy={my} r="12" fill="#39445f" stroke="rgba(241,245,255,0.3)" />
      <circle cx={fx} cy={fy} r="3.4" fill="#53D8E8" />
      <circle cx={bx} cy={by} r="2.6" fill="#F87171" opacity="0.85" />
      <line x1={cx} y1={cy} x2={mx} y2={my} stroke="rgba(83,216,232,0.35)" strokeWidth="1" />
    </svg>
  );
}


export default function LearnPage() {
  const { t, lang, prefs, date, location } = useApp();
  const mounted = useMounted();
  const base = useMemo(() => getMoonSnapshot(date), [date]);
  const cycleMs = base.nextNew.getTime() - base.prevNew.getTime();

  const [t01, setT01] = useState(() => base.cycleProgress);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(2);
  const raf = useRef(0);
  const lastTs = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const tick = (ts: number) => {
      raf.current = requestAnimationFrame(tick);
      if (document.hidden) { lastTs.current = ts; return; }
      if (ts - lastTs.current < 33) return; // ~30 fps
      const dt = Math.min(100, ts - (lastTs.current || ts));
      lastTs.current = ts;
      setT01(v => (v + (speed * 86400000 * dt) / 1000 / cycleMs) % 1);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf.current); lastTs.current = 0; };
  }, [playing, speed, cycleMs]);

  const simDate = useMemo(() => new Date(base.prevNew.getTime() + t01 * cycleMs), [base.prevNew, t01, cycleMs]);

  // lightweight per-frame astronomy (no event searches)
  const simSnap = useMemo<MoonSnapshot>(() => {
    const ill = A.Illumination(A.Body.Moon, simDate);
    const lon = A.MoonPhase(simDate);
    const frame = moonFrame(simDate);
    return {
      ...base, date: simDate,
      phaseLongitude: lon, phaseKey: phaseKeyFromLongitude(lon), waxing: lon < 180,
      illumFraction: ill.phase_fraction, illumPct: ill.phase_fraction * 100,
      phaseAngleDeg: ill.phase_angle,
      ageDays: (t01 * cycleMs) / 86400000, cycleProgress: t01,
      sunBody: frame.sun, earthBody: frame.earth,
      subEarth: vecToLatLon(frame.earth), subSolar: vecToLatLon(frame.sun),
    };
  }, [base, simDate, t01, cycleMs]);

  // libration trace for this lunation (real sub-Earth points)
  const libration = useMemo(() => {
    const pts: { lon: number; lat: number }[] = [];
    for (let i = 0; i <= 60; i++) {
      const d = new Date(base.prevNew.getTime() + (i / 60) * cycleMs);
      pts.push(vecToLatLon(moonFrame(d).earth));
    }
    return pts;
  }, [base.prevNew, cycleMs]);

  const aps = useMemo(() => apsidesAround(date), [date]);
  const simDist = useMemo(() => A.Libration(simDate).dist_km, [simDate]);

  const libPath = useMemo(() => {
    const X = (lon: number) => 140 + lon * 14;
    const Y = (lat: number) => 95 - lat * 11;
    return libration.map((p, i) => `${i === 0 ? 'M' : 'L'}${X(p.lon).toFixed(1)} ${Y(p.lat).toFixed(1)}`).join(' ');
  }, [libration]);
  const libNow = libration[Math.min(60, Math.round(t01 * 60))];


  const theta = t01 * 360;

  if (!mounted) return <PageSkeleton />;
  return (
    <div className="container-x py-8 space-y-6">
      <header className="rise">
        <p className="eyebrow">{t('brand.tag')}</p>
        <h1 className="h-display mt-1 text-3xl sm:text-4xl font-bold">{t('learn.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--color-dim)' }}>{t('learn.subtitle')}</p>
      </header>

      {/* phases + player */}
      <section className="glass p-6 rise" style={{ animationDelay: '60ms' }}>
        <h2 className="h-display text-xl font-bold">{t('learn.phasesTitle')}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t('learn.phasesBody')}</p>

        <div className="mt-5 grid gap-6 md:grid-cols-[1fr_auto_auto] items-center">
          <div>
            <p className="lbl">{t('learn.player')}</p>
            <OrbitDiagram theta={theta} />
            <p className="text-[11px] mt-1" style={{ color: '#5f6f8d' }}>{t('learn.orbitView')}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <MiniMoon snap={simSnap} />
            <div className="flex items-center gap-2">
              <PhaseIcon fraction={simSnap.illumFraction} waxing={simSnap.waxing} size={26} />
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-cy)' }}>{t(`phase.${simSnap.phaseKey}`)}</p>
                <p className="text-[12px]" style={{ color: 'var(--color-dim)' }}>
                  {fmtNum(simSnap.illumPct, lang, 0)}% · {t('common.day', { d: fmtNum(Math.floor(simSnap.ageDays), lang) })}
                </p>
              </div>
            </div>
            <p className="text-[11px]" style={{ color: '#5f6f8d' }}>{fmtDate(simDate, location.tz, lang)}</p>
          </div>
          <div className="flex md:flex-col gap-4 items-center md:items-end justify-center">
            <div className="text-center md:text-end">
              <p className="lbl">{t('guide.distance')}</p>
              <p className="h-display text-lg font-bold">{fmtDistance(simDist, prefs.units, lang)}</p>
            </div>
          </div>
        </div>

        {/* transport */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className="btn btn-primary btn-icon" onClick={() => setPlaying(p => !p)} aria-label={t(playing ? 'learn.pause' : 'learn.play')}>
            {playing ? <IPause size={17} /> : <IPlay size={17} />}
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => { setT01(0); setPlaying(true); }} aria-label={t('learn.restart')}>
            <IReset size={16} />
          </button>
          <div className="flex items-center gap-2">
            <span className="lbl !mb-0">{t('learn.speed')}</span>
            <Seg label={t('learn.speed')} value={String(speed)} onChange={v => setSpeed(Number(v))}
              options={SPEEDS.map(s => ({ value: String(s), label: `${fmtNum(s, lang, s < 1 ? 1 : 0)}×` }))} />
          </div>
          <div className="grow min-w-[180px] flex items-center gap-2">
            <input
              type="range" min={0} max={1000} value={Math.round(t01 * 1000)}
              aria-label={t('learn.scrub')}
              className="w-full"
              onChange={e => { setT01(Number(e.target.value) / 1000); setPlaying(false); }}
            />
          </div>
        </div>
        <p className="mt-2 text-[11px]" style={{ color: '#5f6f8d' }}>
          {t('learn.timelineHint', { start: fmtDate(base.prevNew, location.tz, lang), end: fmtDate(base.nextNew, location.tz, lang) })}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* tidal locking */}
        <section className="glass p-5 rise" style={{ animationDelay: '100ms' }}>
          <h2 className="h-display text-lg font-bold">{t('learn.lockTitle')}</h2>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t('learn.lockBody')}</p>
          <LockingDiagram theta={theta} />
          <div className="flex justify-center gap-4 text-[11px]" style={{ color: 'var(--color-dim)' }}>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full inline-block" style={{ background: '#53D8E8' }} /> {lang === 'ar' ? 'الوجه القريب' : 'near side'}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full inline-block" style={{ background: '#F87171' }} /> {lang === 'ar' ? 'الوجه البعيد' : 'far side'}</span>
          </div>
        </section>

        {/* libration */}
        <section className="glass p-5 rise" style={{ animationDelay: '140ms' }}>
          <h2 className="h-display text-lg font-bold">{t('learn.libTitle')}</h2>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t('learn.libBody')}</p>
          <svg viewBox="0 0 280 190" className="w-full max-w-[280px] mx-auto mt-2" aria-hidden>
            <line x1="140" y1="12" x2="140" y2="178" stroke="rgba(107,141,255,0.25)" />
            <line x1="18" y1="95" x2="262" y2="95" stroke="rgba(107,141,255,0.25)" />
            {[-6, -3, 3, 6].map(v => <text key={v} x={140 + v * 14} y="188" fontSize="8" fill="#5f6f8d" textAnchor="middle">{v}°</text>)}
            {[-6, -3, 3, 6].map(v => <text key={v} x="8" y={95 - v * 11 + 3} fontSize="8" fill="#5f6f8d">{v}°</text>)}
            <path d={libPath} fill="none" stroke="#6B8DFF" strokeWidth="1.6" opacity="0.85" />
            {libNow && <circle cx={140 + libNow.lon * 14} cy={95 - libNow.lat * 11} r="4.5" fill="#53D8E8" stroke="#081020" strokeWidth="1.5" />}
          </svg>
          <p className="text-center text-[11.5px]" style={{ color: 'var(--color-dim)' }}>
            {t('learn.libLon')}: {fmtNum(libNow?.lon ?? 0, lang, 1)}° · {t('learn.libLat')}: {fmtNum(libNow?.lat ?? 0, lang, 1)}°
          </p>
        </section>

        {/* apsides */}
        <section className="glass p-5 rise" style={{ animationDelay: '180ms' }}>
          <h2 className="h-display text-lg font-bold">{t('learn.apsisTitle')}</h2>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t('learn.apsisBody')}</p>
          <svg viewBox="0 0 280 190" className="w-full max-w-[280px] mx-auto mt-2" aria-hidden>
            {(() => {
              const a = 108, e = 0.0549, b = a * Math.sqrt(1 - e * e), c = a * e;
              const cx = 140, cy = 92;
              const rad = (theta * Math.PI) / 180;
              const rNorm = (simDist - 340000) / (420000 - 340000);
              const r = 55 + rNorm * 75;
              return (
                <>
                  <ellipse cx={cx} cy={cy} rx={a} ry={b} fill="none" stroke="rgba(107,141,255,0.3)" strokeDasharray="4 5" />
                  <circle cx={cx + c} cy={cy} r="11" fill="#2a5fa8" />
                  <circle cx={cx + a} cy={cy} r="3" fill="#4ADE80" />
                  <circle cx={cx - a} cy={cy} r="3" fill="#6B8DFF" />
                  <text x={cx + a - 4} y={cy - 10} fontSize="9" fill="#86EFAC" textAnchor="end">{t('cal.perigee')}</text>
                  <text x={cx - a + 4} y={cy - 10} fontSize="9" fill="#9DB4FF">{t('cal.apogee')}</text>
                  <circle cx={cx + c + r * Math.cos(rad)} cy={cy - r * Math.sin(rad)} r="6" fill="#E6EDFF" stroke="#081020" />
                </>
              );
            })()}
          </svg>
          <p className="text-center text-[11.5px]" style={{ color: 'var(--color-dim)' }}>
            {t('learn.apsisNow')}: <span className="font-semibold" style={{ color: 'var(--color-snow)' }}>{fmtDistance(simDist, prefs.units, lang)}</span>
          </p>
          <p className="text-center text-[10.5px] mt-1" style={{ color: '#5f6f8d' }}>
            {lang === 'ar'
              ? `الحضيض ${fmtDate(aps.next.kind === 'perigee' ? aps.next.time : aps.next2.time, location.tz, lang)} · الأوج ${fmtDate(aps.next.kind === 'apogee' ? aps.next.time : aps.next2.time, location.tz, lang)}`
              : `Perigee ${fmtDate(aps.next.kind === 'perigee' ? aps.next.time : aps.next2.time, location.tz, lang)} · Apogee ${fmtDate(aps.next.kind === 'apogee' ? aps.next.time : aps.next2.time, location.tz, lang)}`}
          </p>
        </section>
      </div>

    </div>
  );
}