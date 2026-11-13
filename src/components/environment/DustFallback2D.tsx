'use client';
import { useEffect, useRef } from 'react';
import type { DustSettings } from './DustScene';
import { ballisticStep, LUNAR_G } from '@/services/dustPhysics';

interface P { x: number; y: number; vx: number; vy: number; life: number; kind: number }

/** 2D side-view vacuum ballistic simulator — same physics service as the 3D scene. */
export default function DustFallback2D({ settings, onStats }: { settings: DustSettings; onStats: (n: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sRef = useRef(settings);
  sRef.current = settings;

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let parts: P[] = [];
    let t = 0, ax = 0.3, adir = 1, rx = 0.1, stat = 0, raf = 0, last = performance.now();
    let lastReset = settings.resetNonce, lastImpact = settings.impactNonce;
    const foot: number[] = [];
    const resize = () => { canvas.width = canvas.clientWidth * Math.min(devicePixelRatio, 1.5); canvas.height = canvas.clientHeight * Math.min(devicePixelRatio, 1.5); };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const cap = settings.quality === 'low' ? 900 : settings.quality === 'med' ? 1800 : 3200;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const s = sRef.current;
      const dt = Math.min(0.05, (now - last) / 1000) * (s.paused ? 0 : s.speed);
      last = now; t += dt;
      if (s.resetNonce !== lastReset) { lastReset = s.resetNonce; parts = []; foot.length = 0; }
      const W = canvas.width, H = canvas.height, ground = H * 0.82, scale = H * 0.16; // px per meter
      const toX = (m: number) => m * W; const toY = (m: number) => ground - m * scale;
      if (dt > 0) {
        ax += adir * s.walk * 0.09 * dt; if (ax > 0.62) adir = -1; if (ax < 0.12) adir = 1;
        rx += s.rover * 0.2 * dt; if (rx > 1.05) rx = -0.05;
        const D = s.density;
        const emit = (n: number, x: number, v: () => [number, number], kind = 0) => {
          for (let i = 0; i < n && parts.length < cap; i++) { const [vx, vy] = v(); parts.push({ x, y: 0.03, vx, vy, life: 7, kind }); }
        };
        emit(Math.floor(240 * s.walk * D * dt + Math.random()), ax, () => { const sp = 0.7 + Math.random() * 1.8 * s.walk, el = (25 + Math.random() * 40) * Math.PI / 180; return [-adir * sp * Math.cos(el), sp * Math.sin(el)]; });
        emit(Math.floor(420 * s.rover * D * dt + Math.random()), rx, () => { const sp = 1 + Math.random() * 3 * s.rover, el = (30 + Math.random() * 35) * Math.PI / 180; return [-sp * Math.cos(el), sp * Math.sin(el)]; });
        emit(Math.floor(600 * s.plume * D * dt + Math.random()), 0.88, () => { const sp = 4 + Math.random() * 7 * s.plume, el = (4 + Math.random() * 12) * Math.PI / 180, dir = Math.random() > 0.5 ? 1 : -1; return [dir * sp * Math.cos(el), sp * Math.sin(el)]; });
        if (s.echarge) emit(Math.floor(80 * s.charge * D * dt + Math.random()), 0.16, () => [(Math.random() - 0.5) * 0.1, 0.1 + Math.random() * 0.15], 1);
        if (s.impactNonce !== lastImpact) { lastImpact = s.impactNonce; const bx = 0.3 + Math.random() * 0.4; emit(Math.floor(300 * D), bx, () => { const sp = 1 + Math.random() * 4.5, el = (20 + Math.random() * 55) * Math.PI / 180, dir = Math.random() > 0.5 ? 1 : -1; return [dir * sp * Math.cos(el), sp * Math.sin(el)]; }); }
        if (s.footprints && s.walk > 0.05 && Math.floor(t * 2) !== Math.floor((t - dt) * 2)) { foot.push(ax); if (foot.length > 40) foot.shift(); }
        parts = parts.filter(p => {
          const pos = { x: p.x, y: p.y, z: 0 }, vel = { x: p.vx, y: p.vy, z: 0 };
          const ay = p.kind === 1 && p.y < 1.2 ? s.charge * 6.5 - LUNAR_G : -LUNAR_G;
          ballisticStep(pos, vel, dt, ay);
          p.x = pos.x; p.y = pos.y; p.vx = vel.x; p.vy = vel.y;
          if (p.y <= 0.01 && p.vy < 0) { p.y = 0.01; p.vx = 0; p.vy = 0; p.life = Math.min(p.life, 0.8); }
          p.life -= dt;
          return p.life > 0 && p.x > -0.1 && p.x < 1.1;
        });
      }
      // draw
      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, '#05080F'); sky.addColorStop(1, '#0A1322');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, ground);
      ctx.fillStyle = '#6E675E'; ctx.fillRect(0, ground, W, H - ground);
      ctx.fillStyle = '#3E3A34';
      foot.forEach(fx => ctx.fillRect(toX(fx) - 5, ground + 2, 10, 3));
      // actors (simple silhouettes)
      ctx.fillStyle = '#E8ECF4';
      ctx.fillRect(toX(ax) - 5, ground - 46, 10, 30); ctx.beginPath(); ctx.arc(toX(ax), ground - 52, 7, 0, 7); ctx.fill();
      ctx.fillStyle = '#B9C2D4'; ctx.fillRect(toX(rx) - 16, ground - 16, 32, 10);
      ctx.fillStyle = '#4A5568'; ctx.beginPath(); ctx.arc(toX(rx) - 9, ground - 4, 5, 0, 7); ctx.arc(toX(rx) + 9, ground - 4, 5, 0, 7); ctx.fill();
      if (s.plume > 0.02) { ctx.fillStyle = `rgba(191,233,242,${0.15 + s.plume * 0.3})`; ctx.beginPath(); ctx.moveTo(toX(0.88), ground - 60); ctx.lineTo(toX(0.88) - 14 * s.plume - 4, ground); ctx.lineTo(toX(0.88) + 14 * s.plume + 4, ground); ctx.fill(); }
      if (s.echarge) { ctx.fillStyle = `rgba(83,216,232,${0.2 + s.charge * 0.5})`; ctx.fillRect(toX(0.16) - 22, ground - 2, 44, 4); }
      for (const p of parts) {
        ctx.fillStyle = p.kind === 1 ? 'rgba(83,216,232,0.9)' : `rgba(154,147,139,${Math.min(1, p.life)})`;
        const r = Math.max(1, 1.6 * s.psize);
        ctx.fillRect(toX(p.x), toY(p.y), r, r);
      }
      stat += (now - (stat ? stat : now)) ? 0 : 0;
      if (Math.floor(now / 500) !== Math.floor((now - 16) / 500)) onStats(parts.length);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.quality]);

  return <canvas ref={ref} className="h-full w-full" aria-label="2D ballistic dust simulator" />;
}