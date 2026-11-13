// Deterministic fixed-timestep dust engine. Rendering never drives physics:
// advance(realDt) accumulates time and runs whole fixed steps only.
// The simulated grains are REPRESENTATIVE particles; the on-screen render
// density is a separate visualization setting and never a physical count.
import { G_MOON, mulberry32, clamp } from './physicsUnits';
import { particleMass, gravityForce, electricForce, forceRatio, kineticEnergy, momentum, netAcceleration, type Vec3 } from './particlePhysics';
import { integrateStep, localG, flightTime, maxHeight, horizontalRange } from './ballisticMotion';
import { plateField, edsField, type EdsParams } from './electrostatics';
import { resolveContact, DEFAULT_CONTACT, type ContactParams } from './collisionModel';
import { terrainHeight, terrainNormal } from './terrainInteraction';
import { samplePlumeEjecta, DEFAULT_PLUME, type PlumeParams } from './plumeModel';

export type ScenarioId = 'footsteps' | 'rover' | 'plume' | 'adhesion' | 'eds' | 'suit';
export const SUIT_ZONES = ['visor', 'gloves', 'boots', 'exterior', 'joints', 'seals', 'plss'] as const;
export type SuitZone = typeof SUIT_ZONES[number];

export interface SimParams {
  altitudeGravity: boolean;
  diameterUm: number; density: number; chargeFc: number; fieldKVpm: number;
  launchSpeed: number; launchAngleDeg: number; launchHeight: number;
  contact: ContactParams;
  dtMs: number; speed: number;
  walkSpeed: number; stepFreq: number; stepIntensity: number;
  roverSpeed: number; wheelLoad: number;
  plume: PlumeParams; eds: EdsParams;
  vizDensity: number; maxParticles: number; seed: number;
}

export const DEFAULT_PARAMS: SimParams = {
  altitudeGravity: false,
  diameterUm: 70, density: 3100, chargeFc: 0, fieldKVpm: 0,
  launchSpeed: 2.2, launchAngleDeg: 45, launchHeight: 0.05,
  contact: { ...DEFAULT_CONTACT },
  dtMs: 1000 / 120, speed: 1,
  walkSpeed: 0.9, stepFreq: 1.6, stepIntensity: 0.6,
  roverSpeed: 1.6, wheelLoad: 0.6,
  plume: { ...DEFAULT_PLUME }, eds: { amplitude: 40000, wavelength: 0.02, frequency: 8 },
  vizDensity: 0.8, maxParticles: 3500, seed: 20261106,
};

export interface Telemetry {
  d: number; m: number; rho: number; q: number; g: number;
  v0: number; v: number; a: number | null; p: Vec3;
  t: number; T: number; H: number; R: number;
  ke: number; mom: number; fe: number; fg: number; ratio: number | null;
  collisions: number; simTime: number; live: number; settled: number;
}

const DEAD = 0, FLY = 1, SETTLED = 2, STUCK = 3;

/** Simple suit proxy zones (world-space spheres/capsule) for the integration
 *  scenario — a labeled geometric stand-in, not CAD geometry. */
export function suitZoneAt(p: Vec3): SuitZone | null {
  const d = (x: number, y: number, z: number) => Math.hypot(p.x - x, p.y - y, p.z - z);
  if (d(0, 1.62, 0.1) < 0.2) return 'visor';
  if (d(0, 1.62, 0) < 0.26) return 'seals';
  if (d(0.8, 0.78, 0.12) < 0.14 || d(-0.8, 0.78, 0.12) < 0.14) return 'gloves';
  if (d(0.2, 0.1, 0.05) < 0.2 || d(-0.2, 0.1, 0.05) < 0.2) return 'boots';
  if (d(0.52, 1.5, 0) < 0.14 || d(-0.52, 1.5, 0) < 0.14 || d(0.2, 0.62, 0) < 0.14 || d(-0.2, 0.62, 0) < 0.14) return 'joints';
  if (d(0, 1.25, -0.53) < 0.42) return 'plss';
  if (Math.abs(p.x) < 0.5 && p.y > 0.6 && p.y < 1.6 && Math.abs(p.z) < 0.5) return 'exterior';
  return null;
}

export class DustEngine {
  params: SimParams;
  scenario: ScenarioId = 'footsteps';
  pos: Float32Array; vel: Float32Array; v0: Float32Array;
  state: Uint8Array; age: Float32Array; coll: Uint16Array; zone: Int8Array;
  time = 0; steps = 0; selected = -1;
  zoneHits: Record<SuitZone, number> = { visor: 0, gloves: 0, boots: 0, exterior: 0, joints: 0, seals: 0, plss: 0 };
  private acc = 0; private cursor = 0; private rnd: () => number;
  astroX = 0; astroDir = 1; roverX = -8; private stepPhase = 0;

