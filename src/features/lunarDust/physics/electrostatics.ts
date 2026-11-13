// Electrostatics: F = qE with vector directions. E = −∇V for the plate model.
// The EDS traveling-wave field is an ILLUSTRATIVE reduced-order pattern, not a
// validated electrode solver; NASA notes implementations vary in waveform and
// geometry. No universal lunar grain charge is assumed — q is user/reference input.
import type { Vec3 } from './particlePhysics';
import type { Coulombs, VoltsPerMeter } from './physicsUnits';

/** Uniform vertical field above a charged plate: E = −∇V with V(y) = V0 − E·y. */
export function plateField(E: VoltsPerMeter): Vec3 {
  return { x: 0, y: E, z: 0 };
}

/** F = q·E as a vector. */
export function electricForceVector(q: Coulombs, E: Vec3): Vec3 {
  return { x: q * E.x, y: q * E.y, z: q * E.z };
}

/** Numeric gradient of a scalar potential → E = −∇V (central differences). */
export function fieldFromPotential(V: (p: Vec3) => number, p: Vec3, h = 1e-3): Vec3 {
  return {
    x: -(V({ ...p, x: p.x + h }) - V({ ...p, x: p.x - h })) / (2 * h),
    y: -(V({ ...p, y: p.y + h }) - V({ ...p, y: p.y - h })) / (2 * h),
    z: -(V({ ...p, z: p.z + h }) - V({ ...p, z: p.z - h })) / (2 * h),
  };
}

export interface EdsParams {
  amplitude: VoltsPerMeter;  // illustrative field amplitude
  wavelength: number;        // m, electrode pitch (illustrative)
  frequency: number;         // Hz, phase advance (illustrative)
}

/** Traveling-wave dielectrophoretic-style pattern above interdigitated
 *  electrodes: a horizontal sweeping component plus a lifting fringe field.
 *  Educational approximation — clearly labeled in the UI. */
export function edsField(p: Vec3, t: number, prm: EdsParams): Vec3 {
  const k = (2 * Math.PI) / Math.max(1e-6, prm.wavelength);
  const phase = k * p.x - 2 * Math.PI * prm.frequency * t;
  const decay = Math.exp(-Math.max(0, p.y) * k); // fringe field decays with height
  return {
    x: prm.amplitude * Math.cos(phase) * decay * 0.6,
    y: prm.amplitude * Math.abs(Math.sin(phase)) * decay,
    z: 0,
  };
}