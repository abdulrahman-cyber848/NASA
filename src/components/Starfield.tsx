'use client';
import { useEffect, useRef } from 'react';

interface Star { x: number; y: number; r: number; base: number; amp: number; speed: number; phase: number; hue: string }

export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stars: Star[] = [];
    let raf = 0;
    let last = 0;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      const count = Math.min(260, Math.floor((window.innerWidth * window.innerHeight) / 6500));
      const hues = ['#F1F5FF', '#F1F5FF', '#F1F5FF', '#BBD9FF', '#9EE8F2', '#B9C0FF'];
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: (Math.random() ** 2.2) * 1.5 * dpr + 0.35,
        base: 0.25 + Math.random() * 0.5,
        amp: 0.1 + Math.random() * 0.3,
        speed: 0.3 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        hue: hues[(Math.random() * hues.length) | 0],
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ts = t / 1000;
      for (const s of stars) {
        const a = reduced ? s.base : s.base + Math.sin(ts * s.speed + s.phase) * s.amp;
        ctx.globalAlpha = Math.max(0.05, Math.min(1, a));
        ctx.fillStyle = s.hue;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      if (t - last < 50) return; // ~20 fps is plenty for a calm twinkle
      last = t;
      draw(t);
    };

    build();
    if (reduced) draw(0);
    else raf = requestAnimationFrame(loop);

    const onResize = () => { build(); if (reduced) draw(0); };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return <canvas ref={ref} aria-hidden className="fixed inset-0 z-0 h-full w-full pointer-events-none" />;
}