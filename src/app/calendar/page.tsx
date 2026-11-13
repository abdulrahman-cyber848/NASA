'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, useMounted } from '@/state/app';
import { getMonthEvents, type CalEvent } from '@/services/events';
import { dayPhase, SUPERMOON_LIMIT_KM } from '@/services/astro';
import { zonedDayStartUTC, dateStrInTZ, fmtTime, fmtDateTime, tzLabel, addDays } from '@/services/time';
import { fmtDistance, fmtNum, fmtCoord } from '@/services/format';
import { PhaseIcon, IChevronL, IChevronR, IStar, IClock } from '@/components/icons';
import { Modal, InfoTip, PageSkeleton } from '@/components/ui';

const KIND_COLOR: Record<string, string> = {
  new: '#8b98b5', first: '#53D8E8', full: '#F1F5FF', third: '#929AFF',
  'lunar-eclipse': '#F87171', 'solar-global': '#F5B85C', perigee: '#4ADE80', apogee: '#6B8DFF',
};

function eventTitle(ev: CalEvent, t: (k: string, v?: Record<string, string | number>) => string): string {
  switch (ev.kind) {
    case 'new': return t('phase.new');
    case 'first': return t('phase.firstQuarter');
    case 'full': return ev.supermoon ? `${t('phase.full')} · ${t('cal.supermoon')}` : t('phase.full');
    case 'third': return t('phase.thirdQuarter');
    case 'lunar-eclipse': return `${t('cal.lunarEclipse')} — ${t(`cal.eu.${ev.eclipseKind}`)}`;
    case 'solar-global': return `${t('cal.solarEclipse')} — ${t(`cal.eu.${ev.local?.kind ?? ev.eclipseKind}`)}`;
    case 'perigee': return t('cal.perigee');
    case 'apogee': return t('cal.apogee');
  }
}

