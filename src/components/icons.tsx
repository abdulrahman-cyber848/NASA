import React from 'react';

type P = React.SVGProps<SVGSVGElement> & { size?: number };
const base = (p: P) => {
  const { size = 16, ...rest } = p;
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...rest };
};

export const IChevronL = (p: P) => <svg {...base(p)}><path d="m15 18-6-6 6-6" /></svg>;
export const IChevronR = (p: P) => <svg {...base(p)}><path d="m9 18 6-6-6-6" /></svg>;
export const ISearch = (p: P) => <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
export const IStar = (p: P & { filled?: boolean }) => { const { filled, ...rest } = p; return <svg {...base(rest)} fill={filled ? 'currentColor' : 'none'}><path d="M12 2.5l2.95 6.1 6.7.9-4.9 4.66 1.23 6.64L12 17.6l-5.98 3.2 1.23-6.64-4.9-4.66 6.7-.9z" /></svg>; };
export const IZoomIn = (p: P) => <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M8 11h6M11 8v6" /></svg>;
export const IZoomOut = (p: P) => <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M8 11h6" /></svg>;
export const IReset = (p: P) => <svg {...base(p)}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>;
export const IPlay = (p: P) => <svg {...base(p)}><path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" /></svg>;
export const IPause = (p: P) => <svg {...base(p)}><path d="M7 4h3.4v16H7zM13.6 4H17v16h-3.6z" fill="currentColor" stroke="none" /></svg>;
export const IX = (p: P) => <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>;
export const IMenu = (p: P) => <svg {...base(p)}><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
export const IEye = (p: P) => <svg {...base(p)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>;
export const IBino = (p: P) => <svg {...base(p)}><circle cx="6.5" cy="15.5" r="4" /><circle cx="17.5" cy="15.5" r="4" /><path d="M9 13V6a1.5 1.5 0 0 1 3 0v6M12 12V6a1.5 1.5 0 0 1 3 0v7" /></svg>;
export const IScope = (p: P) => <svg {...base(p)}><path d="m3 13 15.5-8 2.5 4.5L5.5 17.5zM12 15l-3 6M12 15l4 6" /><circle cx="19.8" cy="7.2" r="0.6" fill="currentColor" /></svg>;
export const IPin = (p: P) => <svg {...base(p)}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>;
export const ICrosshair = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="8" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>;
export const IInfo = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M12 11v5" /></svg>;
export const IPlus = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const ITrash = (p: P) => <svg {...base(p)}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" /></svg>;
export const IEdit = (p: P) => <svg {...base(p)}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>;
export const ICheck = (p: P) => <svg {...base(p)}><path d="m4 12.5 5 5L20 6.5" /></svg>;
export const IClock = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>;
export const ISun = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8" /></svg>;
export const ICube = (p: P) => <svg {...base(p)}><path d="M12 2 21 7v10l-9 5-9-5V7z" /><path d="M12 22V12M12 12 3 7M12 12l9-5" /></svg>;
export const ICal = (p: P) => <svg {...base(p)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>;
export const IBook = (p: P) => <svg {...base(p)}><path d="M4 19V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h14" /></svg>;
export const IUser = (p: P) => <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>;
export const IExternal = (p: P) => <svg {...base(p)}><path d="M14 4h6v6M20 4 10 14M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></svg>;
export const ISpinner = (p: P) => <svg {...base(p)} className={`spin ${p.className ?? ''}`}><path d="M12 3a9 9 0 1 0 9 9" /></svg>;
export const IGoogle = (p: P) => { const { size = 16, ...rest } = p; return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...rest}><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.2 1.1-.9 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.2 3.7-8.9z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-6-2.1-7-5.1L1.2 17.2C3.2 21.2 7.3 24 12 24z"/><path fill="#FBBC05" d="M5 14.3c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.2 6.8C.4 8.4 0 10.1 0 12s.4 3.6 1.2 5.2z"/><path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.3 0 3.2 2.8 1.2 6.8L5 9.7c1-3 3.8-5 7-5z"/></svg>; };

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="lg-moon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#53D8E8" /><stop offset="1" stopColor="#6B8DFF" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13.5" fill="#101D32" stroke="rgba(107,141,255,0.4)" />
      <path d="M16 2.5a13.5 13.5 0 0 1 0 27 10.5 10.5 0 0 0 0-27z" fill="url(#lg-moon)" />
      <circle cx="12" cy="12" r="1.6" fill="rgba(146,154,255,0.5)" />
      <circle cx="10" cy="20" r="2.3" fill="rgba(146,154,255,0.35)" />
    </svg>
  );
}

/** SVG diagram icon of a phase (not a photo): fraction 0..1, waxing = lit on the right. */
export function PhaseIcon({ fraction, waxing, size = 28, className }: { fraction: number; waxing: boolean; size?: number; className?: string }) {
  const r = 13, c = 16;
  const f = Math.max(0, Math.min(1, fraction));
  const k = Math.cos(Math.PI * f);
  const rx = Math.abs(k) * r;
  let lit: React.ReactNode = null;
  if (f > 0.985) lit = <circle cx={c} cy={c} r={r} fill="#E6EDFF" />;
  else if (f > 0.015) {
    const outerSweep = waxing ? 1 : 0;
    const innerSweep = waxing ? (k > 0 ? 1 : 0) : (k > 0 ? 0 : 1);
    const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${outerSweep} ${c} ${c + r} A ${rx} ${r} 0 0 ${innerSweep} ${c} ${c - r} Z`;
    lit = <path d={d} fill="#E6EDFF" />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx={c} cy={c} r={r} fill="#141F38" stroke="rgba(107,141,255,0.35)" strokeWidth="1" />
      {lit}
    </svg>
  );
}