// Scientific validation suite. Reference values from independent published
// almanacs (timeanddate.com moon phase tables, NASA eclipse catalog).
import { describe, it, expect } from 'vitest';
import * as A from 'astronomy-engine';
import { getMoonSnapshot, moonFrame, apsidesAround, dot, PHASE_KEYS } from '../astro';
import { evaluateLandmarks } from '../visibility';

const MIN = 60000;
const near = (a: Date, iso: string, tolMin: number) => Math.abs(a.getTime() - new Date(iso).getTime()) <= tolMin * MIN;

describe('phase events vs published references (Jan 2024)', () => {
  it('New Moon 2024-01-11 11:57 UTC (±15 min)', () => {
    const t = A.SearchMoonPhase(0, new Date('2024-01-01T00:00:00Z'), 20)!;
    expect(near(t.date, '2024-01-11T11:57:00Z', 15)).toBe(true);
  });
  it('First Quarter 2024-01-18 03:53 UTC (±20 min)', () => {
    const t = A.SearchMoonPhase(90, new Date('2024-01-12T00:00:00Z'), 10)!;
    expect(near(t.date, '2024-01-18T03:53:00Z', 20)).toBe(true);
  });
  it('Full Moon 2024-01-25 17:54 UTC (±15 min)', () => {
    const t = A.SearchMoonPhase(180, new Date('2024-01-20T00:00:00Z'), 10)!;
    expect(near(t.date, '2024-01-25T17:54:00Z', 15)).toBe(true);
  });
  it('Third Quarter 2024-01-04 03:30 UTC (±20 min)', () => {
    const t = A.SearchMoonPhase(270, new Date('2024-01-01T00:00:00Z'), 10)!;
    expect(near(t.date, '2024-01-04T03:30:00Z', 20)).toBe(true);
  });
});

describe('illumination', () => {
  it('≈0% at New Moon, ≈100% at Full Moon', () => {
    const nm = A.Illumination(A.Body.Moon, new Date('2024-01-11T11:57:00Z'));
    const fm = A.Illumination(A.Body.Moon, new Date('2024-01-25T17:54:00Z'));
    expect(nm.phase_fraction).toBeLessThan(0.005);
    expect(fm.phase_fraction).toBeGreaterThan(0.995);
    expect(fm.phase_angle).toBeLessThan(6);
  });
  it('moon age at Full Moon is ~14.7 days (actual lunation, not fixed 29.53/2)', () => {
    const snap = getMoonSnapshot(new Date('2024-01-25T18:00:00Z'));
    expect(snap.ageDays).toBeGreaterThan(13.5);
    expect(snap.ageDays).toBeLessThan(15.5);
    expect(snap.phaseKey).toBe('full');
    expect(snap.cycleDays).toBeGreaterThan(29);
    expect(snap.cycleDays).toBeLessThan(30);
  });
  it('phase keys cover all 8 names', () => {
    expect(PHASE_KEYS.length).toBe(8);
  });
});

describe('lunar distance & angular diameter', () => {
  it('perigee 2024-01-13 ≈ 362,263 km (±2,500 km, ±1 day)', () => {
    const a = A.SearchLunarApsis(new Date('2024-01-10T00:00:00Z'));
    expect(a.kind).toBe(A.ApsisKind.Pericenter);
    expect(near(a.time.date, '2024-01-13T10:36:00Z', 24 * 60)).toBe(true);
    expect(Math.abs(a.dist_km - 362263)).toBeLessThan(2500);
  });
  it('apogee 2024-01-01 ≈ 404,911 km (±2,500 km, ±1 day)', () => {
    const a = A.SearchLunarApsis(new Date('2023-12-30T00:00:00Z'));
    expect(a.kind).toBe(A.ApsisKind.Apocenter);
    expect(near(a.time.date, '2024-01-01T15:28:00Z', 24 * 60)).toBe(true);
    expect(Math.abs(a.dist_km - 404911)).toBeLessThan(2500);
  });
  it('angular diameter matches 2·atan(1737.4/d) and stays within 1760–2010″', () => {
    for (let m = 0; m < 12; m++) {
      const d = new Date(Date.UTC(2024, m, 15));
      const lib = A.Libration(d);
      const geometric = 2 * Math.atan(1737.4 / lib.dist_km) * (180 / Math.PI) * 3600;
      expect(Math.abs(geometric - lib.diam_deg * 3600) / geometric).toBeLessThan(0.005);
      expect(lib.diam_deg * 3600).toBeGreaterThan(1760);
      expect(lib.diam_deg * 3600).toBeLessThan(2010);
    }
  });
  it('apsidesAround returns alternating perigee/apogee after the date', () => {
    const { next, next2 } = apsidesAround(new Date('2024-06-10T00:00:00Z'));
    expect(next.kind).not.toBe(next2.kind);
    expect(next.time.getTime()).toBeGreaterThan(new Date('2024-06-10T00:00:00Z').getTime());
  });
});

