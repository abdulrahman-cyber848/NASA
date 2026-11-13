// Scientific validation of the lunar dust physics engine.
// Analytical reference solutions, conservation checks, unit consistency,
// edge cases and CSV integrity — not visual inspection.
import { describe, it, expect } from 'vitest';
import { G, M_MOON, R_MOON, G_MOON, umToM, mmToM, msToS, fCToC, kVpmToVpm, gravityAtAltitude, sig, mulberry32 } from '../physics/physicsUnits';
import { particleMass, gravityForce, electricForce, forceRatio, netAcceleration, kineticEnergy, momentum, GRAIN_PROFILES } from '../physics/particlePhysics';
import { closedFormPosition, closedFormVelocity, flightTime, maxHeight, horizontalRange, integrateStep, specificEnergy } from '../physics/ballisticMotion';
import { plateField, electricForceVector, fieldFromPotential, edsField } from '../physics/electrostatics';
import { resolveContact, kineticFriction, staticFrictionMax, DEFAULT_CONTACT } from '../physics/collisionModel';
import { terrainHeight, terrainNormal, slopeDeg } from '../physics/terrainInteraction';
import { samplePlumeEjecta, DEFAULT_PLUME } from '../physics/plumeModel';
import { DustEngine, DEFAULT_PARAMS, suitZoneAt } from '../physics/engine';

describe('1 · constants & 2 · mass & 3 · units', () => {
  it('g from G·M/R² matches the 1.62 near-surface approximation', () => {
    expect((G * M_MOON) / (R_MOON * R_MOON)).toBeCloseTo(1.62, 1);
    expect(G_MOON).toBe(1.62);
  });
  it('m = ρπd³/6 for a 70 µm basaltic grain', () => {
    const d = 70e-6, rho = 3100;
    expect(particleMass(d, rho)).toBeCloseTo(rho * Math.PI / 6 * d ** 3, 20);
    expect(particleMass(d, rho)).toBeGreaterThan(5e-10);
    expect(particleMass(d, rho)).toBeLessThan(7e-10);
  });
  it('unit conversions are exact and never mix scales', () => {
    expect(umToM(70)).toBe(70e-6);
    expect(mmToM(2)).toBe(0.002);
    expect(msToS(16.666)).toBeCloseTo(0.016666, 9);
    expect(fCToC(100)).toBe(1e-13);
    expect(kVpmToVpm(60)).toBe(60000);
  });
  it('altitude gravity decreases with height', () => {
    expect(gravityAtAltitude(0)).toBeCloseTo(1.62, 1);
    expect(gravityAtAltitude(100000)).toBeLessThan(gravityAtAltitude(0));
  });
});

describe('4–8 · ballistic analytical references', () => {
  const v0 = { x: 1.5, y: 2, z: -0.5 }, p0 = { x: 0, y: 0, z: 0 };
  it('position & velocity match closed form at t=1s', () => {
    const p = closedFormPosition(p0, v0, 1);
    expect(p.x).toBeCloseTo(1.5, 9);
    expect(p.y).toBeCloseTo(2 - 0.5 * G_MOON, 9);
    const v = closedFormVelocity(v0, 1);
    expect(v.y).toBeCloseTo(2 - G_MOON, 9);
  });
  it('T = 2vz/g, H = vz²/2g, R = vx·T', () => {
    expect(flightTime(2)).toBeCloseTo(4 / G_MOON, 9);
    expect(maxHeight(2)).toBeCloseTo(4 / (2 * G_MOON), 9);
    expect(horizontalRange(1.5, 2)).toBeCloseTo(1.5 * 4 / G_MOON, 9);
  });
  it('fixed-step integrator matches the analytical trajectory within 1e-6 m', () => {
    const s = { p: { ...p0 }, v: { ...v0 } };
    const dt = 1 / 240; const T = 2;
    for (let i = 0; i < Math.round(T / dt); i++) integrateStep(s, dt, -G_MOON);
    const ref = closedFormPosition(p0, v0, T);
    expect(Math.hypot(s.p.x - ref.x, s.p.y - ref.y, s.p.z - ref.z)).toBeLessThan(1e-6);
  });
  it('specific mechanical energy is conserved in free flight', () => {
    const s = { p: { ...p0 }, v: { ...v0 } };
    const e0 = specificEnergy(s);
    for (let i = 0; i < 600; i++) integrateStep(s, 1 / 240, -G_MOON);
    expect(Math.abs(specificEnergy(s) - e0)).toBeLessThan(1e-9);
  });
  it('timestep halving does not change the Verlet result (constant-a exactness)', () => {
    const a = { p: { ...p0 }, v: { ...v0 } }; const b = { p: { ...p0 }, v: { ...v0 } };
    for (let i = 0; i < 240; i++) integrateStep(a, 1 / 120, -G_MOON);
    for (let i = 0; i < 480; i++) integrateStep(b, 1 / 240, -G_MOON);
    expect(Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y, a.p.z - b.p.z)).toBeLessThan(1e-9);
  });
});

