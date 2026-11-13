'use client';
import { useState } from 'react';
import { useApp } from '@/state/app';
import { MITIGATIONS, type MitigationStatus } from '@/data/environment/mitigations';
import { IInfo } from '@/components/icons';

const STATUS_COLOR: Record<MitigationStatus, string> = {
  demonstrated: 'chip-ok', prototype: 'chip-cy', research: 'chip-bl', concept: 'chip-amber',
};

export default function PreventionPanel() {
  const { t, lang } = useApp();
  const [filter, setFilter] = useState<MitigationStatus | 'all'>('all');
  const rows = MITIGATIONS.filter(m => filter === 'all' || m.status === filter);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('env.table.status')}>
        <button className="chip" aria-pressed={filter === 'all'} style={filter === 'all' ? { borderColor: 'rgba(83,216,232,0.6)', background: 'rgba(83,216,232,0.12)', color: '#9EE8F2' } : undefined} onClick={() => setFilter('all')}>{t('sites.all')}</button>
        {(['demonstrated', 'prototype', 'research', 'concept'] as MitigationStatus[]).map(s => (
          <button key={s} className={`chip ${STATUS_COLOR[s]}`} aria-pressed={filter === s} onClick={() => setFilter(filter === s ? 'all' : s)}>{t(`env.status.${s}`)}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(m => (
          <div key={m.id} className="glass p-4 space-y-2 rise">
            <div className="flex items-start justify-between gap-2">
              <h3 className="h-display font-semibold text-[14px] leading-snug">{m.name[lang]}</h3>
              <span className={`chip ${STATUS_COLOR[m.status]} shrink-0`}>{t(`env.status.${m.status}`)}</span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>{m.principle[lang]}</p>
            <p className="text-[11px]" style={{ color: '#8b98b5' }}><span style={{ color: '#F5B85C' }}>{t('env.table.limits')}:</span> {m.limitations[lang]}</p>
          </div>
        ))}
      </div>

      <div className="glass-deep overflow-x-auto">
        <table className="w-full text-[12px] min-w-[760px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line-strong)' }}>
              {['tech', 'problem', 'principle', 'limits', 'status'].map(c => (
                <th key={c} className="lbl !mb-0 text-start p-3">{t(`env.table.${c}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td className="p-3 font-semibold align-top">{m.name[lang]}</td>
                <td className="p-3 align-top" style={{ color: 'var(--color-dim)' }}>{m.problem[lang]}</td>
                <td className="p-3 align-top" style={{ color: 'var(--color-dim)' }}>{m.principle[lang]}</td>
                <td className="p-3 align-top" style={{ color: '#8b98b5' }}>{m.limitations[lang]}</td>
                <td className="p-3 align-top"><span className={`chip ${STATUS_COLOR[m.status]}`}>{t(`env.status.${m.status}`)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex gap-2 text-[11.5px]" style={{ color: '#5f6f8d' }}><IInfo size={15} className="shrink-0 mt-0.5" /> {t('env.prevention.note')}</p>
    </div>
  );
}