// Vacuum ballistic motion. Closed-form solutions are valid ONLY for constant
// g, flat launch/landing height and no other forces; the integrator handles
// terrain, fields and contacts. Gas drag is neglected (lunar exosphere).
import { G_MOON, gravityAtAltitude } from './physicsUnits';
import type { Vec3 } from './particlePhysics';

export interface BallisticState { p: Vec3; v: Vec3 }

/** r(t) = r₀ + v₀t + ½gt² with g = (0,−g,0). */
export function closedFormPosition(p0: Vec3, v0: Vec3, t: number, g = G_MOON): Vec3 {
  return { x: p0.x + v0.x * t, y: p0.y + v0.y * t - 0.5 * g * t * t, z: p0.z + v0.z * t };
}
export function closedFormVelocity(v0: Vec3, t: number, g = G_MOON): Vec3 {
  return { x: v0.x, y: v0.y - g * t, z: v0.z };
}
/** Same-height flight time T = 2·v₀z / g (0 if v₀z ≤ 0). */
export const flightTime = (vz: number, g = G_MOON): number => (vz > 0 && g > 0 ? (2 * vz) / g : 0);
/** H = v₀z² / (2g). */
export const maxHeight = (vz: number, g = G_MOON): number => (g > 0 ? (vz * vz) / (2 * g) : 0);
/** R = v₀x · T for the horizontal component given. */
export const horizontalRange = (vx: number, vz: number, g = G_MOON): number => vx * flightTime(vz, g);

/** Exact constant-acceleration (velocity-Verlet) step — used by the fixed-step
 *  engine when only gravity acts; with extra forces pass the total ay. */
export function integrateStep(s: BallisticState, dt: number, ay: number): void {
  s.p.x += s.v.x * dt;
  s.p.y += s.v.y * dt + 0.5 * ay * dt * dt;
  s.p.z += s.v.z * dt;
  s.v.y += ay * dt;
}

/** Local gravitational acceleration for advanced altitude mode. */
export const localG = (altitude: number, useAltitude: boolean) => (useAltitude ? gravityAtAltitude(altitude) : G_MOON);

/** Mechanical energy per unit mass (KE + PE) — conserved in free flight; used
 *  by the test-suite as a conservation check on the integrator. */
export const specificEnergy = (s: BallisticState, g = G_MOON) => 0.5 * (s.v.x ** 2 + s.v.y ** 2 + s.v.z ** 2) + g * s.p.y;