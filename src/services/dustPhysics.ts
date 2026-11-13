// LunaNav Lunar Environment Lab — simplified, unit-tested physics.
// Educational visualization only: NOT a validated engineering prediction.
// Vacuum ballistics: no aerodynamic drag, no wind, constant lunar gravity.

export const LUNAR_G = 1.62;            // m/s² (mean lunar surface gravity)
export const REGOLITH_GRAIN_DENSITY = 3100; // kg/m³, typical basaltic grain density
export const STEFAN_BOLTZMANN = 5.670374419e-8; // W·m⁻²·K⁻⁴
export const SOLAR_CONSTANT = 1361;     // W/m² at 1 AU (real, documented)

export type V3 = { x: number; y: number; z: number };

/** Exact constant-acceleration step (velocity Verlet) — no drag term exists in vacuum. */
export function ballisticStep(p: V3, v: V3, dt: number, ay = -LUNAR_G): void {
  p.x += v.x * dt;
  p.y += v.y * dt + 0.5 * ay * dt * dt;
  p.z += v.z * dt;
  v.y += ay * dt;
}

export const apexHeight = (vy: number) => (vy * vy) / (2 * LUNAR_G);
export const flightTime = (vy: number) => (2 * vy) / LUNAR_G;

/** Launch velocity inside an elevation cone — used by every dust source. */
export function launchVelocity(
  speed: number, elevDeg: number, azimuthDeg: number,
): V3 {
  const el = (elevDeg * Math.PI) / 180, az = (azimuthDeg * Math.PI) / 180;
  const h = speed * Math.cos(el);
  return { x: h * Math.cos(az), y: speed * Math.sin(el), z: h * Math.sin(az) };
}

/** F = qE (newtons). q in coulombs, E in V/m. */
export const electrostaticForce = (qC: number, eVpm: number) => qC * eVpm;

export const grainMass = (radiusM: number, density = REGOLITH_GRAIN_DENSITY) =>
  (4 / 3) * Math.PI * radiusM ** 3 * density;

/** Net vertical acceleration of a charged grain above a charged surface. */
export const grainVerticalAccel = (qC: number, eVpm: number, radiusM: number) =>
  electrostaticForce(qC, eVpm) / grainMass(radiusM) - LUNAR_G;

export interface ThermalInput {
  metabolicW: number;      // human metabolic heat, ~100–500 W real range
  sunlitFraction: number;  // 0..1 of body in direct sun
  absorptivity: number;    // 0..1 effective solar absorptivity (dust raises it)
  radiatorTempK: number;   // effective radiating temperature
  dustCoverage: number;    // 0..1 fraction of radiator obscured by dust
  areaM2?: number;         // assumed radiating area (default 1.8 m²)
  emissivity?: number;     // assumed IR emissivity (default 0.9)
  liquidCoolingW?: number; // heat actively removed by the LCVG loop (conceptual)
}

/** Simplified steady energy balance. Assumptions are listed in the UI:
 *  projected sun area 0.8 m², radiating area 1.8 m², ε 0.9, no convection
 *  (vacuum), dust reduces effective radiating area by up to 60%. */
export function thermalBalance(i: ThermalInput) {
  const area = i.areaM2 ?? 1.8;
  const eps = i.emissivity ?? 0.9;
  const solar = SOLAR_CONSTANT * 0.8 * i.sunlitFraction * i.absorptivity;
  const effectiveArea = area * (1 - 0.6 * i.dustCoverage);
  const radiated = eps * STEFAN_BOLTZMANN * effectiveArea * i.radiatorTempK ** 4;
  const cooling = i.liquidCoolingW ?? 0;
  const net = i.metabolicW + solar - radiated - cooling;
  return { solarW: solar, radiatedW: radiated, coolingW: cooling, netW: net };
}

/** Qualitative adhesion affinity per surface (0..1). Educational ranking,
 *  not measured deposition rates — smooth charged optics and woven fabrics
 *  are consistently reported as problematic in Apollo-era accounts. */
export const ADHESION_SURFACES = [
  { id: 'visor', affinity: 0.9 },
  { id: 'suit', affinity: 0.85 },
  { id: 'camera', affinity: 0.8 },
  { id: 'solar', affinity: 0.7 },
  { id: 'radiator', affinity: 0.55 },
  { id: 'connector', affinity: 0.5 },
] as const;
export type AdhesionSurfaceId = typeof ADHESION_SURFACES[number]['id'];

/** Saturating qualitative coverage curve. chargeFactor 0..1 scales rate. */
export function dustCoverage(elapsedS: number, affinity: number, chargeFactor: number): number {
  const rate = 0.05 * affinity * (0.35 + 0.65 * chargeFactor);
  return Math.min(1, 1 - Math.exp(-rate * elapsedS));
}