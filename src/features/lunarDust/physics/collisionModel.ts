// Simplified granular contact: coefficient of restitution + Coulomb friction.
// This is NOT a validated lunar soil mechanics model; cohesion and irregular
// grain interlock are not reproduced. Parameters are configurable.
import type { Vec3 } from './particlePhysics';

export interface ContactParams {
  restitution: number;  // e ∈ [0,1]
  muStatic: number;     // μs
  muKinetic: number;    // μk
  settleSpeed: number;  // m/s below which a contact is treated as settled
}

export const DEFAULT_CONTACT: ContactParams = {
  restitution: 0.2, muStatic: 0.8, muKinetic: 0.6, settleSpeed: 0.05,
};

export interface CollisionResult {
  v: Vec3;
  settled: boolean;
  energyLost: number; // J per kg (specific)
  bounced: boolean;
}

/** Resolve a contact against a surface with unit normal n (pointing out of the
 *  ground). Normal component rebounds with e; tangential component is reduced
 *  by Coulomb friction impulse μk·(1+e)·|vn| capped at the tangential speed. */
export function resolveContact(v: Vec3, n: Vec3, prm: ContactParams, mass = 1): CollisionResult {
  const e = Math.min(1, Math.max(0, prm.restitution));
  const vn = v.x * n.x + v.y * n.y + v.z * n.z; // negative when approaching
  if (vn >= 0) return { v, settled: false, energyLost: 0, bounced: false };
  const keBefore = 0.5 * (v.x ** 2 + v.y ** 2 + v.z ** 2);
  // normal rebound
  let rx = v.x - (1 + e) * vn * n.x;
  let ry = v.y - (1 + e) * vn * n.y;
  let rz = v.z - (1 + e) * vn * n.z;
  // tangential friction impulse (Coulomb): |Jt| ≤ μk·|Jn|
  const tx = rx - (rx * n.x + ry * n.y + rz * n.z) * n.x;
  const ty = ry - (rx * n.x + ry * n.y + rz * n.z) * n.y;
  const tz = rz - (rx * n.x + ry * n.y + rz * n.z) * n.z;
  const tSpeed = Math.hypot(tx, ty, tz);
  const jn = (1 + e) * Math.abs(vn);
  if (tSpeed > 1e-9) {
    const reduction = Math.min(tSpeed, prm.muKinetic * jn);
    const f = (tSpeed - reduction) / tSpeed;
    rx = (rx - tx) + tx * f;
    ry = (ry - ty) + ty * f;
    rz = (rz - tz) + tz * f;
  }
  const speed = Math.hypot(rx, ry, rz);
  const settled = speed < prm.settleSpeed || (e === 0 && Math.abs(vn) < prm.settleSpeed * 4);
  if (settled) { rx = 0; ry = 0; rz = 0; }
  const keAfter = 0.5 * (rx ** 2 + ry ** 2 + rz ** 2);
  return {
    v: { x: rx, y: ry, z: rz },
    settled,
    energyLost: Math.max(0, (keBefore - keAfter) * mass),
    bounced: !settled && e > 0,
  };
}

/** Kinetic friction force magnitude F_f = μk·N. */
export const kineticFriction = (muK: number, N: number) => Math.max(0, muK) * Math.max(0, N);
/** Static friction can supply at most μs·N. */
export const staticFrictionMax = (muS: number, N: number) => Math.max(0, muS) * Math.max(0, N);