// Vector-based landmark visibility.
// Geometric visibility requires BOTH: Sun above the local horizon (n·sun > 0)
// AND the site facing Earth (n·earth > 0, libration included via the body frame).
// Practical observing recommendations are a documented LunaNav heuristic —
// they do not reproduce any NASA selection algorithm.
import { EQUIPMENT_ORDER, type Equipment } from '@/data/landmarks';
import { ALL_SITES, EQUIPMENT_RANK, type MoonSite } from '@/data/sites';
import { dot, surfaceVector, type MoonSnapshot } from './astro';

const RAD2DEG = 180 / Math.PI;
/** Approximate resolving thresholds (arcseconds) used by the heuristic. */
export const RESOLUTION_ARCSEC: Record<Equipment, number> = { eye: 120, binoculars: 12, telescope: 2 };

export type PracticalNote = 'great-shadows' | 'low-contrast-high-sun' | 'near-limb' | 'below-resolution' | 'in-shadow' | 'far-side';

export interface EvaluatedLandmark {
  landmark: MoonSite;
  sunDot: number;
  earthDot: number;
  sunElevationDeg: number;
  terminatorDistanceDeg: number;
  angularSizeArcsec: number;
  /** Geometric: sunlit AND Earth-facing (libration-aware). */
  geoVisible: boolean;
  nearTerminator: boolean;
  nearLimb: boolean;
  resolvable: boolean;
  practicableNow: boolean;
  note: PracticalNote;
  score: number;
}

export function evaluateSites(
  snap: MoonSnapshot,
  sites: MoonSite[] = ALL_SITES,
  resolution: Record<Equipment, number> = RESOLUTION_ARCSEC,
  equipmentArg: Equipment = 'telescope',
): EvaluatedLandmark[] {
  return sites.map(lm => evaluateOne(lm, snap, equipmentArg, resolution));
}

function evaluateOne(lm: MoonSite, snap: MoonSnapshot, equipment: Equipment, resolution: Record<Equipment, number>): EvaluatedLandmark {
    const n = surfaceVector(lm.lat, lm.lon);
    const sunDot = dot(n, snap.sunBody);
    const earthDot = dot(n, snap.earthBody);
    const sunElevationDeg = Math.asin(Math.max(-1, Math.min(1, sunDot))) * RAD2DEG;
    const geoVisible = sunDot > 0.004 && earthDot > 0.01;
    const nearLimb = earthDot < 0.3;
    const angularSizeArcsec = (lm.diameterKm / snap.distanceKm) * 206264.8;
    const resolvable = angularSizeArcsec >= resolution[equipment];
    const nearTerminator = sunElevationDeg > 0 && sunElevationDeg < 20;

    // Heuristic score: shadow contrast (craters peak at ~10° solar elevation;
    // maria are albedo features and read best with more light), foreshortening,
    // and angular size relative to the equipment's resolving power.
    const shadow = lm.type === 'mare' || lm.type === 'basin'
      ? 0.5 + 0.5 * Math.min(1, Math.max(0, sunElevationDeg) / 35)
      : Math.exp(-Math.pow((sunElevationDeg - 10) / 14, 2));
    const sizeScore = Math.pow(Math.min(1, angularSizeArcsec / (resolution[equipment] * 1.5)), 0.5);
    const score = shadow * Math.pow(Math.max(0, earthDot), 0.7) * sizeScore * (lm.type === 'mare' ? 1.05 : 1);

    let note: PracticalNote;
    if (earthDot <= 0.01) note = 'far-side';
    else if (sunDot <= 0.004) note = 'in-shadow';
    else if (!resolvable) note = 'below-resolution';
    else if (nearLimb) note = 'near-limb';
    else if (lm.type !== 'mare' && sunElevationDeg > 35) note = 'low-contrast-high-sun';
    else note = 'great-shadows';

    const practicableNow = geoVisible && resolvable && sunElevationDeg > 1.5;
    return { landmark: lm, sunDot, earthDot, sunElevationDeg, terminatorDistanceDeg: Math.abs(sunElevationDeg), angularSizeArcsec, geoVisible, nearTerminator, nearLimb, resolvable, practicableNow, note, score };
}

export function evaluateLandmarks(snap: MoonSnapshot, equipment: Equipment): EvaluatedLandmark[] {
  return evaluateSites(snap, ALL_SITES, RESOLUTION_ARCSEC, equipment);
}

export type SitesMode = 'recommended' | 'all';

export function filterLandmarks(items: EvaluatedLandmark[], equipment: Equipment, mode: SitesMode): EvaluatedLandmark[] {
  const eligible = items.filter(i => EQUIPMENT_RANK[i.landmark.minEquipment] <= EQUIPMENT_ORDER[equipment]);
  const sorted = [...eligible].sort((a, b) => b.score - a.score);
  if (mode === 'recommended') return sorted.filter(i => i.geoVisible && i.practicableNow).slice(0, 3);
  return sorted.filter(i => i.geoVisible);
}