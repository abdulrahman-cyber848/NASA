// SI units everywhere internally. Conversion helpers are the ONLY place where
// display units (µm, mm, ms, fC, kV/m…) are translated to SI.
export type Meters = number;
export type Seconds = number;
export type Kilograms = number;
export type Coulombs = number;
export type VoltsPerMeter = number;
export type Newtons = number;
export type Joules = number;

/** CODATA 2018 gravitational constant (m³·kg⁻¹·s⁻²). */
export const G = 6.6743e-11;
/** NASA Moon Fact Sheet — mass and mean radius. */
export const M_MOON = 7.346e22;      // kg
export const R_MOON = 1.7374e6;      // m
/** Near-surface approximation used by the simulator (NASA Moon Fact Sheet). */
export const G_MOON = 1.62;          // m/s²

export const umToM = (um: number): Meters => um * 1e-6;
export const mmToM = (mm: number): Meters => mm * 1e-3;
export const mToUm = (m: number): number => m * 1e6;
export const msToS = (ms: number): Seconds => ms * 1e-3;
export const sToMs = (s: number): number => s * 1e3;
export const fCToC = (fc: number): Coulombs => fc * 1e-15;
export const nCToC = (nc: number): Coulombs => nc * 1e-9;
export const kVpmToVpm = (kv: number): VoltsPerMeter => kv * 1e3;
export const cToF = (fc: number): number => fc; // display passthrough (fC)

/** Altitude-dependent gravity g(r) = G·M / r². h in meters above mean surface. */
export function gravityAtAltitude(h: Meters): number {
  const r = R_MOON + Math.max(0, h);
  return (G * M_MOON) / (r * r);
}

/** Consistent significant-figure formatting for the data panel. */
export function sig(v: number, figures = 4): string {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) return v.toExponential(Math.max(0, figures - 1));
  return Number(v.toPrecision(figures)).toString();
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Deterministic PRNG (mulberry32) so simulations are reproducible per seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}