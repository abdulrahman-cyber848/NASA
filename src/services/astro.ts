// LunaNav calculation layer — every time-dependent value comes from astronomy-engine.
// Moon-fixed frame: +X = prime meridian at equator, +Y = 90°E at equator, +Z = north pole.
// Built from the IAU 2015 rotation model exposed by Astronomy.RotationAxis(Body.Moon).
import * as A from 'astronomy-engine';
import { addDays } from './time';

export type Vec3 = [number, number, number];
const DEG = Math.PI / 180;

export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: Vec3): Vec3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

function rotateAround(v: Vec3, axis: Vec3, rad: number): Vec3 {
  const c = Math.cos(rad), s = Math.sin(rad);
  const k = cross(axis, v), d = dot(axis, v) * (1 - c);
  return [v[0] * c + k[0] * s + axis[0] * d, v[1] * c + k[1] * s + axis[1] * d, v[2] * c + k[2] * s + axis[2] * d];
}

/** Unit surface vector for selenographic lat/lon (east-positive) in the Moon-fixed frame. */
export function surfaceVector(latDeg: number, lonDeg: number): Vec3 {
  const la = latDeg * DEG, lo = lonDeg * DEG;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}

export function vecToLatLon(v: Vec3): { lat: number; lon: number } {
  return { lat: Math.asin(Math.max(-1, Math.min(1, v[2]))) / DEG, lon: Math.atan2(v[1], v[0]) / DEG };
}

/** Sun and Earth directions expressed in the Moon-fixed (selenographic) frame. */
export function moonFrame(date: Date): { sun: Vec3; earth: Vec3 } {
  const axis = A.RotationAxis(A.Body.Moon, date);
  const north = norm([axis.north.x, axis.north.y, axis.north.z]);
  const node = norm(cross([0, 0, 1], north)); // ascending node of lunar equator on J2000 equator
  const m0 = norm(rotateAround(node, north, axis.spin * DEG)); // IAU prime meridian direction (W)
  const m90 = cross(north, m0);
  const toBody = (v: { x: number; y: number; z: number }): Vec3 => {
    const u: Vec3 = [v.x, v.y, v.z];
    return [dot(u, m0), dot(u, m90), dot(u, north)];
  };
  const gm = A.GeoMoon(date); // geocentric Moon vector (Earth→Moon), EQJ, AU
  const gs = A.GeoVector(A.Body.Sun, date, false); // geocentric Sun (Earth→Sun), EQJ, AU
  // Moon→Sun = (Earth→Sun) − (Earth→Moon); Moon→Earth = −(Earth→Moon)
  return {
    sun: norm(toBody({ x: gs.x - gm.x, y: gs.y - gm.y, z: gs.z - gm.z })),
    earth: norm(toBody({ x: -gm.x, y: -gm.y, z: -gm.z })),
  };
}

