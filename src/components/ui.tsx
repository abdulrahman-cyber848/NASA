'use client';
import React, { useEffect, useRef } from 'react';
import { useApp } from '@/state/app';
import { IInfo, IX, ICheck } from './icons';

export function Seg<T extends string>({ options, value, onChange, label, className }: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T; onChange: (v: T) => void; label: string; className?: string;
}) {
  return (
    <div className={`seg ${className ?? ''}`} role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.value} type="button" className="seg-btn" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="tip" tabIndex={0} data-tip={text} role="note" aria-label={text}>
      <IInfo size={14} />
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useApp();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--scrim)', backdropFilter: 'blur(6px)' }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={ref} tabIndex={-1} role="dialog" aria-modal="true"
        className={`glass-deep w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[86vh] overflow-y-auto p-6 shadow-2xl rise`}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h3 className="h-display text-lg font-bold">{title}</h3>
          <button className="btn btn-ghost btn-icon -mt-1 -me-1" onClick={onClose} aria-label={t('common.close')}>
            <IX size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, body }: { icon?: React.ReactNode; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-10 px-4">
      <div className="text-3xl opacity-80" aria-hidden>{icon ?? '🌑'}</div>
      <p className="h-display font-semibold">{title}</p>
      {body && <p className="text-sm max-w-sm leading-relaxed" style={{ color: 'var(--color-dim)' }}>{body}</p>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="container-x py-8 space-y-6" aria-busy="true">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded animate-pulse" style={{ background: 'rgba(83,216,232,0.15)' }} />
        <div className="h-9 w-72 max-w-full rounded animate-pulse" style={{ background: 'rgba(107,141,255,0.14)' }} />
        <div className="h-4 w-96 max-w-full rounded animate-pulse" style={{ background: 'rgba(107,141,255,0.09)' }} />
      </div>
      <div className="glass h-24 animate-pulse" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass aspect-square animate-pulse" />
        <div className="glass h-80 animate-pulse" />
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:end-6 z-[70] flex flex-col gap-2 items-stretch sm:items-end" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="glass-deep flex items-center gap-3 px-4 py-3 shadow-2xl rise sm:min-w-[280px] max-w-md"
          style={{ borderColor: t.kind === 'err' ? 'rgba(248,113,113,0.45)' : t.kind === 'ok' ? 'rgba(74,222,128,0.4)' : 'var(--line-strong)' }}>
          <span className={t.kind === 'err' ? 'text-[#FCA5A5]' : t.kind === 'ok' ? 'text-[#86EFAC]' : 'text-[#9DB4FF]'}>
            {t.kind === 'ok' ? <ICheck size={16} /> : <IInfo size={16} />}
          </span>
          <span className="text-sm flex-1">{t.msg}</span>
          {t.actionLabel && (
            <button className="btn btn-ghost btn-sm shrink-0" onClick={() => { t.onAction?.(); dismissToast(t.id); }}>
              {t.actionLabel}
            </button>
          )}
          <button className="opacity-60 hover:opacity-100 shrink-0" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <IX size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