export default function CalendarPage() {
  const { t, lang, prefs, location, date, setDate } = useApp();
  const mounted = useMounted();
  const router = useRouter();
  const [month, setMonth] = useState(() => {
    const s = dateStrInTZ(date, location.tz);
    return { y: +s.slice(0, 4), m: +s.slice(5, 7) - 1 };
  });
  const [detail, setDetail] = useState<CalEvent | null>(null);

  const events = useMemo(
    () => getMonthEvents(month.y, month.m, location.tz, { lat: location.lat, lon: location.lon }),
    [month, location],
  );

  const days = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const count = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
    const firstDow = new Date(Date.UTC(month.y, month.m, 1)).getUTCDay();
    const list: { day: number; str: string; noon: Date; phase: ReturnType<typeof dayPhase>; evs: CalEvent[] }[] = [];
    for (let d = 1; d <= count; d++) {
      const str = `${month.y}-${pad(month.m + 1)}-${pad(d)}`;
      const noon = addDays(zonedDayStartUTC(str, location.tz), 0.5);
      list.push({ day: d, str, noon, phase: dayPhase(noon), evs: events.filter(e => dateStrInTZ(e.time, location.tz) === str) });
    }
    return { list, firstDow };
  }, [month, events, location.tz]);

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 7 + i)))); // Jan 7 2024 = Sunday
  }, [lang]);

  const monthName = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(month.y, month.m, 15)));
  const todayStr = dateStrInTZ(new Date(), location.tz);
  const selectedStr = dateStrInTZ(date, location.tz);

  const openDay = (noon: Date) => { setDate(noon); router.push(`/?d=${encodeURIComponent(noon.toISOString())}`); };
  const shiftMonth = (d: number) => setMonth(({ y, m }) => {
    const n = new Date(Date.UTC(y, m + d, 1));
    return { y: n.getUTCFullYear(), m: n.getUTCMonth() };
  });

  if (!mounted) return <PageSkeleton />;
  return (
    <div className="container-x py-8 space-y-6">
      <header className="rise">
        <p className="eyebrow">{t('brand.tag')}</p>
        <h1 className="h-display mt-1 text-3xl sm:text-4xl font-bold">{t('cal.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--color-dim)' }}>{t('cal.subtitle')}</p>
      </header>

      <div className="glass p-4 flex flex-wrap items-center gap-3 rise">
        <button className="btn btn-ghost btn-icon" onClick={() => shiftMonth(-1)} aria-label={t('cal.prevMonth')}><IChevronL size={16} className="rtl:rotate-180" /></button>
        <h2 className="h-display text-xl font-bold min-w-[170px] text-center">{monthName}</h2>
        <button className="btn btn-ghost btn-icon" onClick={() => shiftMonth(1)} aria-label={t('cal.nextMonth')}><IChevronR size={16} className="rtl:rotate-180" /></button>
        <button className="btn btn-ghost btn-sm" onClick={() => { const s = dateStrInTZ(new Date(), location.tz); setMonth({ y: +s.slice(0, 4), m: +s.slice(5, 7) - 1 }); }}>
          <IClock size={14} /> {t('common.today')}
        </button>
        <span className="chip ms-auto">{t('cal.timesIn', { tz: tzLabel(location.tz) })} · {location.label}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        {/* month grid */}
        <div className="glass p-4 rise" style={{ animationDelay: '80ms' }}>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {weekdays.map(w => <div key={w} className="lbl !mb-1 py-1">{w}</div>)}
            {Array.from({ length: days.firstDow }).map((_, i) => <div key={`b${i}`} />)}
            {days.list.map(d => (
              <button
                key={d.str}
                onClick={() => openDay(d.noon)}
                className="relative rounded-xl border p-1.5 sm:p-2 flex flex-col items-center gap-1 min-h-[74px] sm:min-h-[86px] transition-colors hover:border-[rgba(83,216,232,0.5)]"
                style={{
                  borderColor: d.str === selectedStr ? 'rgba(83,216,232,0.6)' : 'var(--line)',
                  background: d.str === todayStr ? 'rgba(107,141,255,0.1)' : 'rgba(8,14,27,0.4)',
                }}
                aria-label={`${d.day} ${monthName}`}
              >
                <span className={`text-[11.5px] font-semibold ${d.str === todayStr ? 'text-[#9EE8F2]' : ''}`} style={{ color: d.str === todayStr ? undefined : 'var(--color-dim)' }}>
                  {fmtNum(d.day, lang)}
                </span>
                <PhaseIcon fraction={d.phase.fraction} waxing={d.phase.waxing} size={26} />
                <span className="flex gap-1 flex-wrap justify-center">
                  {d.evs.slice(0, 4).map(ev => (
                    <span key={ev.id} className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: KIND_COLOR[ev.kind] }} title={eventTitle(ev, t)} />
                  ))}
                </span>
                {d.evs.some(e => e.supermoon) && <IStar size={10} filled className="absolute top-1 end-1 text-[#F5B85C]" />}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px]" style={{ color: '#5f6f8d' }}>{t('cal.clickDay')}</p>
        </div>

        {/* events */}
        <div className="space-y-4 rise" style={{ animationDelay: '120ms' }}>
          <div className="glass p-5">
            <h3 className="h-display text-lg font-bold">{t('cal.events')}</h3>
            {events.length === 0 ? (
              <p className="mt-3 text-sm" style={{ color: 'var(--color-dim)' }}>{t('cal.noEvents')}</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {events.map(ev => (
                  <li key={ev.id}>
                    <button className="w-full text-start rounded-xl border p-3 hover:border-[rgba(83,216,232,0.5)] transition-colors" style={{ borderColor: 'var(--line)', background: 'rgba(8,14,27,0.45)' }} onClick={() => setDetail(ev)}>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: KIND_COLOR[ev.kind] }} />
                        <span className="text-sm font-semibold truncate">{eventTitle(ev, t)}</span>
                        {ev.supermoon && <span className="chip chip-amber shrink-0 ms-auto">{t('cal.supermoon')}</span>}
                      </div>
                      <p className="mt-1 text-[11.5px]" style={{ color: 'var(--color-dim)' }}>
                        {fmtDateTime(ev.time, location.tz, lang)} · {fmtTime(ev.time, 'UTC', lang)} UTC
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="glass p-4 flex gap-2.5">
            <InfoTip text={t('cal.supermoonRule')} />
            <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t('cal.supermoonRule')}</p>
          </div>
        </div>
      </div>

      {/* event detail */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? eventTitle(detail, t) : ''} wide>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="glass p-3">
                <p className="lbl">{t('cal.peak')} — {tzLabel(location.tz)}</p>
                <p className="h-display font-bold">{fmtDateTime(detail.time, location.tz, lang)}</p>
              </div>
              <div className="glass p-3">
                <p className="lbl">{t('cal.peak')} — UTC</p>
                <p className="h-display font-bold">{fmtDateTime(detail.time, 'UTC', lang)}</p>
              </div>
            </div>

            {detail.distKm != null && (
              <p><span style={{ color: 'var(--color-dim)' }}>{t('cal.distance')}: </span>{fmtDistance(detail.distKm, prefs.units, lang)}</p>
            )}
            {detail.supermoon && (
              <div className="rounded-xl border p-3 text-[12.5px]" style={{ borderColor: 'rgba(245,184,92,0.4)', background: 'rgba(245,184,92,0.07)' }}>
                ★ {t('cal.supermoonRule')} <span style={{ color: 'var(--color-dim)' }}>({fmtNum(SUPERMOON_LIMIT_KM, lang)} km)</span>
              </div>
            )}

            {detail.kind === 'lunar-eclipse' && (
              <>
                <p><span style={{ color: 'var(--color-dim)' }}>{t('cal.obscuration')}: </span>{fmtNum((detail.obscuration ?? 0) * 100, lang, 1)}%</p>
                <p className="text-[12.5px]" style={{ color: 'var(--color-dim)' }}>{t('cal.globalEvent')}</p>
              </>
            )}

            {detail.kind === 'solar-global' && (
              <div className="space-y-2">
                {detail.subPeakLat != null && detail.subPeakLon != null && (
                  <p><span style={{ color: 'var(--color-dim)' }}>{lang === 'ar' ? 'مركز الظل:' : 'Shadow center: '}</span>{fmtCoord(detail.subPeakLat, detail.subPeakLon, lang)}</p>
                )}
                {detail.local?.visible ? (
                  <div className="rounded-xl border p-3 space-y-1.5" style={{ borderColor: 'rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.06)' }}>
                    <p className="font-semibold text-[#86EFAC]">{t('cal.visibleHere', { loc: location.label })} — {t(`cal.eu.${detail.local.kind}`)}</p>
                    {detail.local.begin && <p className="text-[12.5px]">{t('cal.begins')}: {fmtDateTime(detail.local.begin, location.tz, lang)} · {fmtTime(detail.local.begin, 'UTC', lang)} UTC</p>}
                    {detail.local.end && <p className="text-[12.5px]">{t('cal.ends')}: {fmtDateTime(detail.local.end, location.tz, lang)} · {fmtTime(detail.local.end, 'UTC', lang)} UTC</p>}
                    <p className="text-[12.5px]">{t('cal.obscuration')}: {fmtNum((detail.local.obscuration ?? 0) * 100, lang, 1)}% · {t('cal.peakAltitude')}: {fmtNum(detail.local.peakAltitude ?? 0, lang, 1)}°</p>
                  </div>
                ) : (
                  <p className="chip chip-danger">{t('cal.notVisibleHere', { loc: location.label })}</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn btn-primary btn-sm" onClick={() => { setDate(detail.time); router.push(`/?d=${encodeURIComponent(detail.time.toISOString())}`); }}>
                {t('common.openGuide')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}