  constructor(params: SimParams = DEFAULT_PARAMS) {
    this.params = { ...params, contact: { ...params.contact }, plume: { ...params.plume }, eds: { ...params.eds } };
    const n = this.params.maxParticles;
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.v0 = new Float32Array(n * 3);
    this.state = new Uint8Array(n); this.age = new Float32Array(n); this.coll = new Uint16Array(n); this.zone = new Int8Array(n).fill(-1);
    this.rnd = mulberry32(this.params.seed);
  }

  setScenario(s: ScenarioId) {
    this.scenario = s;
    // Boot-kick preset for the suit-contamination scenario so ejecta reach the
    // helmet/gloves (illustrative, user-adjustable in the physical panel).
    if (s === 'suit') { this.params.launchSpeed = 4.2; this.params.launchAngleDeg = 62; }
    this.reset();
  }
  setParams(p: Partial<SimParams>) {
    this.params = { ...this.params, ...p, contact: { ...this.params.contact, ...(p.contact ?? {}) }, plume: { ...this.params.plume, ...(p.plume ?? {}) }, eds: { ...this.params.eds, ...(p.eds ?? {}) } };
  }
  reset() {
    this.state.fill(DEAD); this.coll.fill(0); this.zone.fill(-1); this.age.fill(0);
    this.time = 0; this.steps = 0; this.acc = 0; this.cursor = 0; this.selected = -1;
    this.astroX = 0; this.roverX = -8; this.stepPhase = 0;
    (Object.keys(this.zoneHits) as SuitZone[]).forEach(k => { this.zoneHits[k] = 0; });
    this.rnd = mulberry32(this.params.seed);
  }

  get mass() { return particleMass(this.params.diameterUm * 1e-6, this.params.density); }
  get g() { return localG(0, this.params.altitudeGravity); }

