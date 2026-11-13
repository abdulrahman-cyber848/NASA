import { describe, it, expect } from 'vitest';
import { getMoonSnapshot, surfaceVector, dot, type MoonSnapshot } from '../astro';
import { evaluateLandmarks, filterLandmarks } from '../visibility';
import { getMonthEvents } from '../events';

describe('geometry helpers', () => {
  it('selenographic unit vectors', () => {
    expect(surfaceVector(0, 0)).toEqual([1, 0, 0]);
    const east = surfaceVector(0, 90);
    expect(Math.abs(east[1] - 1)).toBeLessThan(1e-12);
    const pole = surfaceVector(90, 0);
    expect(Math.abs(pole[2] - 1)).toBeLessThan(1e-12);
  });
  it('libration exposes terrain beyond the mean limb', () => {
    // a point at 95°E is on the far side for a mean Earth direction…
    expect(dot(surfaceVector(0, 95), surfaceVector(0, 0))).toBeLessThan(0);
    // …but becomes Earth-facing with +8° libration in longitude
    expect(dot(surfaceVector(0, 95), surfaceVector(0, 8))).toBeGreaterThan(0);
  });
});

describe('two-condition visibility', () => {
  const base = getMoonSnapshot(new Date('2024-01-25T18:00:00Z'));
  it('sunlit but far-side ⇒ not visible (illumination alone is insufficient)', () => {
    const snap: MoonSnapshot = { ...base, sunBody: [-1, 0, 0], earthBody: [1, 0, 0] };
    const ev = evaluateLandmarks(snap, 'telescope');
    expect(ev.every(e => !e.geoVisible)).toBe(true);
  });
  it('Earth-facing but unlit ⇒ not visible', () => {
    const snap: MoonSnapshot = { ...base, sunBody: [-1, 0, 0], earthBody: [1, 0, 0] };
    const ev = evaluateLandmarks(snap, 'telescope');
    expect(ev.find(e => e.landmark.id === 'copernicus')!.earthDot).toBeGreaterThan(0.9);
    expect(ev.find(e => e.landmark.id === 'copernicus')!.geoVisible).toBe(false);
  });
  it('equipment filters recommendations, not geometric visibility', () => {
    const eye = evaluateLandmarks(base, 'eye');
    const scope = evaluateLandmarks(base, 'telescope');
    const tychoEye = eye.find(e => e.landmark.id === 'tycho')!;
    const tychoScope = scope.find(e => e.landmark.id === 'tycho')!;
    expect(tychoEye.geoVisible).toBe(tychoScope.geoVisible); // geometry identical
    expect(tychoEye.resolvable).toBe(false); // 85 km crater is below naked-eye resolution
    expect(tychoScope.resolvable).toBe(true);
    expect(filterLandmarks(eye, 'eye', 'all').every(e => e.landmark.minEquipment === 'eye')).toBe(true);
  });
  it('recommended returns at most 3, all geometrically visible', () => {
    const ev = evaluateLandmarks(base, 'telescope');
    const rec = filterLandmarks(ev, 'telescope', 'recommended');
    expect(rec.length).toBeLessThanOrEqual(3);
    expect(rec.every(e => e.geoVisible && e.practicableNow)).toBe(true);
  });
});

describe('calendar events (live searches)', () => {
  it('March 2024: penumbral lunar eclipse on the 25th', () => {
    const evs = getMonthEvents(2024, 2, 'UTC');
    const le = evs.find(e => e.kind === 'lunar-eclipse');
    expect(le).toBeTruthy();
    expect(le!.eclipseKind).toBe('penumbral');
    expect(le!.time.toISOString().slice(0, 10)).toBe('2024-03-25');
  });
  it('April 2024: total solar eclipse on the 8th, total from Dallas', () => {
    const evs = getMonthEvents(2024, 3, 'UTC', { lat: 32.7767, lon: -96.797 });
    const se = evs.find(e => e.kind === 'solar-global');
    expect(se).toBeTruthy();
    expect(se!.eclipseKind).toBe('total');
    expect(se!.time.toISOString().slice(0, 10)).toBe('2024-04-08');
    expect(se!.local?.visible).toBe(true);
    expect(se!.local?.kind).toBe('total');
  });
  it('September 2024: supermoon full moon (distance ≤ 360,000 km) per LunaNav rule', () => {
    const evs = getMonthEvents(2024, 8, 'UTC');
    const full = evs.find(e => e.kind === 'full');
    expect(full).toBeTruthy();
    expect(full!.distKm!).toBeLessThan(360000);
    expect(full!.supermoon).toBe(true);
    const feb = getMonthEvents(2024, 1, 'UTC').find(e => e.kind === 'full');
    expect(feb!.supermoon).toBe(false); // 2024-02-24 was the smallest full moon (micromoon)
  });
});