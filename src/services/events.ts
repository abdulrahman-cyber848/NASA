// Calendar events — all found with astronomy-engine search functions at runtime.
// No hardcoded future dates anywhere.
import * as A from 'astronomy-engine';
import { addDays, zonedDayStartUTC, dateStrInTZ } from './time';
import { SUPERMOON_LIMIT_KM } from './astro';

export type CalEventKind = 'new' | 'first' | 'full' | 'third' | 'lunar-eclipse' | 'solar-global' | 'perigee' | 'apogee';

export interface CalEvent {
  id: string;
  kind: CalEventKind;
  time: Date;
  eclipseKind?: string;       // penumbral | partial | annular | total
  obscuration?: number;
  distKm?: number;
  supermoon?: boolean;
  subPeakLat?: number;
  subPeakLon?: number;
  local?: { visible: boolean; begin?: Date; end?: Date; peakAltitude?: number; obscuration?: number; kind?: string };
}

const QUARTER_KIND: CalEventKind[] = ['new', 'first', 'full', 'third'];

export function getMonthEvents(year: number, month0: number, tz: string, observer?: { lat: number; lon: number }): CalEvent[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthStart = zonedDayStartUTC(`${year}-${pad(month0 + 1)}-01`, tz);
  const nextMonth = month0 === 11 ? zonedDayStartUTC(`${year + 1}-01-01`, tz) : zonedDayStartUTC(`${year}-${pad(month0 + 2)}-01`, tz);
  const searchStart = addDays(monthStart, -2);
  const end = addDays(nextMonth, 2);
  const inMonth = (d: Date) => {
    const s = dateStrInTZ(d, tz);
    return s >= `${year}-${pad(month0 + 1)}-01` && s < (month0 === 11 ? `${year + 1}-01-01` : `${year}-${pad(month0 + 2)}-01`);
  };
  const events: CalEvent[] = [];

  // Phase quarters
  let mq = A.SearchMoonQuarter(searchStart);
  for (let i = 0; i < 8 && mq.time.date < end; i++) {
    if (inMonth(mq.time.date)) {
      const kind = QUARTER_KIND[mq.quarter];
      const ev: CalEvent = { id: `q-${mq.time.date.getTime()}`, kind, time: mq.time.date };
      if (kind === 'full' || kind === 'new') {
        ev.distKm = A.Libration(mq.time.date).dist_km;
        if (kind === 'full') ev.supermoon = ev.distKm <= SUPERMOON_LIMIT_KM;
      }
      events.push(ev);
    }
    mq = A.NextMoonQuarter(mq);
  }

  // Lunar eclipses (global; visible from the entire night side of Earth)
  let le = A.SearchLunarEclipse(searchStart);
  for (let i = 0; i < 3 && le.peak.date < end; i++) {
    if (inMonth(le.peak.date)) {
      events.push({ id: `le-${le.peak.date.getTime()}`, kind: 'lunar-eclipse', time: le.peak.date, eclipseKind: String(le.kind), obscuration: le.obscuration });
    }
    le = A.NextLunarEclipse(le.peak.date);
  }

  // Solar eclipses (global) + local circumstances for the selected observer
  let se = A.SearchGlobalSolarEclipse(searchStart);
  for (let i = 0; i < 3 && se.peak.date < end; i++) {
    if (inMonth(se.peak.date)) {
      events.push({
        id: `se-${se.peak.date.getTime()}`, kind: 'solar-global', time: se.peak.date,
        eclipseKind: String(se.kind), obscuration: se.obscuration,
        subPeakLat: se.latitude, subPeakLon: se.longitude,
        local: { visible: false },
      });
    }
    se = A.NextGlobalSolarEclipse(se.peak.date);
  }
  if (observer) {
    const obs = new A.Observer(observer.lat, observer.lon, 0);
    let ls = A.SearchLocalSolarEclipse(searchStart, obs);
    for (let i = 0; i < 3 && ls.peak.time.date < end; i++) {
      if (inMonth(ls.peak.time.date)) {
        const match = events.find(e => e.kind === 'solar-global' && Math.abs(e.time.getTime() - ls.peak.time.date.getTime()) < 6 * 3600000);
        const local = {
          visible: true,
          begin: ls.partial_begin?.time.date, end: ls.partial_end?.time.date,
          peakAltitude: ls.peak.altitude, obscuration: ls.obscuration, kind: String(ls.kind),
        };
        if (match) match.local = local;
        else events.push({ id: `sl-${ls.peak.time.date.getTime()}`, kind: 'solar-global', time: ls.peak.time.date, eclipseKind: String(ls.kind), local });
      }
      ls = A.NextLocalSolarEclipse(ls.peak.time.date, obs);
    }
  }

  // Lunar apsides
  let ap = A.SearchLunarApsis(addDays(monthStart, -29));
  for (let i = 0; i < 4 && ap.time.date < end; i++) {
    if (inMonth(ap.time.date)) {
      events.push({
        id: `ap-${ap.time.date.getTime()}`,
        kind: ap.kind === A.ApsisKind.Pericenter ? 'perigee' : 'apogee',
        time: ap.time.date, distKm: ap.dist_km,
      });
    }
    ap = A.NextLunarApsis(ap);
  }

  return events.sort((a, b) => a.time.getTime() - b.time.getTime());
}