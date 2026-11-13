'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MoonSnapshot } from '@/services/astro';
import { loadMoonTexture, renderMoon, viewBasis, projectPoint, type MoonTexture } from '@/services/render';
import type { EvaluatedLandmark } from '@/services/visibility';
import { useApp } from '@/state/app';
import { fmtNum, fmtCoord } from '@/services/format';
import { ISearch, IZoomIn, IZoomOut, IReset } from './icons';

interface Props {
  snap: MoonSnapshot;
  evaluated: EvaluatedLandmark[];
  recommendedIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function MoonMap({ snap, evaluated, recommendedIds, selectedId, onSelect }: Props) {
  const { t, lang, prefs } = useApp();
  const south = prefs.hemisphere === 'south';
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tex, setTex] = useState<MoonTexture | null>(null);
  const [texMissing, setTexMissing] = useState(false);
  const [sizePx, setSizePx] = useState(480);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDist = useRef(0);

  // texture load (module-cached)
  useEffect(() => {
    let alive = true;
    loadMoonTexture().then(tx => { if (alive) { setTex(tx); setTexMissing(!tx); } });
    return () => { alive = false; };
  }, []);

  // responsive render size
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setSizePx(Math.max(220, Math.min(680, Math.round(w * Math.min(window.devicePixelRatio || 1, 1.5)))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // the astronomical render — recomputed for every date/time change
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    if (c.width !== sizePx) { c.width = sizePx; c.height = sizePx; }
    renderMoon(c, snap, tex);
  }, [snap, tex, sizePx]);

  const basis = useMemo(() => viewBasis(snap), [snap]);
  const points = useMemo(() => evaluated.map(ev => ({
    ev,
    ...projectPoint(ev.landmark.lat, ev.landmark.lon, basis),
  })), [evaluated, basis]);

