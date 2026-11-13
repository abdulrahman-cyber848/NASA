'use client';
import { useMemo } from 'react';
import type { MoonSnapshot } from '@/services/astro';
import { apsidesAround, getHorizontal, getRiseSet } from '@/services/astro';
import { useApp } from '@/state/app';
import { fmtDistance, fmtNum, fmtArcsec } from '@/services/format';
import { fmtTime, fmtDate, zonedDayStartUTC, dateStrInTZ, tzLabel } from '@/services/time';
import { PhaseIcon } from './icons';
import { InfoTip } from './ui';
import LocationPicker from './LocationPicker';

export default function YourView({ snap }: { snap: MoonSnapshot }) {
  const { t, lang, prefs, location, date } = useApp();

  const apsides = useMemo(() => apsidesAround(date), [date]);
  const horiz = useMemo(() => getHorizontal(date, location), [date, location]);
  const riseSet = useMemo(() => {
    const dayStart = zonedDayStartUTC(dateStrInTZ(date, location.tz), location.tz);
    return getRiseSet(dayStart, location);
  }, [date, location]);

  const nextPerigee = apsides.next.kind === 'perigee' ? apsides.next : apsides.next2;
  const nextApogee = apsides.next.kind === 'apogee' ? apsides.next : apsides.next2;

  return (
    <section aria-label={t('guide.yourView')} className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="h-display text-xl font-bold">{t('guide.yourView')}</h2>
        <span className="chip chip-bl">{location.label} · {tzLabel(location.tz)}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* phase */}
        <div className="glass p-5 rise">
          <p className="lbl flex items-center gap-1.5">{t('guide.phase')} <InfoTip text={t('guide.illumTooltip')} /></p>
          <div className="flex items-center gap-3">
            <PhaseIcon fraction={snap.illumFraction} waxing={snap.waxing} size={54} />
            <div>
              <p className="stat-value">{fmtNum(snap.illumPct, lang, 0)}% <span className="text-sm font-normal" style={{ color: 'var(--color-dim)' }}>– {t('common.day', { d: fmtNum(Math.floor(snap.ageDays), lang) })}</span></p>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-cy)' }}>{t(`phase.${snap.phaseKey}`)}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--color-dim)' }}>
              <span>{t('guide.cycle')}</span><span>{fmtNum(snap.cycleProgress * 100, lang, 0)}%</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${snap.cycleProgress * 100}%` }} /></div>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: '#5f6f8d' }}>
              {t('guide.ageNote', { d: fmtDate(snap.prevNew, location.tz, lang) })}
            </p>
          </div>
        </div>

        {/* distance */}
        <div className="glass p-5 rise" style={{ animationDelay: '60ms' }}>
          <p className="lbl flex items-center gap-1.5">{t('guide.distance')} <InfoTip text={t('guide.distTooltip')} /></p>
          <p className="stat-value">{fmtDistance(snap.distanceKm, prefs.units, lang)}</p>
          <div className="mt-4 space-y-2 text-[12.5px]">
            <div className="flex justify-between gap-2">
              <span style={{ color: 'var(--color-dim)' }}>{t('guide.nextPerigee')}</span>
              <span className="text-end">{fmtDate(nextPerigee.time, location.tz, lang)} · {fmtDistance(nextPerigee.distKm, prefs.units, lang)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span style={{ color: 'var(--color-dim)' }}>{t('guide.nextApogee')}</span>
              <span className="text-end">{fmtDate(nextApogee.time, location.tz, lang)} · {fmtDistance(nextApogee.distKm, prefs.units, lang)}</span>
            </div>
          </div>
        </div>

        {/* angular diameter */}
        <div className="glass p-5 rise" style={{ animationDelay: '120ms' }}>
          <p className="lbl flex items-center gap-1.5">{t('guide.angDiam')} <InfoTip text={t('guide.angDiamTooltip')} /></p>
          <p className="stat-value">{fmtArcsec(snap.angularDiameterArcsec, lang)}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-dim)' }}>
            ≈ {fmtNum(snap.angularDiameterArcsec / 60, lang, 1)}′ {lang === 'ar' ? 'دقيقة قوسية' : 'arcminutes'}
          </p>
          <div className="mt-3">
            <div className="progress-track" aria-hidden>
              <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, ((snap.angularDiameterArcsec - 1760) / (2010 - 1760)) * 100))}%` }} />
            </div>
            <div className="flex justify-between text-[10.5px] mt-1" style={{ color: '#5f6f8d' }}>
              <span>{lang === 'ar' ? 'أصغر (أوج)' : 'smallest (apogee)'}</span>
              <span>{lang === 'ar' ? 'أكبر (حضيض)' : 'largest (perigee)'}</span>
            </div>
          </div>
        </div>

        {/* rise/set */}
        <div className="glass p-5 rise" style={{ animationDelay: '180ms' }}>
          <p className="lbl">{t('guide.riseSet')}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>↑ {t('guide.moonrise')}</p>
              <p className="h-display text-lg font-bold">{riseSet.rise ? fmtTime(riseSet.rise, location.tz, lang) : <span className="text-[12px] font-normal" style={{ color: 'var(--color-warn)' }}>{t('guide.noRise')}</span>}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>↓ {t('guide.moonset')}</p>
              <p className="h-display text-lg font-bold">{riseSet.set ? fmtTime(riseSet.set, location.tz, lang) : <span className="text-[12px] font-normal" style={{ color: 'var(--color-warn)' }}>{t('guide.noSet')}</span>}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>{t('guide.altitude')}</p>
              <p className="font-semibold">{fmtNum(horiz.altitude, lang, 1)}°</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>{t('guide.azimuth')}</p>
              <p className="font-semibold">{fmtNum(horiz.azimuth, lang, 1)}°</p>
            </div>
          </div>
          <span className={`chip mt-3 ${horiz.altitude > 0 ? 'chip-ok' : ''}`}>
            {t(horiz.altitude > 0 ? 'guide.aboveHorizon' : 'guide.belowHorizon')}
          </span>
        </div>
      </div>

      <div className="glass p-4">
        <p className="lbl">{t('guide.location')}</p>
        <LocationPicker />
      </div>

      <p className="text-[11px]" style={{ color: '#5f6f8d' }}>
        {t('common.computedAt', { t: fmtTime(snap.computedAt, location.tz, lang) })}
      </p>
    </section>
  );
}