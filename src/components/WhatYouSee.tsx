'use client';
import Link from 'next/link';
import type { EvaluatedLandmark, SitesMode } from '@/services/visibility';
import { useApp } from '@/state/app';
import { fmtNum } from '@/services/format';
import { EmptyState, InfoTip } from './ui';
import { IStar, ICube } from './icons';
import { FeatureSourceLinks, AllSources } from './SourceLinks';
import { siteGazetteerUrl } from './LandmarkDetail';

interface Props {
  items: EvaluatedLandmark[];
  anyGeoVisible: boolean;
  mode: SitesMode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  date: Date;
}

export default function WhatYouSee({ items, anyGeoVisible, mode, selectedId, onSelect, date }: Props) {
  const { t, lang, favorites, toggleFavorite } = useApp();

  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2">
        <h2 className="h-display text-lg font-bold">{t('guide.whatYouSee')}</h2>
        <InfoTip text={t('guide.whatYouSeeHint')} />
        <span className="chip ms-auto">{fmtNum(items.length, lang)}</span>
      </div>

      {items.length === 0 ? (
        anyGeoVisible
          ? <EmptyState icon="🔭" title={t('guide.emptyFiltered')} body={t('guide.emptyFilteredHint')} />
          : <EmptyState icon="🌑" title={t('guide.empty')} body={t('guide.emptyHint')} />
      ) : (
        <ul className="mt-3 space-y-2" role="list">
          {items.map((ev, i) => {
            const l = ev.landmark;
            const fav = favorites.has(l.id);
            const selected = selectedId === l.id;
            return (
              <li key={l.id}>
                <div
                  className="w-full rounded-xl border p-3 transition-colors cursor-pointer"
                  style={{
                    borderColor: selected ? 'rgba(83,216,232,0.55)' : 'var(--line)',
                    background: selected ? 'rgba(83,216,232,0.07)' : 'rgba(8,14,27,0.45)',
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  onClick={() => onSelect(l.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { onSelect(l.id); e.preventDefault(); } }}
                >
                  <div className="flex items-center gap-2.5">
                    {mode === 'recommended' && (
                      <span className="h-display flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: 'linear-gradient(120deg, rgba(83,216,232,0.25), rgba(107,141,255,0.3))', color: '#9EE8F2' }}>
                        {fmtNum(i + 1, lang)}
                      </span>
                    )}
                    <span className={`inline-block h-2 w-2 rounded-full shrink-0`} style={{ background: l.type === 'crater' ? 'var(--color-amber)' : 'var(--color-cy)' }} />
                    <p className="font-semibold text-sm truncate">{lang === 'ar' ? l.nameAr : l.name}</p>
                    <span className="chip hidden sm:inline-flex shrink-0">{t(`lm.${l.type}`)}</span>
                    <div className="ms-auto flex items-center gap-1.5 shrink-0">
                      <Link
                        href={`/explorer?focus=${l.id}&d=${encodeURIComponent(date.toISOString())}`}
                        className="btn btn-ghost btn-sm !px-2 !py-1.5 text-[#9EE8F2] hover:text-[#C6F3F9]"
                        title={t('common.view3d')}
                        aria-label={`${t('common.view3d')} — ${lang === 'ar' ? l.nameAr : l.name}`}
                        onClick={e => e.stopPropagation()}
                      >
                        <ICube size={14} />
                        <span className="hidden md:inline text-[11.5px]">{t('common.view3d')}</span>
                        <span className="md:hidden text-[11px] font-bold">3D</span>
                      </Link>
                      <button
                        className={`btn btn-ghost btn-icon !p-1.5 ${fav ? 'text-[#F5B85C]' : ''}`}
                        aria-label={t(fav ? 'toast.favRemoved' : 'toast.favAdded')}
                        aria-pressed={fav}
                        onClick={e => { e.stopPropagation(); toggleFavorite(l.id); }}
                      >
                        <IStar size={14} filled={fav} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>
                    {t('vis.sunElev', { d: fmtNum(ev.sunElevationDeg, lang, 0) })} · {t('vis.angularSize', { s: fmtNum(ev.angularSizeArcsec, lang, 0) })}
                    <span className="block" style={{ color: ev.note === 'great-shadows' ? '#7fe4f0' : '#8b98b5' }}>{t(`vis.${ev.note}`)}</span>
                  </p>
                  {mode === 'all' && (
                    <div className="mt-1.5 text-[10.5px]">
                      <FeatureSourceLinks landmark={l as never} siteUrl={siteGazetteerUrl(l)} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {mode === 'all' && items.length > 0 && (
        <div className="mt-4 rounded-xl border p-3.5" style={{ borderColor: 'var(--line)', background: 'rgba(8,14,27,0.4)' }}>
          <AllSources />
        </div>
      )}

      <div className="divider my-4" />
      <p className="text-[11px] leading-relaxed" style={{ color: '#5f6f8d' }}>{t('vis.equipmentNote')}</p>
    </div>
  );
}