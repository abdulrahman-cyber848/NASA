// Particle-level physics. Irregular lunar grains are approximated by an
// equivalent sphere for mass/force calculations — a stated simplification.
import { G_MOON, gravityAtAltitude, type Kilograms, type Meters, type Coulombs, type VoltsPerMeter, type Joules } from './physicsUnits';

export interface GrainProfile {
  id: string;
  label: { en: string; ar: string };
  /** equivalent spherical diameter, meters (illustrative fraction of the documented range) */
  diameter: Meters;
  /** grain material density kg/m³ (mineral grains, NOT bulk regolith) */
  density: number;
  source: { en: string; ar: string };
}

/** Documented context: lunar regolith grains span tens of µm to ~mm; mineral
 *  grain density ≈ 3.1 g/cm³ (basaltic), glass/agglutinates lower. These three
 *  profiles are selectable reference points, not a universal distribution. */
export const GRAIN_PROFILES: GrainProfile[] = [
  {
    id: 'fines', diameter: 20e-6, density: 3100,
    label: { en: 'Fine fraction (20 µm)', ar: 'جزء ناعم (20 ميكرومتر)' },
    source: { en: 'Illustrative fine fraction; mineral-grain density ~3100 kg/m³ (Lunar Sourcebook / NASA regolith brief)', ar: 'جزء ناعم توضيحي؛ كثافة الحبيبات المعدنية ~3100 كغ/م³ (كتيب ناسا عن الريغوليث)' },
  },
  {
    id: 'typical', diameter: 70e-6, density: 3100,
    label: { en: 'Typical mature soil (70 µm)', ar: 'تربة ناضجة نموذجية (70 ميكرومتر)' },
    source: { en: 'Median grain size of mature soils ~70 µm (Lunar Sourcebook); density as above', ar: 'الوسيط الحجمي للترب الناضجة ~70 ميكرومتر؛ الكثافة كما سبق' },
  },
  {
    id: 'coarse', diameter: 200e-6, density: 2900,
    label: { en: 'Coarse / glassy (200 µm)', ar: 'خشن / زجاجي (200 ميكرومتر)' },
    source: { en: 'Illustrative coarse fraction; glass/agglutinate density lower (~2900 kg/m³)', ar: 'جزء خشن توضيحي؛ كثافة الزجاج/المتكتلات أقل (~2900 كغ/م³)' },
  },
];

/** m = ρ · (π/6) · d³  (equivalent sphere). */
export function particleMass(diameter: Meters, density: number): Kilograms {
  if (diameter <= 0 || density <= 0) return 0;
  return density * (Math.PI / 6) * diameter ** 3;
}

/** F_g = m·g (near-surface) or m·g(h) in advanced altitude mode. */
export function gravityForce(mass: Kilograms, altitude = 0, useAltitude = false): number {
  return mass * (useAltitude ? gravityAtAltitude(altitude) : G_MOON);
}

/** F_e = q·E (signed; direction handled by caller's field vector). */
export function electricForce(q: Coulombs, E: VoltsPerMeter): number {
  return q * E;
}

/** Γ = |qE| / (m·g). Returns null when the denominator is zero (safe). */
export function forceRatio(q: Coulombs, E: VoltsPerMeter, mass: Kilograms, g = G_MOON): number | null {
  const denom = mass * g;
  if (denom <= 0 || !Number.isFinite(denom)) return null;
  return Math.abs(q * E) / denom;
}

/** a = F_net / m  (Newton's second law). Zero mass ⇒ null (no invented value). */
export function netAcceleration(fNet: number, mass: Kilograms): number | null {
  if (mass <= 0 || !Number.isFinite(mass)) return null;
  return fNet / mass;
}

export const kineticEnergy = (m: Kilograms, speed: number): Joules => 0.5 * m * speed * speed;
export const momentum = (m: Kilograms, speed: number) => m * speed;

export interface Vec3 { x: number; y: number; z: number }
export const vlen = (v: Vec3) => Math.hypot(v.x, v.y, v.z);