import { describe, it, expect } from 'vitest';
import {
  LUNAR_G, ballisticStep, apexHeight, flightTime, electrostaticForce,
  grainMass, grainVerticalAccel, thermalBalance, dustCoverage, launchVelocity,
} from '../dustPhysics';

describe('vacuum ballistics (no drag, lunar g)', () => {
  it('apex and flight time match closed-form for vy = 2 m/s', () => {
    expect(apexHeight(2)).toBeCloseTo(4 / (2 * LUNAR_G), 6);
    expect(flightTime(2)).toBeCloseTo(4 / LUNAR_G, 6);
  });
  it('Verlet integration is exact for constant acceleration', () => {
    const p = { x: 0, y: 0, z: 0 };
    const v = { x: 1.5, y: 3, z: -0.5 };
    const dt = 1 / 120;
    const T = 2;
    const steps = Math.round(T / dt);
    for (let i = 0; i < steps; i++) ballisticStep(p, v, dt);
    expect(p.x).toBeCloseTo(1.5 * T, 6);           // horizontal velocity never decays
    expect(p.z).toBeCloseTo(-0.5 * T, 6);
    expect(p.y).toBeCloseTo(3 * T - 0.5 * LUNAR_G * T * T, 5);
    expect(v.y).toBeCloseTo(3 - LUNAR_G * T, 6);
  });
  it('launch cone respects elevation', () => {
    const v = launchVelocity(5, 90, 0);
    expect(v.y).toBeCloseTo(5, 6);
    expect(Math.hypot(v.x, v.z)).toBeLessThan(1e-9);
  });
});

describe('electrostatics F = qE', () => {
  it('force scales linearly and flips with charge sign', () => {
    expect(electrostaticForce(5e-15, 1e4)).toBeCloseTo(5e-11, 18);
    expect(electrostaticForce(-5e-15, 1e4)).toBeCloseTo(-5e-11, 18);
  });
  it('a strongly charged 10 µm grain can overcome lunar gravity', () => {
    const r = 10e-6;
    const m = grainMass(r);
    expect(m).toBeGreaterThan(1e-12);
    expect(m).toBeLessThan(2e-11);
    const aWeak = grainVerticalAccel(1e-16, 1e3, r);
    const aStrong = grainVerticalAccel(5e-14, 1e5, r);
    expect(aWeak).toBeLessThan(0);    // settles
    expect(aStrong).toBeGreaterThan(0); // lifts
  });
});

describe('simplified thermal balance', () => {
  it('shade + cold radiator ⇒ net cooling; full sun + dust ⇒ net heating trend', () => {
    const shade = thermalBalance({ metabolicW: 300, sunlitFraction: 0, absorptivity: 0.3, radiatorTempK: 300, dustCoverage: 0 });
    expect(shade.netW).toBeLessThan(0);
    const hot = thermalBalance({ metabolicW: 400, sunlitFraction: 1, absorptivity: 0.6, radiatorTempK: 290, dustCoverage: 0.8 });
    expect(hot.netW).toBeGreaterThan(shade.netW);
    expect(hot.solarW).toBeCloseTo(1361 * 0.8 * 0.6, 6);
  });
  it('dust coverage monotonically reduces heat rejection', () => {
    const a = thermalBalance({ metabolicW: 300, sunlitFraction: 0.5, absorptivity: 0.4, radiatorTempK: 300, dustCoverage: 0 });
    const b = thermalBalance({ metabolicW: 300, sunlitFraction: 0.5, absorptivity: 0.4, radiatorTempK: 300, dustCoverage: 0.9 });
    expect(b.radiatedW).toBeLessThan(a.radiatedW);
    expect(b.netW).toBeGreaterThan(a.netW);
  });
});

describe('qualitative adhesion model', () => {
  it('coverage saturates, rises with affinity and charge', () => {
    const lo = dustCoverage(20, 0.5, 0.2);
    const hi = dustCoverage(20, 0.9, 0.9);
    expect(hi).toBeGreaterThan(lo);
    expect(dustCoverage(1e6, 0.9, 1)).toBeLessThanOrEqual(1);
    expect(dustCoverage(0, 0.9, 1)).toBe(0);
  });
});