// Timezone conversions + rise/set behavior, tested independently of the UI.
import { describe, it, expect } from 'vitest';
import * as A from 'astronomy-engine';
import { tzOffsetMinutes, zonedDayStartUTC, dateStrInTZ, fromLocalInput, toLocalInput } from '../time';
import { getRiseSet, getHorizontal } from '../astro';

describe('IANA timezone conversion', () => {
  it('fixed offsets', () => {
    expect(tzOffsetMinutes(new Date('2024-01-15T12:00:00Z'), 'Asia/Tokyo')).toBe(540);
    expect(tzOffsetMinutes(new Date('2024-01-15T12:00:00Z'), 'Africa/Cairo')).toBe(120);
    expect(tzOffsetMinutes(new Date('2024-01-15T12:00:00Z'), 'America/New_York')).toBe(-300);
  });
  it('DST transitions', () => {
    expect(tzOffsetMinutes(new Date('2024-07-15T12:00:00Z'), 'Europe/London')).toBe(60);
    expect(tzOffsetMinutes(new Date('2024-07-15T12:00:00Z'), 'America/New_York')).toBe(-240);
    // Cairo reintroduced DST in 2023 (last Friday of April)
    expect(tzOffsetMinutes(new Date('2024-07-15T12:00:00Z'), 'Africa/Cairo')).toBe(180);
  });
  it('local day start in UTC', () => {
    expect(zonedDayStartUTC('2024-01-15', 'Africa/Cairo').toISOString()).toBe('2024-01-14T22:00:00.000Z');
    expect(zonedDayStartUTC('2024-01-15', 'America/New_York').toISOString()).toBe('2024-01-15T05:00:00.000Z');
    expect(zonedDayStartUTC('2024-07-15', 'Europe/London').toISOString()).toBe('2024-07-14T23:00:00.000Z');
  });
  it('dates near midnight cross the day boundary correctly', () => {
    const d = new Date('2024-01-11T23:30:00Z');
    expect(dateStrInTZ(d, 'Asia/Tokyo')).toBe('2024-01-12');
    expect(dateStrInTZ(d, 'America/New_York')).toBe('2024-01-11');
    expect(dateStrInTZ(new Date('2024-01-12T00:15:00Z'), 'UTC')).toBe('2024-01-12');
  });
  it('datetime-local roundtrip in a non-UTC zone', () => {
    const parsed = fromLocalInput('2024-01-15T00:30', 'Asia/Tokyo')!;
    expect(parsed.toISOString()).toBe('2024-01-14T15:30:00.000Z');
    expect(toLocalInput(parsed, 'Asia/Tokyo')).toBe('2024-01-15T00:30');
  });
});

describe('moonrise / moonset', () => {
  it('London 2024-01-25: both events exist inside the local day, altitude ≈ horizon at rise', () => {
    const loc = { lat: 51.5074, lon: -0.1278 };
    const start = zonedDayStartUTC('2024-01-25', 'Europe/London');
    const { rise, set } = getRiseSet(start, loc);
    expect(rise).not.toBeNull();
    expect(set).not.toBeNull();
    for (const ev of [rise!, set!]) {
      expect(ev.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(ev.getTime()).toBeLessThan(start.getTime() + 86400000);
      expect(dateStrInTZ(ev, 'Europe/London')).toBe('2024-01-25');
    }
    const h = getHorizontal(rise!, loc);
    expect(Math.abs(h.altitude)).toBeLessThan(2);
  });
  it('polar day: at 89.5°N on 2024-12-15 the Moon neither rises nor sets (and is up all day)', () => {
    const loc = { lat: 89.5, lon: 0 };
    // precondition: Moon declination strongly north that day
    const obs = new A.Observer(0, 0, 0);
    const eq = A.Equator(A.Body.Moon, new Date('2024-12-15T12:00:00Z'), obs, true, true);
    expect(eq.dec).toBeGreaterThan(5);
    const start = zonedDayStartUTC('2024-12-15', 'UTC');
    const { rise, set } = getRiseSet(start, loc);
    expect(rise).toBeNull();
    expect(set).toBeNull();
    expect(getHorizontal(new Date('2024-12-15T12:00:00Z'), loc).altitude).toBeGreaterThan(0);
  });
  it('selected location changes rise time (Cairo vs New York, same UTC day)', () => {
    const start = new Date('2024-06-10T00:00:00Z');
    const cairo = getRiseSet(start, { lat: 30.0444, lon: 31.2357 });
    const ny = getRiseSet(start, { lat: 40.7128, lon: -74.006 });
    expect(cairo.rise).not.toBeNull();
    expect(ny.rise).not.toBeNull();
    expect(Math.abs(cairo.rise!.getTime() - ny.rise!.getTime())).toBeGreaterThan(3600000);
  });
});