export const PHASE_KEYS = ['new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'thirdQuarter', 'waningCrescent'] as const;
export type PhaseKey = typeof PHASE_KEYS[number];

export function phaseKeyFromLongitude(lon: number): PhaseKey {
  return PHASE_KEYS[Math.floor((((lon % 360) + 360) % 360 + 22.5) % 360 / 45)];
}

export interface MoonSnapshot {
  date: Date;
  phaseLongitude: number;      // 0..360 ecliptic elongation
  phaseKey: PhaseKey;
  waxing: boolean;
  phaseAngleDeg: number;       // Sun–Moon–Earth angle
  illumFraction: number;       // 0..1 of the visible near-side disk
  illumPct: number;
  ageDays: number;             // since the previous actual New Moon event
  cycleDays: number;           // length of this actual lunation
  cycleProgress: number;       // 0..1
  prevNew: Date;
  nextNew: Date;
  distanceKm: number;          // Earth-center ↔ Moon-center
  angularDiameterArcsec: number;
  subEarth: { lat: number; lon: number };  // libration included
  subSolar: { lat: number; lon: number };
  sunBody: Vec3;
  earthBody: Vec3;
  opticalLibration: { lonDeg: number; latDeg: number };
  computedAt: Date;
}

function newMoonsAround(date: Date): { prev: Date; next: Date } {
  const first = A.SearchMoonPhase(0, addDays(date, -33), 40);
  if (!first) throw new Error('New Moon search failed');
  let prev = first.date;
  let next = A.SearchMoonPhase(0, addDays(prev, 25), 10)?.date;
  if (!next) throw new Error('New Moon search failed');
  if (next.getTime() <= date.getTime()) {
    prev = next;
    next = A.SearchMoonPhase(0, addDays(prev, 25), 10)!.date;
  }
  return { prev, next };
}

export function getMoonSnapshot(date: Date): MoonSnapshot {
  const illum = A.Illumination(A.Body.Moon, date);
  const lon = A.MoonPhase(date);
  const lib = A.Libration(date);
  const frame = moonFrame(date);
  const { prev, next } = newMoonsAround(date);
  const cycleMs = next.getTime() - prev.getTime();
  const ageMs = date.getTime() - prev.getTime();
  return {
    date,
    phaseLongitude: lon,
    phaseKey: phaseKeyFromLongitude(lon),
    waxing: lon < 180,
    phaseAngleDeg: illum.phase_angle,
    illumFraction: illum.phase_fraction,
    illumPct: illum.phase_fraction * 100,
    ageDays: ageMs / 86400000,
    cycleDays: cycleMs / 86400000,
    cycleProgress: Math.max(0, Math.min(1, ageMs / cycleMs)),
    prevNew: prev,
    nextNew: next,
    distanceKm: lib.dist_km,
    angularDiameterArcsec: lib.diam_deg * 3600,
    subEarth: vecToLatLon(frame.earth),
    subSolar: vecToLatLon(frame.sun),
    sunBody: frame.sun,
    earthBody: frame.earth,
    opticalLibration: { lonDeg: lib.elon, latDeg: lib.elat },
    computedAt: new Date(),
  };
}

export interface ObserverLocation { lat: number; lon: number; tz: string; label?: string }

export function getHorizontal(date: Date, loc: { lat: number; lon: number }): { altitude: number; azimuth: number; ra: number; dec: number } {
  const obs = new A.Observer(loc.lat, loc.lon, 0);
  const eq = A.Equator(A.Body.Moon, date, obs, true, true);
  const hor = A.Horizon(date, obs, eq.ra, eq.dec, 'normal');
  return { altitude: hor.altitude, azimuth: hor.azimuth, ra: eq.ra, dec: eq.dec };
}

/** Rise/set within one local calendar day starting at dayStartUTC. Null = event does not occur that day. */
export function getRiseSet(dayStartUTC: Date, loc: { lat: number; lon: number }): { rise: Date | null; set: Date | null } {
  const obs = new A.Observer(loc.lat, loc.lon, 0);
  const rise = A.SearchRiseSet(A.Body.Moon, obs, +1, dayStartUTC, 1);
  const set = A.SearchRiseSet(A.Body.Moon, obs, -1, dayStartUTC, 1);
  return { rise: rise ? rise.date : null, set: set ? set.date : null };
}

export interface ApsisInfo { kind: 'perigee' | 'apogee'; time: Date; distKm: number }

export function apsidesAround(date: Date): { prev: ApsisInfo; next: ApsisInfo; next2: ApsisInfo } {
  let a = A.SearchLunarApsis(addDays(date, -30));
  let prev: ApsisInfo | null = null;
  for (let i = 0; i < 6; i++) {
    const info: ApsisInfo = { kind: a.kind === A.ApsisKind.Pericenter ? 'perigee' : 'apogee', time: a.time.date, distKm: a.dist_km };
    if (a.time.date.getTime() > date.getTime()) {
      const n2 = A.NextLunarApsis(a);
      const next2: ApsisInfo = { kind: n2.kind === A.ApsisKind.Pericenter ? 'perigee' : 'apogee', time: n2.time.date, distKm: n2.dist_km };
      return { prev: prev ?? info, next: info, next2 };
    }
    prev = info;
    a = A.NextLunarApsis(a);
  }
  throw new Error('Apsis search failed');
}

export type SeriesRange = '7d' | '30d' | '1y';
export interface SeriesPoint { t: number; illumPct: number; distanceKm: number; angularDiameterArcsec: number }

export function getSeries(center: Date, range: SeriesRange): SeriesPoint[] {
  const cfg = range === '7d' ? { span: 7, step: 0.25 } : range === '30d' ? { span: 30, step: 1 } : { span: 365, step: 3 };
  const start = addDays(center, -cfg.span / 2).getTime();
  const n = Math.round(cfg.span / cfg.step);
  const out: SeriesPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const d = new Date(start + i * cfg.step * 86400000);
    const ill = A.Illumination(A.Body.Moon, d);
    const lib = A.Libration(d);
    out.push({ t: d.getTime(), illumPct: ill.phase_fraction * 100, distanceKm: lib.dist_km, angularDiameterArcsec: lib.diam_deg * 3600 });
  }
  return out;
}

/** Lightweight per-day phase data for calendar icons. */
export function dayPhase(date: Date): { fraction: number; waxing: boolean; lon: number } {
  const lon = A.MoonPhase(date);
  const ill = A.Illumination(A.Body.Moon, date);
  return { fraction: ill.phase_fraction, waxing: lon < 180, lon };
}

/** LunaNav supermoon classification rule (documented in the UI): Full Moon with
 *  geocentric distance ≤ 360,000 km. Not a universal scientific definition. */
export const SUPERMOON_LIMIT_KM = 360000;