describe('9–13 · forces, ratio, energy, momentum', () => {
  it('Fg = mg and Fe = qE with correct signs', () => {
    const m = particleMass(70e-6, 3100);
    expect(gravityForce(m)).toBeCloseTo(m * G_MOON, 20);
    expect(electricForce(1e-13, 6e4)).toBeCloseTo(6e-9, 18);
    expect(electricForce(-1e-13, 6e4)).toBeCloseTo(-6e-9, 18);
  });
  it('Γ = |qE|/mg and safe null on zero mass', () => {
    const m = particleMass(70e-6, 3100);
    expect(forceRatio(1e-13, 6e4, m)).toBeCloseTo(6e-9 / (m * G_MOON), 6);
    expect(forceRatio(1e-13, 6e4, 0)).toBeNull();
    expect(netAcceleration(1, 0)).toBeNull();
  });
  it('KE = ½mv², p = mv', () => {
    expect(kineticEnergy(2e-9, 3)).toBeCloseTo(9e-9, 18);
    expect(momentum(2e-9, 3)).toBeCloseTo(6e-9, 18);
  });
  it('E = −∇V recovers a uniform plate field', () => {
    const E = fieldFromPotential(p => -60000 * p.y, { x: 0, y: 0.1, z: 0 });
    expect(E.y).toBeCloseTo(60000, 3);
    expect(electricForceVector(1e-13, plateField(60000)).y).toBeCloseTo(6e-9, 18);
  });
  it('EDS fringe field decays with height and sweeps horizontally', () => {
    const prm = { amplitude: 40000, wavelength: 0.02, frequency: 8 };
    const low = edsField({ x: 0, y: 0.001, z: 0 }, 0, prm);
    const high = edsField({ x: 0, y: 0.05, z: 0 }, 0, prm);
    expect(Math.abs(high.y)).toBeLessThan(Math.abs(low.y) + 1e-9);
    expect(edsField({ x: 0, y: 0, z: 0 }, 0.03, prm).x).not.toBeCloseTo(low.x, 3);
  });
});

describe('14–16 · friction, restitution, terrain', () => {
  it('kinetic friction F = μk·N; static cap μs·N', () => {
    expect(kineticFriction(0.6, 10)).toBeCloseTo(6, 9);
    expect(staticFrictionMax(0.8, 10)).toBeCloseTo(8, 9);
  });
  it('normal rebound scales by e; e=0 kills normal velocity', () => {
    const n = { x: 0, y: 1, z: 0 };
    const r1 = resolveContact({ x: 1, y: -2, z: 0 }, n, { ...DEFAULT_CONTACT, restitution: 0.5, muKinetic: 0 });
    expect(r1.v.y).toBeCloseTo(1, 9);
    const r0 = resolveContact({ x: 0, y: -2, z: 0 }, n, { ...DEFAULT_CONTACT, restitution: 0 });
    expect(r0.v.y).toBeCloseTo(0, 9);
    expect(r0.settled).toBe(true);
  });
  it('friction reduces tangential speed and dissipates energy', () => {
    const n = { x: 0, y: 1, z: 0 };
    const r = resolveContact({ x: 3, y: -2, z: 0 }, n, { ...DEFAULT_CONTACT, restitution: 0.4, muKinetic: 0.6 });
    expect(Math.abs(r.v.x)).toBeLessThan(3);
    expect(r.energyLost).toBeGreaterThan(0);
  });
  it('terrain normal is unit-length and flat-ish on open ground', () => {
    const n = terrainNormal(20, 20);
    expect(Math.hypot(n.x, n.y, n.z)).toBeCloseTo(1, 6);
    expect(slopeDeg(20, 20)).toBeLessThan(35);
  });
  it('crater bowl is lower than its rim', () => {
    expect(terrainHeight(-7, -6)).toBeLessThan(terrainHeight(-7 + 3.2 * 1.15, -6));
  });
});