  private spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number) {
    const n = this.params.maxParticles;
    let i = this.cursor; let guard = 0;
    while (this.state[i] === FLY && guard < 64) { i = (i + 1) % n; guard++; }
    this.cursor = (i + 1) % n;
    const ix = i * 3;
    this.pos[ix] = x; this.pos[ix + 1] = y; this.pos[ix + 2] = z;
    this.vel[ix] = vx; this.vel[ix + 1] = vy; this.vel[ix + 2] = vz;
    this.v0[ix] = vx; this.v0[ix + 1] = vy; this.v0[ix + 2] = vz;
    this.state[i] = FLY; this.age[i] = 0; this.coll[i] = 0; this.zone[i] = -1;
    if (this.selected < 0) this.selected = i;
  }

  private emit(dt: number) {
    const P = this.params; const r = this.rnd;
    const cone = (speed: number, elDeg: number, az: number): [number, number, number] => {
      const el = elDeg * Math.PI / 180; const h = speed * Math.cos(el);
      return [h * Math.cos(az), speed * Math.sin(el), h * Math.sin(az)];
    };
    const rate = 260; // representative grains per second at full intensity
    if (this.scenario === 'footsteps' || this.scenario === 'suit') {
      this.astroX += this.astroDir * P.walkSpeed * dt;
      if (this.astroX > 5) this.astroDir = -1; if (this.astroX < -5) this.astroDir = 1;
      this.stepPhase += dt * P.stepFreq * Math.PI * 2;
      const pulse = Math.max(0, Math.sin(this.stepPhase)) ** 3;
      const n = Math.floor(rate * P.stepIntensity * pulse * dt + r());
      for (let i = 0; i < n; i++) {
        const sp = P.launchSpeed * (0.4 + r() * 0.8);
        const el = P.launchAngleDeg * (0.5 + r() * 0.7);
        const az = (this.astroDir > 0 ? Math.PI : 0) + (r() - 0.5) * 1.8;
        const [vx, vy, vz] = cone(sp, el, az);
        const bx = this.scenario === 'suit' ? 0 : this.astroX;
        this.spawn(bx + (r() - 0.5) * 0.3, terrainHeight(bx, 0) + P.launchHeight, (r() - 0.5) * 0.3, vx, vy, vz);
      }
    }
    if (this.scenario === 'rover') {
      this.roverX += P.roverSpeed * dt; if (this.roverX > 9) this.roverX = -9;
      const n = Math.floor(rate * 1.6 * P.wheelLoad * dt + r());
      for (let i = 0; i < n; i++) {
        const sp = P.launchSpeed * 1.5 * (0.4 + r());
        const [vx, vy, vz] = cone(sp, P.launchAngleDeg * (0.6 + r() * 0.6), Math.PI + (r() - 0.5) * 0.9);
        this.spawn(this.roverX - 0.6, terrainHeight(this.roverX, 3.4) + P.launchHeight, 3.4 + (r() - 0.5) * 0.8, vx, vy, vz);
      }
    }
    if (this.scenario === 'plume') {
      const n = Math.floor(rate * 2.4 * P.plume.throttle * dt + r());
      for (let i = 0; i < n; i++) {
        const s = samplePlumeEjecta(6.5, -5, P.plume, r);
        this.spawn(s.x, terrainHeight(s.x, s.z) + P.launchHeight, s.z, s.vx, s.vy, s.vz);
      }
    }
    if (this.scenario === 'adhesion' || this.scenario === 'eds') {
      const n = Math.floor(rate * 0.5 * dt + r());
      for (let i = 0; i < n; i++) {
        const x = this.scenario === 'eds' ? -4 + (r() - 0.5) * 1.6 : (r() - 0.5) * 3;
        const z = this.scenario === 'eds' ? -3 + (r() - 0.5) : (r() - 0.5) * 3;
        this.spawn(x, terrainHeight(x, z) + 0.02, z, (r() - 0.5) * 0.1, 0.02, (r() - 0.5) * 0.1);
      }
    }
  }

  /** One fixed physics step. */
  step(dt: number) {
    const P = this.params; const m = this.mass; const g = this.g;
    this.emit(dt);
    const q = P.chargeFc * 1e-15;
    const useField = (this.scenario === 'adhesion' || this.scenario === 'eds' || this.scenario === 'suit') ;
    for (let i = 0; i < P.maxParticles; i++) {
      if (this.state[i] !== FLY) continue;
      const ix = i * 3;
      const p: Vec3 = { x: this.pos[ix], y: this.pos[ix + 1], z: this.pos[ix + 2] };
      const v: Vec3 = { x: this.vel[ix], y: this.vel[ix + 1], z: this.vel[ix + 2] };
      // force balance: m·a = Fg + Fe (contact handled at collision)
      let fy = -gravityForce(m, p.y, P.altitudeGravity);
      let fx = 0, fz = 0;
      if (useField && m > 0) {
        const E = this.scenario === 'eds' ? edsField({ ...p, y: p.y - terrainHeight(p.x, p.z) }, this.time, P.eds) : plateField(P.fieldKVpm * 1e3);
        fx += q * E.x; fy += q * E.y; fz += q * E.z;
      }
      const ax = m > 0 ? fx / m : 0, ay = m > 0 ? fy / m : -g, az = m > 0 ? fz / m : 0;
      // integrate x,z with accel too (EDS horizontal sweep)
      this.pos[ix] += v.x * dt + 0.5 * ax * dt * dt;
      this.pos[ix + 2] += v.z * dt + 0.5 * az * dt * dt;
      this.vel[ix] += ax * dt; this.vel[ix + 2] += az * dt;
      integrateStep({ p, v }, dt, ay);
      this.pos[ix] = p.x; this.pos[ix + 1] = p.y; this.pos[ix + 2] = p.z;
      this.vel[ix] = v.x; this.vel[ix + 1] = v.y; this.vel[ix + 2] = v.z;
      this.age[i] += dt;
      // suit contact (integration scenario)
      if (this.scenario === 'suit') {
        const z = suitZoneAt(p);
        if (z) { this.state[i] = STUCK; this.zone[i] = SUIT_ZONES.indexOf(z); this.zoneHits[z]++; continue; }
      }
      // terrain contact
      const h = terrainHeight(p.x, p.z);
      if (p.y <= h + 0.004 && this.vel[ix + 1] < 0) {
        const n = terrainNormal(p.x, p.z);
        const res = resolveContact({ x: this.vel[ix], y: this.vel[ix + 1], z: this.vel[ix + 2] }, n, P.contact, m);
        this.vel[ix] = res.v.x; this.vel[ix + 1] = res.v.y; this.vel[ix + 2] = res.v.z;
        this.pos[ix + 1] = h + 0.004;
        this.coll[i]++;
        if (res.settled) this.state[i] = SETTLED;
      }
      if (this.age[i] > 30 || Math.abs(p.x) > 40 || Math.abs(p.z) > 40) this.state[i] = DEAD;
    }
    // settled grains fade out after a while to recycle the pool
    for (let i = 0; i < P.maxParticles; i++) {
      if (this.state[i] === SETTLED) { this.age[i] += dt; if (this.age[i] > 14) this.state[i] = DEAD; }
    }
    if (this.selected >= 0 && this.state[this.selected] === DEAD) {
      this.selected = -1;
      for (let i = 0; i < P.maxParticles; i++) if (this.state[i] === FLY) { this.selected = i; break; }
    }
    this.time += dt; this.steps++;
  }

  /** Rendering calls this; physics runs in whole fixed steps only. */
  advance(realDt: number) {
    const dt = this.params.dtMs / 1000;
    this.acc += clamp(realDt, 0, 0.1) * this.params.speed;
    let n = 0;
    while (this.acc >= dt && n < 10) { this.step(dt); this.acc -= dt; n++; }
    if (n === 10) this.acc = 0; // drop backlog, never spiral
  }
  singleStep() { this.step(this.params.dtMs / 1000); }

  counts() {
    let live = 0, settled = 0;
    for (let i = 0; i < this.params.maxParticles; i++) { if (this.state[i] === FLY) live++; else if (this.state[i] === SETTLED || this.state[i] === STUCK) settled++; }
    return { live, settled };
  }

  telemetry(): Telemetry {
    const P = this.params; const m = this.mass; const g = this.g;
    const i = this.selected;
    const q = P.chargeFc * 1e-15;
    const fe = electricForce(q, P.fieldKVpm * 1e3);
    const fg = gravityForce(m, 0, P.altitudeGravity);
    if (i < 0) {
      return { d: P.diameterUm * 1e-6, m, rho: P.density, q, g, v0: P.launchSpeed, v: 0, a: netAcceleration(fg * -1 + fe, m), p: { x: 0, y: 0, z: 0 }, t: 0, T: flightTime(P.launchSpeed * Math.sin(P.launchAngleDeg * Math.PI / 180), g), H: maxHeight(P.launchSpeed * Math.sin(P.launchAngleDeg * Math.PI / 180), g), R: horizontalRange(P.launchSpeed * Math.cos(P.launchAngleDeg * Math.PI / 180), P.launchSpeed * Math.sin(P.launchAngleDeg * Math.PI / 180), g), ke: 0, mom: 0, fe, fg, ratio: forceRatio(q, P.fieldKVpm * 1e3, m, g), collisions: 0, simTime: this.time, ...this.counts() };
    }
    const ix = i * 3;
    const v = Math.hypot(this.vel[ix], this.vel[ix + 1], this.vel[ix + 2]);
    const v0 = Math.hypot(this.v0[ix], this.v0[ix + 1], this.v0[ix + 2]);
    const vy0 = this.v0[ix + 1];
    return {
      d: P.diameterUm * 1e-6, m, rho: P.density, q, g,
      v0, v, a: netAcceleration(-fg + fe, m),
      p: { x: this.pos[ix], y: this.pos[ix + 1], z: this.pos[ix + 2] },
      t: this.age[i], T: flightTime(vy0, g), H: maxHeight(vy0, g),
      R: horizontalRange(Math.hypot(this.v0[ix], this.v0[ix + 2]), vy0, g),
      ke: kineticEnergy(m, v), mom: momentum(m, v), fe, fg,
      ratio: forceRatio(q, P.fieldKVpm * 1e3, m, g),
      collisions: this.coll[i], simTime: this.time, ...this.counts(),
    };
  }

  /** CSV of the current particle sample (SI units). */
  csv(): string {
    const rows = ['t_s,x_m,y_m,z_m,vx_mps,vy_mps,vz_mps,speed_mps,ke_J,collisions,state'];
    const m = this.mass;
    for (let i = 0; i < this.params.maxParticles; i++) {
      if (this.state[i] === DEAD) continue;
      const ix = i * 3;
      const sp = Math.hypot(this.vel[ix], this.vel[ix + 1], this.vel[ix + 2]);
      rows.push([this.age[i], this.pos[ix], this.pos[ix + 1], this.pos[ix + 2], this.vel[ix], this.vel[ix + 1], this.vel[ix + 2], sp, kineticEnergy(m, sp), this.coll[i], this.state[i]].map(v => Number(v).toPrecision(6)).join(','));
    }
    return rows.join('\n');
  }
  configJson(): string { return JSON.stringify({ scenario: this.scenario, params: this.params }, null, 2); }
}