describe('lunar eclipses vs NASA catalog', () => {
  it('penumbral eclipse 2024-03-25, peak ≈ 07:12 UTC (±30 min)', () => {
    const e = A.SearchLunarEclipse(new Date('2024-03-01T00:00:00Z'));
    expect(String(e.kind)).toBe('penumbral');
    expect(near(e.peak.date, '2024-03-25T07:12:00Z', 30)).toBe(true);
  });
  it('partial eclipse 2023-10-28, peak ≈ 20:14 UTC (±30 min)', () => {
    const e = A.SearchLunarEclipse(new Date('2023-10-01T00:00:00Z'));
    expect(String(e.kind)).toBe('partial');
    expect(near(e.peak.date, '2023-10-28T20:14:00Z', 30)).toBe(true);
  });
});

describe('Moon-fixed frame consistency', () => {
  it('angle between body-frame Sun and Earth ≈ illumination phase angle', () => {
    for (const iso of ['2024-01-18T04:00:00Z', '2024-06-22T01:00:00Z', '2024-11-15T21:00:00Z']) {
      const d = new Date(iso);
      const f = moonFrame(d);
      const angle = Math.acos(Math.max(-1, Math.min(1, dot(f.sun, f.earth)))) * 180 / Math.PI;
      const ill = A.Illumination(A.Body.Moon, d);
      expect(Math.abs(angle - ill.phase_angle)).toBeLessThan(0.7);
    }
  });
  it('sub-Earth point stays within libration limits (|lon| ≤ 9°, |lat| ≤ 7.5°)', () => {
    for (let i = 0; i < 12; i++) {
      const snap = getMoonSnapshot(new Date(Date.UTC(2024, i, 10)));
      expect(Math.abs(snap.subEarth.lon)).toBeLessThan(9);
      expect(Math.abs(snap.subEarth.lat)).toBeLessThan(7.5);
    }
  });
});

describe('vector visibility', () => {
  it('nothing near-side is sunlit at New Moon', () => {
    const snap = getMoonSnapshot(new Date('2024-01-11T12:00:00Z'));
    const ev = evaluateLandmarks(snap, 'telescope');
    expect(ev.filter(e => e.geoVisible).length).toBe(0);
  });
  it('major near-side landmarks are visible at Full Moon', () => {
    const snap = getMoonSnapshot(new Date('2024-01-25T18:00:00Z'));
    const ev = evaluateLandmarks(snap, 'telescope');
    for (const id of ['tycho', 'copernicus', 'mare-crisium', 'oceanus-procellarum']) {
      expect(ev.find(e => e.landmark.id === id)!.geoVisible).toBe(true);
    }
  });
  it('Mare Crisium (59°E) is lit at First Quarter; western maria are near the terminator', () => {
    const snap = getMoonSnapshot(new Date('2024-01-18T04:00:00Z'));
    const ev = evaluateLandmarks(snap, 'binoculars');
    expect(ev.find(e => e.landmark.id === 'mare-crisium')!.geoVisible).toBe(true);
    const procellarum = ev.find(e => e.landmark.id === 'oceanus-procellarum')!;
    expect(procellarum.sunDot).toBeLessThan(0.15); // still near/beyond the sunrise line
  });
});