'use client';
import Link from 'next/link';
import type { EvaluatedLandmark } from '@/services/visibility';
import type { MoonSite } from '@/data/sites';
import type { MoonSnapshot } from '@/services/astro';
import { useApp } from '@/state/app';
import { fmtCoord, fmtDistance, fmtNum, fmtArcsec } from '@/services/format';
import { gazetteerFeatureUrl } from '@/data/references';
import { ORIGINAL_SITES } from '@/data/sites';
import { IStar, IX, ICube } from './icons';

/** True when the site belongs to LunaNav's original curated set. */
const ORIGINAL_IDS = new Set(ORIGINAL_SITES.map(s => s.id));
import { FeatureSourceLinks, AllSources } from './SourceLinks';

/** Gazetteer URL for any site — direct IAU id when known, else a name search. */
export function siteGazetteerUrl(site: MoonSite): string {
  return site.iauId
    ? `https://planetarynames.wr.usgs.gov/Feature/${site.iauId}`
    : `https://planetarynames.wr.usgs.gov/SearchResults?featureName=${encodeURIComponent(site.name)}&target=MOON`;
}

export default function LandmarkDetail({ item, snap, onClose }: { item: EvaluatedLandmark; snap: MoonSnapshot; onClose: () => void }) {
  const { t, lang, prefs, favorites, toggleFavorite } = useApp();
  const l = item.landmark;
  const fav = favorites.has(l.id);
  const isOriginal = ORIGINAL_IDS.has(l.id);
  const name = lang === 'ar' ? l.nameAr : l.name;
  const altName = lang === 'ar' ? l.name : l.nameAr;

  return (
    <div className="glass p-5 rise" role="region" aria-label={name}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="h-display text-xl font-bold">{name}</h3>
            <span className={`chip ${l.type === 'crater' ? 'chip-amber' : 'chip-cy'}`}>{t(`lm.${l.type}`)}</span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#5f6f8d' }}>{altName}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            className={`btn btn-ghost btn-icon ${fav ? 'text-[#F5B85C]' : ''}`}
            onClick={() => toggleFavorite(l.id)}
            aria-pressed={fav}
            aria-label={t(fav ? 'toast.favRemoved' : 'toast.favAdded')}
          >
            <IStar size={16} filled={fav} />
          </button>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('common.close')}><IX size={16} /></button>
        </div>
      </div>

      <div className="mt-4">
        <p className="lbl">{t('lm.statusNow')}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className={`chip ${item.geoVisible ? 'chip-ok' : 'chip-danger'}`}>
            {item.geoVisible ? t('vis.geoVisible') : t(item.note === 'far-side' ? 'vis.far-side' : 'vis.in-shadow')}
          </span>
          {item.geoVisible && <span className="chip">{t('vis.sunElev', { d: fmtNum(item.sunElevationDeg, lang, 0) })}</span>}
          <span className="chip">{t('vis.angularSize', { s: fmtNum(item.angularSizeArcsec, lang, 0) })}</span>
          {item.geoVisible && <span className="chip chip-bl">{t(`vis.${item.note}`)}</span>}
        </div>
      </div>

      {/* provenance: coordinate confidence + whether the site came from NASA's guide */}
      {l.confidence && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]" style={{ color: '#5f6f8d' }}>
          <span>{t('tel.confidence')}:</span>
          <span className={`chip !py-0.5 ${l.confidence === 'iau' ? 'chip-ok' : l.confidence === 'verified' ? 'chip-cy' : 'chip-amber'}`}>
            {t(l.confidence === 'iau' ? 'tel.conf.iau' : l.confidence === 'verified' ? 'tel.conf.verified' : 'tel.conf.reference')}
          </span>
          <span className="chip !py-0.5">{isOriginal ? t('tel.original') : t('tel.nasa')}</span>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="lbl">{t('lm.coordinates')}</dt>
          <dd>{fmtCoord(l.lat, l.lon, lang)}</dd>
        </div>
        <div>
          <dt className="lbl">{t('lm.diameter')}</dt>
          <dd>{fmtDistance(l.diameterKm, prefs.units, lang)}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3 text-sm leading-relaxed">
        <div>
          <p className="lbl">{t('lm.description')}</p>
          <p style={{ color: 'var(--color-snow)' }}>{lang === 'ar' ? l.descriptionAr : l.description}</p>
        </div>
        <div>
          <p className="lbl">{t('lm.significance')}</p>
          <p style={{ color: 'var(--color-dim)' }}>{lang === 'ar' ? l.significanceAr : l.significance}</p>
        </div>
      </div>

      <div className="divider my-4" />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px]" style={{ color: '#5f6f8d' }}>
          {t('lm.source')}: <FeatureSourceLinks landmark={l as never} siteUrl={siteGazetteerUrl(l)} />
        </p>
        <Link href={`/explorer?focus=${l.id}&d=${encodeURIComponent(snap.date.toISOString())}`} className="btn btn-primary btn-sm">
          <ICube size={15} /> {t('common.view3d')}
        </Link>
      </div>
      <div className="mt-3">
        <AllSources compact />
      </div>
    </div>
  );
}