  const clampView = useCallback((v: { k: number; tx: number; ty: number }) => {
    const S = stageRef.current?.clientWidth ?? 480;
    const lim = ((v.k - 1) / 2) * S + S * 0.18;
    return { k: v.k, tx: Math.max(-lim, Math.min(lim, v.tx)), ty: Math.max(-lim, Math.min(lim, v.ty)) };
  }, []);

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setView(v => {
      const k = Math.max(1, Math.min(5, v.k * factor));
      const S = stageRef.current?.clientWidth ?? 480;
      const px = (cx ?? S / 2) - S / 2, py = (cy ?? S / 2) - S / 2;
      const r = k / v.k;
      return clampView({ k, tx: px - (px - v.tx) * r, ty: py - (py - v.ty) * r });
    });
  }, [clampView]);

  // wheel zoom (non-passive)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(Math.pow(1.0016, -e.deltaY), e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 2) {
      const [a, b] = [...pinch.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pinch.current.has(e.pointerId)) return;
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 2) {
      const [a, b] = [...pinch.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current > 0) {
        const rect = stageRef.current!.getBoundingClientRect();
        zoomAt(d / pinchDist.current, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
      }
      pinchDist.current = d;
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    d.x = e.clientX; d.y = e.clientY;
    setView(v => clampView({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pinch.current.delete(e.pointerId);
    if (drag.current?.id === e.pointerId) {
      if (!drag.current.moved && e.target === stageRef.current) onSelect(null);
      drag.current = null;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 34;
    if (e.key === 'ArrowLeft') { setView(v => clampView({ ...v, tx: v.tx + step })); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { setView(v => clampView({ ...v, tx: v.tx - step })); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setView(v => clampView({ ...v, ty: v.ty + step })); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { setView(v => clampView({ ...v, ty: v.ty - step })); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') { zoomAt(1.25); e.preventDefault(); }
    else if (e.key === '-') { zoomAt(0.8); e.preventDefault(); }
    else if (e.key === '0') { setView({ k: 1, tx: 0, ty: 0 }); e.preventDefault(); }
  };

  const centerOn = useCallback((x: number, y: number) => {
    const S = stageRef.current?.clientWidth ?? 480;
    const xr = south ? 1 - x : x, yr = south ? 1 - y : y;
    setView(() => {
      const k = 2;
      return clampView({ k, tx: k * (0.5 - xr) * S, ty: k * (0.5 - yr) * S });
    });
  }, [south, clampView]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return evaluated.filter(({ landmark: l }) =>
      l.name.toLowerCase().includes(q) || l.nameAr.includes(query.trim()) || l.id.includes(q)
    ).slice(0, 6);
  }, [query, evaluated]);

  const pick = (id: string) => {
    const p = points.find(pt => pt.ev.landmark.id === id);
    onSelect(id);
    setQuery(''); setSearchOpen(false);
    if (p && p.depth > 0) centerOn(p.x, p.y);
  };

  const S = stageRef.current?.clientWidth ?? 480;
  const hovered = hover ? points.find(p => p.ev.landmark.id === hover) : null;
  const tipPos = hovered ? {
    left: S / 2 + view.tx + view.k * ((south ? 1 - hovered.x : hovered.x) - 0.5) * S,
    top: S / 2 + view.ty + view.k * ((south ? 1 - hovered.y : hovered.y) - 0.5) * S,
  } : null;

  return (
    <div className="flex flex-col gap-3" dir="ltr">
      {/* search */}
      <div className="relative" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <ISearch size={15} className="absolute top-1/2 -translate-y-1/2 start-3.5 opacity-60 pointer-events-none" />
        <input
          className="input ps-10"
          placeholder={t('guide.searchLandmarks')}
          value={query}
          aria-label={t('guide.searchLandmarks')}
          onChange={e => { setQuery(e.target.value); setSearchOpen(true); }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 180)}
        />
        {searchOpen && query.trim() && (
          <div className="glass-deep absolute z-30 top-[calc(100%+6px)] inset-x-0 p-1.5 shadow-2xl">
            {matches.length === 0 && <p className="px-3 py-2.5 text-sm" style={{ color: 'var(--color-dim)' }}>{t('guide.noMatch')}</p>}
            {matches.map(({ landmark: l }) => (
              <button key={l.id} className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-[rgba(107,141,255,0.1)] text-start" onMouseDown={() => pick(l.id)}>
                <span>{lang === 'ar' ? l.nameAr : l.name}</span>
                <span className="chip">{t(`lm.${l.type}`)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* stage */}
      <div
        ref={stageRef}
        className="moon-stage relative w-full aspect-square overflow-hidden rounded-2xl select-none"
        style={{ background: 'radial-gradient(circle at 50% 45%, rgba(20,36,58,0.5), rgba(6,10,20,0.9) 75%)', border: '1px solid var(--line)' }}
        tabIndex={0}
        role="application"
        aria-label={t('a11y.moonMap')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.k}) rotate(${south ? 180 : 0}deg)`,
            transition: drag.current ? 'none' : 'transform 0.35s cubic-bezier(0.2,0.7,0.2,1)',
          }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ filter: 'drop-shadow(0 0 34px rgba(146,154,255,0.14))' }} />
          {points.filter(p => p.depth > 0.035).map(p => {
            const l = p.ev.landmark;
            const sunlit = p.ev.sunDot > 0.004;
            return (
              <button
                key={l.id}
                className="marker"
                data-type={l.type}
                data-selected={selectedId === l.id}
                data-rec={recommendedIds.has(l.id) && p.ev.geoVisible}
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, opacity: sunlit ? 1 : 0.5 }}
                aria-label={`${lang === 'ar' ? l.nameAr : l.name} — ${t(`lm.${l.type}`)}${sunlit ? '' : ` (${t('vis.in-shadow')})`}`}
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onSelect(selectedId === l.id ? null : l.id); }}
                onMouseEnter={() => setHover(l.id)}
                onMouseLeave={() => setHover(h => (h === l.id ? null : h))}
                onFocus={() => setHover(l.id)}
                onBlur={() => setHover(h => (h === l.id ? null : h))}
              >
                <span className="marker-dot" style={sunlit ? undefined : { background: '#42506b', boxShadow: '0 0 0 1.5px rgba(8,14,27,0.85)' }} />
                {view.k >= 1.7 && (
                  <span className="marker-label" style={{ transform: `translateX(-50%) rotate(${south ? 180 : 0}deg)` }}>
                    {lang === 'ar' ? l.nameAr : l.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {hovered && tipPos && (
          <div className="map-tipbox" style={{ left: tipPos.left, top: tipPos.top }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <p className="font-semibold">{lang === 'ar' ? hovered.ev.landmark.nameAr : hovered.ev.landmark.name}</p>
            <p style={{ color: 'var(--color-dim)' }}>
              {t(`lm.${hovered.ev.landmark.type}`)} · {hovered.ev.sunDot > 0.004
                ? t('vis.sunElev', { d: fmtNum(hovered.ev.sunElevationDeg, lang, 0) })
                : t('vis.in-shadow')}
            </p>
          </div>
        )}

        {/* zoom controls */}
        <div className="absolute bottom-3 end-3 flex flex-col gap-1.5 z-10">
          <button className="btn btn-ghost btn-icon" onClick={() => zoomAt(1.3)} aria-label={t('guide.zoomIn')}><IZoomIn size={16} /></button>
          <button className="btn btn-ghost btn-icon" onClick={() => zoomAt(0.77)} aria-label={t('guide.zoomOut')}><IZoomOut size={16} /></button>
          <button className="btn btn-ghost btn-icon" onClick={() => setView({ k: 1, tx: 0, ty: 0 })} aria-label={t('guide.resetView')}><IReset size={16} /></button>
        </div>

        {south && (
          <span className="absolute top-3 start-3 chip chip-bl z-10" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{t('guide.southRotated')}</span>
        )}
        {texMissing && (
          <span className="absolute bottom-3 start-3 chip chip-danger z-10" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{t('guide.textureMissing')}</span>
        )}
      </div>

      {/* legend + hint */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px]" style={{ color: 'var(--color-dim)' }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-amber)' }} /> {t('legend.crater')}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-cy)' }} /> {t('legend.mare')}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border" style={{ borderColor: 'var(--color-cy)' }} /> {t('legend.recommended')}</span>
        <span className="ms-auto hidden sm:inline">{t('guide.mapHint')}</span>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: '#5f6f8d' }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {t('guide.earthshineNote', { lat: fmtCoord(snap.subEarth.lat, 0, lang).split(',')[0], lon: fmtCoord(0, snap.subEarth.lon, lang).split(', ')[1] })}
      </p>
    </div>
  );
}