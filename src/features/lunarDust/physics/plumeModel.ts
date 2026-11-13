// Plume–surface interaction is a multiphase, partly rarefied-flow problem.
// This module is a REDUCED-ORDER ILLUSTRATIVE ejecta sampler with configurable
// velocity/angle distributions — explicitly NOT validated CFD or flight
// prediction software (see NASA PSI test program reference in the UI).
import { mulberry32 } from './physicsUnits';

export interface PlumeParams {
  throttle: number;        // 0..1 (illustrative)
  ejectaSpeedMax: number;  // m/s, user-configurable upper bound
  ejectaAngleDeg: number;  // shallow ejection cone half-angle (deg)
  sourceRadius: number;    // m, scour radius (illustrative)
}

export const DEFAULT_PLUME: PlumeParams = {
  throttle: 0.6, ejectaSpeedMax: 12, ejectaAngleDeg: 12, sourceRadius: 0.8,
};

export interface EjectaSample { x: number; z: number; vx: number; vy: number; vz: number }

/** Sample one ejecta grain: shallow, fast, radial — the documented qualitative
 *  character of lunar landing ejecta (no atmosphere → no suspended cloud). */
export function samplePlumeEjecta(cx: number, cz: number, prm: PlumeParams, rnd: () => number): EjectaSample {
  const a = rnd() * Math.PI * 2;
  const r = prm.sourceRadius * (0.4 + rnd() * 0.6);
  const speed = prm.ejectaSpeedMax * prm.throttle * (0.35 + rnd() * 0.65);
  const el = ((prm.ejectaAngleDeg * (0.3 + rnd() * 0.7)) * Math.PI) / 180;
  const h = speed * Math.cos(el);
  return {
    x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r,
    vx: h * Math.cos(a), vy: speed * Math.sin(el), vz: h * Math.sin(a),
  };
}

/** Deterministic batch for a fixed step (count scales with throttle). */
export function plumeBatch(cx: number, cz: number, prm: PlumeParams, count: number, seed: number): EjectaSample[] {
  const rnd = mulberry32(seed);
  const out: EjectaSample[] = [];
  for (let i = 0; i < count; i++) out.push(samplePlumeEjecta(cx, cz, prm, rnd));
  return out;
}