describe('17–20 · engine stability, edge cases, extremes, CSV', () => {
  it('fixed-step engine is deterministic for a seed', () => {
    const a = new DustEngine({ ...DEFAULT_PARAMS, maxParticles: 600 });
    const b = new DustEngine({ ...DEFAULT_PARAMS, maxParticles: 600 });
    for (let i = 0; i < 120; i++) { a.step(1 / 120); b.step(1 / 120); }
    expect(a.csv()).toBe(b.csv());
    expect(a.time).toBeCloseTo(1, 6);
  });
  it('advance() runs whole fixed steps only (render-rate independent)', () => {
    const e = new DustEngine({ ...DEFAULT_PARAMS, maxParticles: 300, dtMs: 1000 / 120 });
    for (let i = 0; i < 60; i++) e.advance(1 / 120); // 120 fps render
    expect(e.steps).toBe(60);
    const e2 = new DustEngine({ ...DEFAULT_PARAMS, maxParticles: 300, dtMs: 1000 / 120 });
    for (let i = 0; i < 30; i++) e2.advance(1 / 60); // 60 fps render
    expect(e2.steps).toBe(60);
    expect(e.csv()).toBe(e2.csv()); // identical physics at different render rates
  });
  it('a huge frame delta never spirals (backlog is dropped, capped at 10 steps)', () => {
    const e = new DustEngine({ ...DEFAULT_PARAMS, maxParticles: 100 });
    e.advance(5); // e.g. returning from a hidden tab
    expect(e.steps).toBeLessThanOrEqual(10);
  });
  it('particles collide and settle on the terrain', () => {
    const e = new DustEngine({ ...DEFAULT_PARAMS, maxParticles: 800, launchSpeed: 1.2 });
    for (let i = 0; i < 1200; i++) e.step(1 / 120);
    const c = e.counts();
    expect(c.settled).toBeGreaterThan(0);
    expect(e.telemetry().collisions + c.settled).toBeGreaterThan(0);
  });
  it('zero charge & zero field ⇒ ratio 0, no electric force', () => {
    const e = new DustEngine({ ...DEFAULT_PARAMS, chargeFc: 0, fieldKVpm: 0, maxParticles: 100 });
    const t = e.telemetry();
    expect(t.fe).toBe(0);
    expect(t.ratio).toBe(0);
  });
  it('extreme but valid ranges stay finite', () => {
    const e = new DustEngine({ ...DEFAULT_PARAMS, diameterUm: 1000, density: 3100, chargeFc: 1000, fieldKVpm: 100, launchSpeed: 20, maxParticles: 200 });
    for (let i = 0; i < 240; i++) e.step(1 / 120);
    const t = e.telemetry();
    expect(Number.isFinite(t.ke)).toBe(true);
    expect(Number.isFinite(t.m)).toBe(true);
    expect(t.m).toBeGreaterThan(0);
  });
  it('invalid (zero/negative) diameter yields zero mass, not NaN', () => {
    expect(particleMass(0, 3100)).toBe(0);
    expect(particleMass(-5, 3100)).toBe(0);
    expect(particleMass(70e-6, 0)).toBe(0);
  });
  it('CSV has a header, SI columns and consistent numeric rows', () => {
    const e = new DustEngine({ ...DEFAULT_PARAMS, maxParticles: 400 });
    for (let i = 0; i < 240; i++) e.step(1 / 120);
    const lines = e.csv().split('\n');
    expect(lines[0]).toBe('t_s,x_m,y_m,z_m,vx_mps,vy_mps,vz_mps,speed_mps,ke_J,collisions,state');
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines.slice(1, 12)) {
      const cells = l.split(',');
      expect(cells.length).toBe(11);
      cells.forEach(c => expect(Number.isFinite(Number(c))).toBe(true));
    }
  });
  it('plume sampler stays inside its configured cone and speed bound', () => {
    const rnd = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const s = samplePlumeEjecta(0, 0, DEFAULT_PLUME, rnd);
      const speed = Math.hypot(s.vx, s.vy, s.vz);
      expect(speed).toBeLessThanOrEqual(DEFAULT_PLUME.ejectaSpeedMax + 1e-9);
      const el = Math.atan2(s.vy, Math.hypot(s.vx, s.vz)) * 180 / Math.PI;
      expect(el).toBeLessThanOrEqual(DEFAULT_PLUME.ejectaAngleDeg + 1e-6);
    }
  });
  it('suit zone proxy maps a visor hit correctly', () => {
    expect(suitZoneAt({ x: 0, y: 1.62, z: 0.12 })).toBe('visor');
    expect(suitZoneAt({ x: 5, y: 5, z: 5 })).toBeNull();
  });
  it('grain profiles are distinct reference points, not one universal soil', () => {
    expect(new Set(GRAIN_PROFILES.map(g => g.diameter)).size).toBe(3);
    expect(sig(1.23456e-9)).toContain('e-9');
  });
});