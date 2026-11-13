'use client';
import type { ReactNode } from 'react';
import type { Landmark } from '@/data/landmarks';
import { REFERENCES, GAZETTEER_BASE, gazetteerFeatureUrl, IAU_URL } from '@/data/references';
import { useApp } from '@/state/app';

function RefA({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="ref-link"
      onClick={e => e.stopPropagation()}
    >
      {children}<span aria-hidden className="text-[0.9em]">↗</span>
    </a>
  );
}

/** Per-feature source line, e.g. "IAU Gazetteer of Planetary Nomenclature ↗ · IAU ↗" */
export function FeatureSourceLinks({ landmark, siteUrl }: { landmark?: Landmark; siteUrl?: string }) {
  const url = siteUrl ?? (landmark ? gazetteerFeatureUrl(landmark) : GAZETTEER_BASE);
  const label = landmark?.sourceNote ?? 'IAU Gazetteer of Planetary Nomenclature';
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <RefA href={url}>{label}</RefA>
      <span className="ref-sep" aria-hidden>·</span>
      <RefA href={IAU_URL}>IAU</RefA>
    </span>
  );
}

/** The full reference set used across the app. */
export function AllSources({ compact }: { compact?: boolean }) {
  const { t } = useApp();
  return (
    <div className={compact ? 'text-[10.5px]' : 'text-[11.5px]'}>
      {!compact && <p className="lbl">{t('refs.title')}</p>}
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 leading-relaxed">
        {REFERENCES.map((r, i) => (
          <span key={r.id} className="inline-flex items-center gap-1.5">
            {i > 0 && <span className="ref-sep" aria-hidden>·</span>}
            <RefA href={r.url}>{r.label}</RefA>
          </span>
        ))}
      </p>
      {!compact && <p className="mt-1.5 text-[10px]" style={{ color: '#5f6f8d' }}>{t('refs.newTab')}</p>}
    </div>
  );
}