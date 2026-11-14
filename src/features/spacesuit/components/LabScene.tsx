'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { COMPONENTS } from '../data/axemu';
import { SmithsonianModel, useSmithsonianAvailability, SI_MODEL_PAGE, SI_MODEL_URL } from './SmithsonianModel';
import { UserSuitModel } from './UserModel';
import { ANNOTATIONS, SCAN_ANNOTATIONS, type Mode } from '../data/annotations';

export type SuitView = 'front' | 'back' | 'left' | 'top';

/** If the supplied Smithsonian .glb is missing/corrupt, fall back to the
 *  labeled reconstruction instead of blanking the viewport. */
class ModelBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.warn('[LunaNav] Smithsonian model failed to load:', err); this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
export interface LabSceneProps {
  mode: Mode;
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** components hidden by the tree */
  hidden: Set<string>;
  isolated: string | null;
  /** 0 opaque → 1 fully transparent */
  xray: number;
  /** 0 assembled → 1 separated */
  explode: number;
  /** -1 = no cut, else plane position along Z in metres */
  section: number;
  labels: boolean;
  showAnnotations: boolean;
  quality: 'low' | 'med' | 'high';
  autoRotate: boolean;
  view: { v: SuitView; n: number } | null;
  measure: boolean;
  onMeasure: (m: number | null) => void;
  /** dust exposure simulation */
  dustRate: number;
  labelFor: (id: string) => string;
  onZoneHit: (zone: string) => void;
  zoneLevels: Record<string, number>;
  /** guided-tour / view fly-to target */
  fly: { cam: [number, number, number]; n: number } | null;
  lang: 'en' | 'ar';
  /** when true, load the real Smithsonian A7L scan instead of the reconstruction */
  siModel: boolean;
  /** client-supplied .glb (the user's own download from 3d.si.edu) */
  userModelUrl: string | null;
}
const DPR = { low: [0.75, 1], med: [1, 1.5], high: [1, 2] } as const;
const LAYER_RADII = [0.235, 0.258, 0.281, 0.303, 0.328, 0.352, 0.376, 0.388];
const LAYER_COLORS = ['#3E7FC1', '#8FA6C8', '#4A5568', '#6B7688', '#C8A24A', '#8A8F98', '#E8ECF4', '#9AA6BC'];
const VIEWS: Record<SuitView, [number, number, number]> = {
  front: [0, 1.35, 4.3], back: [0, 1.35, -4.3], left: [-4.3, 1.35, 0], top: [0, 5.2, 0.02],
};

function useFabric(): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); if (!g) return null;
    g.fillStyle = '#808080'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 4) for (let x = 0; x < 128; x += 4) {
      const v = ((x / 4 + y / 4) % 2 === 0 ? 150 : 105) + Math.random() * 18;
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 4, 4);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7);
    return t;
  }, []);
}

interface SelCtx {
  selected: string | null; hover: string | null; setHover: (s: string | null) => void;
  onSelect: (id: string | null) => void; measure: boolean;
  onPoint: (p: THREE.Vector3) => void; clip: THREE.Plane[]; opacity: number;
}
function usePart(id: string, s: SelCtx) {
  const sel = s.selected === id, hov = s.hover === id;
  return {
    sel,
    handlers: {
      onClick: (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (s.measure) s.onPoint(e.point.clone()); else s.onSelect(id);
      },
      onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); s.setHover(id); document.body.style.cursor = s.measure ? 'crosshair' : 'pointer'; },
      onPointerOut: () => { s.setHover(null); document.body.style.cursor = ''; },
    },
    em: sel ? '#53D8E8' : hov ? '#2f7f8c' : '#000000',
    ei: sel ? 0.55 : hov ? 0.3 : 0,
  };
}

function Label({ show, anchor, dir, title, body, onSelect, compact, onHover, register, prio }: {
  show: boolean; anchor: [number, number, number]; dir: [number, number, number];
  title: string; body: string; onSelect: () => void; compact: boolean; onHover: (v: boolean) => void;
  register: (id: string, el: HTMLButtonElement | null) => void; prio: number;
}) {
  const off: [number, number, number] = [dir[0] * 0.42, dir[1] * 0.34, dir[2] * 0.42];
  return (
    <group>
      {show && <Line points={[anchor, [anchor[0] + off[0], anchor[1] + off[1], anchor[2] + off[2]]]} color="#53D8E8" lineWidth={1} transparent opacity={0.55} />}
      <Html center position={[anchor[0] + off[0], anchor[1] + off[1], anchor[2] + off[2]]} zIndexRange={[12, 0]}>
        <button
          ref={el => register(title, el)}
          data-prio={prio}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
          onFocus={() => onHover(true)}
          onBlur={() => onHover(false)}
          onClick={e => { e.stopPropagation(); onSelect(); }}
          className="rounded-lg border px-2 py-1 text-start leading-tight transition-colors"
          style={{
            width: 208, maxWidth: 208, pointerEvents: show ? 'auto' : 'none', display: show ? 'block' : 'none',
            borderColor: 'rgba(83,216,232,0.45)', background: 'rgba(7,12,22,0.88)', backdropFilter: 'blur(6px)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
          }}
        >
          <span className="block text-[11px] font-semibold text-[#9EE8F2]">{title}</span>
          {!compact && <span className="mt-0.5 block text-[10px] text-[#AAB6CC]" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{body}</span>}
        </button>
      </Html>
    </group>
  );
}

/** Camera fly-to for guided tours and view presets. */
function Rig({ target, controls }: { target: { cam: [number, number, number]; n: number } | null; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  const goal = useRef<THREE.Vector3 | null>(null);
  useEffect(() => {
    goal.current = target?.cam ? new THREE.Vector3(...target.cam) : null;
  }, [target]);
  useEffect(() => {
    const c = controls.current; if (!c) return;
    const stop = () => { goal.current = null; };
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, [controls]);
  useFrame(() => {
    if (!goal.current) return;
    camera.position.lerp(goal.current, 0.07);
    camera.lookAt(0, 1.05, 0);
    if (camera.position.distanceTo(goal.current) < 0.02) goal.current = null;
  });
  return null;
}

/** Lunar dust exposure: representative grains, graphical accumulation only. */
function Dust({ rate, levels, onHit, quality }: { rate: number; levels: Record<string, number>; onHit: (z: string) => void; quality: 'low' | 'med' | 'high' }) {
  const COUNT = quality === 'low' ? 220 : quality === 'med' ? 520 : 900;
  const P = useMemo(() => ({
    pos: new Float32Array(COUNT * 3), vel: new Float32Array(COUNT * 3),
    stuck: new Uint8Array(COUNT), zone: new Int8Array(COUNT).fill(-1), age: new Float32Array(COUNT),
  }), [COUNT]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const cursor = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  // zones: coarse proxy volumes around the suit (display geometry, not CAD)
  const ZONES = useMemo(() => [
    { id: 'helmet-visor', c: [0, 1.68, 0.16], r: 0.2 },
    { id: 'helmet-seal', c: [0, 1.44, 0], r: 0.18 },
    { id: 'hut-shoulder', c: [0.42, 1.38, 0], r: 0.2 },
    { id: 'arm-elbow', c: [0.58, 0.97, 0.02], r: 0.18 },
    { id: 'glove-outer', c: [0.67, 0.57, 0.12], r: 0.16 },
    { id: 'lta-waist', c: [0, 0.73, 0], r: 0.28 },
    { id: 'leg-knee', c: [0.16, 0.36, 0.02], r: 0.18 },
    { id: 'boot-sole', c: [0.15, 0.08, 0.05], r: 0.2 },
    { id: 'hut-hatch', c: [0, 1.2, -0.4], r: 0.26 },
  ], []);
  const spawn = useRef(0);
  useFrame((_, dt) => {
    const mesh = ref.current; if (!mesh) return;
    spawn.current += dt * rate * 90;
    while (spawn.current >= 1) {
      spawn.current -= 1;
      const i = cursor.current = (cursor.current + 1) % COUNT;
      const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 0.5;
      P.pos[i * 3] = Math.cos(a) * r * 2.2;
      P.pos[i * 3 + 1] = 0.02 + Math.random() * 0.15;
      P.pos[i * 3 + 2] = Math.sin(a) * r * 1.4 + 1.1;
      const speed = 1.6 + Math.random() * 2.6;
      P.vel[i * 3] = -Math.cos(a) * 0.35 * speed;
      P.vel[i * 3 + 1] = 1.3 + Math.random() * 1.6;
      P.vel[i * 3 + 2] = -Math.sin(a) * 0.3 * speed - 0.8;
      P.stuck[i] = 0; P.zone[i] = -1; P.age[i] = 0;
    }
    let drawn = 0;
    for (let i = 0; i < COUNT; i++) {
      if (P.stuck[i] === 0) {
        P.vel[i * 3 + 1] -= 1.62 * dt;
        P.pos[i * 3] += P.vel[i * 3] * dt;
        P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt;
        P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
        for (let z = 0; z < ZONES.length; z++) {
          const Z = ZONES[z];
          const d = Math.hypot(P.pos[i * 3] - Z.c[0], P.pos[i * 3 + 1] - Z.c[1], P.pos[i * 3 + 2] - Z.c[2]);
          if (d < Z.r) { P.stuck[i] = 1; P.zone[i] = z; onHit(Z.id); break; }
        }
        if (P.pos[i * 3 + 1] < 0) P.stuck[i] = 1;
        P.age[i] += dt;
        if (P.age[i] > 9) { P.pos[i * 3 + 1] = -99; P.stuck[i] = 2; }
      }
      if (P.stuck[i] === 2) continue;
      dummy.position.set(P.pos[i * 3], P.pos[i * 3 + 1], P.pos[i * 3 + 2]);
      dummy.scale.setScalar(P.stuck[i] === 1 ? 0.8 : 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(drawn++, dummy.matrix);
    }
    mesh.count = drawn;
    mesh.instanceMatrix.needsUpdate = true;
    void levels;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <dodecahedronGeometry args={[0.012, 0]} />
      <meshStandardMaterial color="#9A938B" roughness={0.95} flatShading />
    </instancedMesh>
  );
}

function langOf(p: { labelFor: (id: string) => string }) {
  return (p as unknown as { __lang?: 'en' | 'ar' }).__lang ?? 'en';
}

/** Hides annotation cards that would overlap on screen. Colliders lose to
 *  higher-priority (surface) cards; nothing is removed from the dataset. */
function Declutter({ cards, enabled }: { cards: React.RefObject<Map<string, HTMLButtonElement>>; enabled: boolean }) {
  const { camera, gl } = useThree();
  const frame = useRef(0);
  useFrame(() => {
    if (++frame.current % 6 !== 0) return;
    const map = cards.current;
    if (!map) return;
    const camDir = camera.position.clone().normalize();
    type Item = { el: HTMLButtonElement; prio: number; d: number };
    const items: Item[] = [];
    map.forEach((el, id) => {
      if (!el.isConnected) return;
      // hidden cards are skipped entirely (display:none measures as 0×0)
      if (!enabled) { el.style.visibility = 'visible'; return; }
      el.style.visibility = 'visible';
      const prio = Number(el.dataset.prio ?? 1);
      // depth of the anchor approximated by its label offset direction
      items.push({ el, prio, d: (id.length % 7) * 0.01 });
    });
    if (!items.length) return;
    items.sort((a, b) => b.prio - a.prio || a.d - b.d);
    const placed: { l: number; r: number; t: number; b: number }[] = [];
    const PAD = 4;
    // clamp against the 3D viewport itself, not the browser window, so cards
    // never spill over the side panels or get clipped at the canvas edge
    const view = gl.domElement.getBoundingClientRect();
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      if (r.width === 0) continue;
      const box = { l: r.left - PAD, r: r.right + PAD, t: r.top - PAD, b: r.bottom + PAD };
      const offscreen = box.l < view.left + 4 || box.r > view.right - 4
        || box.t < view.top + 34 || box.b > view.bottom - 40;
      const hit = placed.some(p => box.l < p.r && p.l < box.r && box.t < p.b && p.t < box.b);
      it.el.style.visibility = hit || offscreen ? 'hidden' : 'visible';
      if (!hit && !offscreen) placed.push(box);
    }
    void camDir;
  });
  return null;
}

function Suit(p: LabSceneProps & { s: SelCtx; setUiPaused: (v: boolean) => void; lang: 'en' | 'ar' }) {
  const si = useSmithsonianAvailability();
  const [siFailed, setSiFailed] = useState(false);
  // Keep one source model mounted for every viewing mode. The Smithsonian scan
  // is a merged surface; mode-specific internal geometry cannot be inferred from it.
  const showUser = Boolean(p.userModelUrl);
  const showSI = !showUser && p.siModel && si.available && !siFailed;
  const showReference = !showUser && !showSI;
  const cards = useRef<Map<string, HTMLButtonElement>>(new Map());
  const registerCard = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) cards.current.set(id, el); else cards.current.delete(id);
  }, []);
  const fabric = useFabric();
  const clip = p.s.clip;
  const ex = p.mode === 'exploded' ? p.explode : 0;
  // internal & cross-section modes reveal the inside: outer garments fade hard,
  // the layer stack stays readable but never opaque enough to hide the wearer.
  const reveal = p.mode === 'internal' || p.mode === 'cross';
  const ghost = reveal ? 0.16 : p.xray > 0.02 ? 1 - p.xray * 0.85 : 1;
  const showInternals = reveal || p.xray > 0.5;
  const isHidden = (id: string) => p.hidden.has(id) || (p.isolated != null && p.isolated !== id);

  const H = (id: string) => ({ id, ...usePart(id, p.s) });
  const helmet = H('helmet-shell'), visor = H('helmet-visor'), seal = H('helmet-seal'), vent = H('helmet-vent');
  const hut = H('hut-shell'), hatch = H('hut-hatch'), shoulder = H('hut-shoulder');
  const upArm = H('arm-upper'), elbow = H('arm-elbow'), wrist = H('arm-wrist');
  const gOut = H('glove-outer'), gBlad = H('glove-bladder');
  const waist = H('lta-waist'), knee = H('leg-knee'), sole = H('boot-sole'), bootIn = H('boot-insulation');
  const plssIds = ['plss-o2', 'plss-reg', 'plss-fan', 'plss-co2', 'plss-water', 'plss-heat', 'plss-power', 'plss-comms', 'plss-emergency'];
  const plssParts = plssIds.map(H);
  const layerIds = ['layer-lcvg', 'layer-bladder', 'layer-restraint', 'layer-ripstop', 'layer-insulation', 'layer-mmg', 'layer-outer', 'layer-dust'];
  const layerParts = layerIds.map(H);
  const fingers = ['finger-thumb', 'finger-index', 'finger-middle', 'finger-ring', 'finger-little'].map(H);

  const fabricMat = (hp: { em: string; ei: number }, opacity = 1) => ({
    color: '#E8ECF4', roughness: 0.85, metalness: 0.04, bumpMap: fabric ?? undefined, bumpScale: 0.02,
    transparent: opacity < 1 || ghost < 1, opacity: Math.min(opacity, ghost),
    clippingPlanes: clip, emissive: hp.em, emissiveIntensity: hp.ei,
  });
  const hardMat = (color: string, hp: { em: string; ei: number }, metal = 0.15) => ({
    color, roughness: 0.55, metalness: metal, clippingPlanes: clip, emissive: hp.em, emissiveIntensity: hp.ei,
  });

  const plssGeom: Record<string, { p: [number, number, number]; s: [number, number, number]; c: string; cyl?: boolean }> = {
    'plss-o2': { p: [-0.14, 1.35, -0.5], s: [0.06, 0.3, 0.06], c: '#7FB3E8', cyl: true },
    'plss-reg': { p: [-0.14, 1.13, -0.5], s: [0.08, 0.06, 0.08], c: '#9AA6BC' },
    'plss-fan': { p: [0.12, 1.42, -0.5], s: [0.07, 0.07, 0.07], c: '#53D8E8', cyl: true },
    'plss-co2': { p: [0.12, 1.27, -0.5], s: [0.12, 0.12, 0.1], c: '#86EFAC' },
    'plss-water': { p: [-0.12, 1.0, -0.5], s: [0.06, 0.16, 0.06], c: '#3E7FC1', cyl: true },
    'plss-heat': { p: [0, 1.54, -0.56], s: [0.4, 0.05, 0.12], c: '#C8A24A' },
    'plss-power': { p: [0.12, 1.02, -0.5], s: [0.12, 0.13, 0.1], c: '#F5B85C' },
    'plss-comms': { p: [0, 0.93, -0.57], s: [0.16, 0.06, 0.08], c: '#929AFF' },
    'plss-emergency': { p: [0, 1.14, -0.44], s: [0.045, 0.14, 0.045], c: '#F87171', cyl: true },
  };

  return (
    <group>
      {showUser && p.userModelUrl && (
        <UserSuitModel url={p.userModelUrl} opacity={p.mode === 'internal' ? 0.32 : 1} clip={clip} onSelect={() => p.onSelect('helmet-visor')} />
      )}
      {showSI && (
        <React.Suspense fallback={null}>
          <ModelBoundary onError={() => setSiFailed(true)}>
            <SmithsonianModel
              visible
              opacity={p.mode === 'internal' ? 0.32 : p.xray > 0.02 ? Math.max(0.12, 1 - p.xray * 0.88) : 1}
              clip={clip}
              onSelect={() => p.onSelect('helmet-visor')}
            />
          </ModelBoundary>
        </React.Suspense>
      )}

      {/* --- procedural reconstruction (hidden when the real scan is loaded) --- */}
      {showReference && (<>
      {/* mannequin — internal mode only */}
      {(p.mode === 'internal' || p.mode === 'cross') && (
        <group>
          <mesh position={[0, 1.6, 0]}><sphereGeometry args={[0.12, 16, 12]} /><meshStandardMaterial color="#c9a184" roughness={0.7} /></mesh>
          <mesh position={[0, 1.12, 0]}><capsuleGeometry args={[0.15, 0.5, 4, 12]} /><meshStandardMaterial color="#b98d6f" roughness={0.7} /></mesh>
          {([-1, 1] as const).map(sd => <mesh key={`am${sd}`} position={[sd * 0.4, 1.12, 0]} rotation={[0, 0, sd * -0.35]}><capsuleGeometry args={[0.055, 0.58, 4, 8]} /><meshStandardMaterial color="#c9a184" roughness={0.7} /></mesh>)}
          {([-1, 1] as const).map(sd => <mesh key={`lm${sd}`} position={[sd * 0.14, 0.42, 0]}><capsuleGeometry args={[0.065, 0.58, 4, 8]} /><meshStandardMaterial color="#b98d6f" roughness={0.7} /></mesh>)}
        </group>
      )}

      {/* --- layer stack (internal / cross / x-ray) --- */}
      {showInternals && layerIds.map((id, i) => {
        const hp = layerParts[i];
        if (isHidden(id)) return null;
        const r = LAYER_RADII[i];
        return (
          <mesh key={id} position={[0, 1.1, ex * (0.2 + i * 0.12)]} {...hp.handlers}>
            <cylinderGeometry args={[r, r, 0.9, 32, 1, true]} />
            <meshStandardMaterial
              color={LAYER_COLORS[i]} side={THREE.DoubleSide}
              roughness={i === 4 ? 0.35 : 0.7} metalness={i === 4 ? 0.45 : 0.05}
              clippingPlanes={clip}
              transparent opacity={reveal ? 0.3 : Math.min(0.8, ghost + 0.15)}
              depthWrite={false}
              emissive={hp.em} emissiveIntensity={hp.ei}
            />
          </mesh>
        );
      })}

      {/* --- helmet assembly: +Y on explode --- */}
      <group position={[0, ex * 0.85, 0]}>
        {!isHidden('helmet-shell') && (
          <mesh position={[0, 1.66, 0]} {...helmet.handlers}>
            <sphereGeometry args={[0.26, 28, 20]} />
            <meshStandardMaterial color="#dfe6f2" roughness={0.1} metalness={0.05} transparent opacity={Math.min(0.42, ghost)} clippingPlanes={clip} emissive={helmet.em} emissiveIntensity={helmet.ei} />
          </mesh>
        )}
        {!isHidden('helmet-visor') && (
          <mesh position={[0, 1.66, 0.07]} {...visor.handlers}>
            <sphereGeometry args={[0.2, 24, 16]} />
            <meshStandardMaterial color="#D4A017" metalness={0.7} roughness={0.18} clippingPlanes={clip} transparent opacity={Math.min(0.95, ghost + 0.2)} emissive={visor.em} emissiveIntensity={visor.ei} />
          </mesh>
        )}
        {!isHidden('helmet-seal') && (
          <mesh position={[0, 1.44, 0]} rotation={[Math.PI / 2, 0, 0]} {...seal.handlers}>
            <torusGeometry args={[0.17, 0.035, 10, 32]} />
            <meshStandardMaterial {...hardMat('#9AA6BC', seal, 0.5)} />
          </mesh>
        )}
        {!isHidden('helmet-vent') && ([0.24, -0.24] as const).map(x => (
          <mesh key={x} position={[x, 1.7, 0]} {...vent.handlers}><boxGeometry args={[0.05, 0.09, 0.11]} /><meshStandardMaterial {...hardMat('#5b6675', vent, 0.3)} /></mesh>
        ))}
      </group>

      {/* --- hard upper torso --- */}
      {!isHidden('hut-shell') && (
        <mesh position={[0, 1.12, 0]} {...hut.handlers}>
          <cylinderGeometry args={[0.36, 0.3, 0.6, 28]} />
          <meshStandardMaterial {...fabricMat(hut)} />
        </mesh>
      )}
      {!isHidden('hut-hatch') && (
        <group position={[0, 0, -ex * 0.9]}>
          <mesh position={[0, 1.16, -0.34]} {...hatch.handlers}>
            <boxGeometry args={[0.44, 0.5, 0.1]} />
            <meshStandardMaterial {...hardMat('#cfd6e2', hatch, 0.18)} />
          </mesh>
          {/* PLSS internals ride with the hatch on explode */}
          {showInternals && plssIds.map((id, i) => {
            const g = plssGeom[id]; const hp = plssParts[i];
            if (isHidden(id)) return null;
            return (
              <mesh key={id} position={g.p} {...hp.handlers}>
                {g.cyl ? <cylinderGeometry args={[g.s[0], g.s[0], g.s[1], 14]} /> : <boxGeometry args={g.s} />}
                <meshStandardMaterial {...hardMat(g.c, hp, 0.25)} />
              </mesh>
            );
          })}
        </group>
      )}
      {!isHidden('hut-shoulder') && ([-1, 1] as const).map(sd => (
        <group key={`sh${sd}`}>
          <mesh position={[sd * 0.36, 1.36, 0]} {...shoulder.handlers}><sphereGeometry args={[0.12, 16, 12]} /><meshStandardMaterial {...fabricMat(shoulder)} /></mesh>
          <mesh position={[sd * 0.4, 1.36, 0]} rotation={[0, 0, Math.PI / 2]} {...shoulder.handlers}><torusGeometry args={[0.1, 0.025, 10, 24]} /><meshStandardMaterial {...hardMat('#8d97a8', shoulder, 0.5)} /></mesh>
        </group>
      ))}

      {/* --- arms + gloves: ±X on explode --- */}
      {([-1, 1] as const).map(sd => (
        <group key={`arm${sd}`} position={[sd * ex * 0.55, 0, 0]}>
          {!isHidden('arm-upper') && <mesh position={[sd * 0.47, 1.16, 0]} rotation={[0, 0, sd * -0.55]} {...upArm.handlers}><capsuleGeometry args={[0.095, 0.32, 4, 12]} /><meshStandardMaterial {...fabricMat(upArm)} /></mesh>}
          {!isHidden('arm-elbow') && <mesh position={[sd * 0.56, 0.98, 0.01]} rotation={[0, 0, Math.PI / 2]} {...elbow.handlers}><torusGeometry args={[0.085, 0.025, 10, 24]} /><meshStandardMaterial {...hardMat('#39424f', elbow, 0.2)} /></mesh>}
          {!isHidden('arm-upper') && <mesh position={[sd * 0.6, 0.82, 0.05]} rotation={[0.25, 0, sd * -0.15]} {...upArm.handlers}><capsuleGeometry args={[0.08, 0.28, 4, 12]} /><meshStandardMaterial {...fabricMat(upArm)} /></mesh>}
          <group position={[sd * ex * 0.42, 0, 0]}>
            {!isHidden('arm-wrist') && <mesh position={[sd * 0.63, 0.68, 0.09]} rotation={[0, 0, Math.PI / 2]} {...wrist.handlers}><torusGeometry args={[0.07, 0.02, 10, 24]} /><meshStandardMaterial {...hardMat('#8d97a8', wrist, 0.5)} /></mesh>}
            {showInternals && !isHidden('glove-bladder') && <mesh position={[sd * 0.65, 0.58, 0.12]} {...gBlad.handlers}><sphereGeometry args={[0.07, 12, 10]} /><meshStandardMaterial color="#8FA6C8" transparent opacity={0.6} clippingPlanes={clip} emissive={gBlad.em} emissiveIntensity={gBlad.ei} /></mesh>}
            {!isHidden('glove-outer') && <mesh position={[sd * 0.65, 0.58, 0.12]} {...gOut.handlers}><sphereGeometry args={[0.085, 14, 12]} /><meshStandardMaterial {...fabricMat(gOut)} /></mesh>}
            {!isHidden('glove-outer') && fingers.map((f, fi) => (
              <mesh key={fi} position={[sd * (0.65 + (fi - 2) * 0.028), 0.5, 0.16 + (fi === 0 ? -0.05 : 0)]} rotation={[0.5, 0, 0]} {...f.handlers}>
                <capsuleGeometry args={[0.016, 0.06, 3, 8]} />
                <meshStandardMaterial {...fabricMat(f)} />
              </mesh>
            ))}
          </group>
        </group>
      ))}

      {/* --- lower torso / legs / boots: −Y on explode --- */}
      {!isHidden('lta-waist') && (
        <group position={[0, -ex * 0.35, 0]}>
          <mesh position={[0, 0.73, 0]} {...waist.handlers}><cylinderGeometry args={[0.3, 0.26, 0.3, 28]} /><meshStandardMaterial {...fabricMat(waist)} /></mesh>
          {([-1, 1] as const).map(sd => <mesh key={sd} position={[sd * 0.16, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} {...waist.handlers}><torusGeometry args={[0.09, 0.025, 10, 24]} /><meshStandardMaterial {...hardMat('#39424f', waist, 0.2)} /></mesh>)}
        </group>
      )}
      {([-1, 1] as const).map(sd => (
        <group key={`leg${sd}`} position={[0, -ex * 0.72, 0]}>
          {!isHidden('leg-knee') && (
            <>
              <mesh position={[sd * 0.16, 0.5, 0]} {...upArm.handlers}><capsuleGeometry args={[0.1, 0.3, 4, 12]} /><meshStandardMaterial {...fabricMat(upArm)} /></mesh>
              <mesh position={[sd * 0.16, 0.36, 0.02]} rotation={[Math.PI / 2, 0, 0]} {...knee.handlers}><torusGeometry args={[0.09, 0.025, 10, 24]} /><meshStandardMaterial {...hardMat('#39424f', knee, 0.2)} /></mesh>
              <mesh position={[sd * 0.16, 0.22, 0.01]} {...upArm.handlers}><capsuleGeometry args={[0.085, 0.24, 4, 12]} /><meshStandardMaterial {...fabricMat(upArm)} /></mesh>
            </>
          )}
          <group position={[0, -ex * 0.3, 0]}>
            {showInternals && !isHidden('boot-insulation') && <mesh position={[sd * 0.15, 0.12, 0.04]} {...bootIn.handlers}><boxGeometry args={[0.16, 0.12, 0.28]} /><meshStandardMaterial color="#C8A24A" transparent opacity={0.6} clippingPlanes={clip} emissive={bootIn.em} emissiveIntensity={bootIn.ei} /></mesh>}
            {!isHidden('boot-sole') && (
              <>
                <mesh position={[sd * 0.15, 0.08, 0.05]} {...sole.handlers}><boxGeometry args={[0.19, 0.14, 0.32]} /><meshStandardMaterial color="#5b6675" roughness={0.9} clippingPlanes={clip} emissive={sole.em} emissiveIntensity={sole.ei} /></mesh>
                {[...Array(5)].map((_, ti) => <mesh key={ti} position={[sd * 0.15, 0.012, -0.08 + ti * 0.06]} {...sole.handlers}><boxGeometry args={[0.19, 0.015, 0.03]} /><meshStandardMaterial color="#39424f" roughness={0.95} clippingPlanes={clip} emissive={sole.em} emissiveIntensity={sole.ei} /></mesh>)}
              </>
            )}
          </group>
        </group>
      ))}

      </>)}

      {/* --- annotation card decluttering (measured rects, Smithsonian-style) --- */}
      <Declutter cards={cards} enabled={p.showAnnotations} />

      {/* --- annotations --- */}
      {/* Cards stay mounted across mode changes: unmounting drei <Html> portals
          mid-frame throws removeChild errors. Visibility is a style toggle. */}
      {/* Both pools stay mounted: swapping drei <Html> portals mid-frame throws
          removeChild errors. Only visibility changes with the active model. */}
      {[...SCAN_ANNOTATIONS, ...ANNOTATIONS].map(a => {
        const isScan = a.id.startsWith('scan-');
        const activePool = (showSI || showUser) ? isScan : !isScan;
        return (
          <Label
            key={a.id}
            show={p.showAnnotations && activePool && a.modes.includes(p.mode)}
            anchor={a.anchor} dir={a.dir}
            title={a.title[p.lang]} body={a.body[p.lang]}
            compact={p.mode !== 'external'}
            prio={a.modes.includes('external') ? 2 : 1}
            register={registerCard}
            onSelect={() => p.onSelect(a.component)}
            onHover={p.setUiPaused}
          />
        );
      })}
    </group>
  );
}

export default function LabScene(p: LabSceneProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [uiPaused, setUiPaused] = useState(false);
  const [points, setPoints] = useState<THREE.Vector3[]>([]);
  const clip = useMemo(() => {
    if (p.mode !== 'cross' || p.section < -0.9) return [];
    return [new THREE.Plane(new THREE.Vector3(0, 0, -1), p.section)];
  }, [p.mode, p.section]);
  const s: SelCtx = {
    selected: p.selected, hover, setHover, onSelect: p.onSelect, measure: p.measure,
    onPoint: pt => setPoints(prev => { const n = [...prev, pt].slice(-2); p.onMeasure(n.length === 2 ? n[0].distanceTo(n[1]) : null); return n; }),
    clip, opacity: p.xray,
  };
  useEffect(() => { setPoints([]); p.onMeasure(null); }, [p.measure]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPoints([]); }, [p.mode]);
  const target = useRef<{ cam: [number, number, number] | null; n: number }>({ cam: null, n: 0 });
  useEffect(() => {
    if (p.view) target.current = { cam: VIEWS[p.view.v], n: p.view.n };
  }, [p.view]);

  return (
    <Canvas
      dpr={DPR[p.quality] as unknown as [number, number]}
      shadows={p.quality !== 'low'}
      camera={{ position: [2.2, 1.6, 3.6], fov: 40, near: 0.05, far: 60 }}
      style={{ touchAction: 'none' }}
      gl={{ localClippingEnabled: true }}
      onCreated={({ gl }) => { gl.localClippingEnabled = true; }}
      onPointerMissed={() => { if (!p.measure) p.onSelect(null); }}
    >
      <color attach="background" args={['#070C16']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.85} color="#FFF6E8" castShadow={p.quality !== 'low'} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-4, 2, -3]} intensity={0.9} color="#6B8DFF" />
      <directionalLight position={[0, -2, 4]} intensity={0.35} color="#53D8E8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[4.4, 56]} /><meshStandardMaterial color="#0A1322" roughness={0.9} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[4.3, 4.37, 72]} /><meshBasicMaterial color="#53D8E8" transparent opacity={0.35} /></mesh>

      <Suit {...p} s={s} setUiPaused={setUiPaused} lang={p.lang ?? 'en'} />

      {p.mode === 'dust' && <Dust rate={p.dustRate} quality={p.quality} levels={p.zoneLevels} onHit={p.onZoneHit} />}
      {/* cross-section plane guide */}
      {p.mode === 'cross' && p.section > -0.9 && (
        <mesh position={[0, 1.1, p.section]}>
          <planeGeometry args={[1.6, 1.6]} />
          <meshBasicMaterial color="#53D8E8" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {points.map((pt, i) => <mesh key={i} position={pt.toArray()}><sphereGeometry args={[0.016, 8, 8]} /><meshBasicMaterial color="#F5B85C" /></mesh>)}
      {points.length === 2 && (
        <group>
          <Line points={[points[0].toArray(), points[1].toArray()]} color="#F5B85C" lineWidth={2} />
          <Html center position={points[0].clone().add(points[1]).multiplyScalar(0.5).toArray()} style={{ pointerEvents: 'none' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#F5B85C', background: 'rgba(7,12,22,0.9)', padding: '2px 6px', borderRadius: 6 }}>
              {points[0].distanceTo(points[1]).toFixed(3)} m
            </span>
          </Html>
        </group>
      )}

      <OrbitControls ref={controls} enableDamping dampingFactor={0.08} autoRotate={p.autoRotate && !uiPaused} autoRotateSpeed={0.7} minDistance={1.1} maxDistance={11} target={[0, 1.05, 0]} maxPolarAngle={1.66} />
      <Rig target={p.fly} controls={controls} />
      {p.labels && <ZoneLabels labelFor={p.labelFor} selected={p.selected} onSelect={p.onSelect} suppress={p.showAnnotations} />}
    </Canvas>
  );
}

/** Compact part labels (ISS-Explorer style labels-on/off). */
function ZoneLabels({ selected, onSelect, labelFor, suppress }: { selected: string | null; onSelect: (id: string) => void; labelFor: (id: string) => string; suppress: boolean }) {
  const SPOTS: [string, [number, number, number]][] = [
    ['helmet-visor', [0, 1.85, 0.16]], ['hut-shoulder', [0.46, 1.48, 0]],
    ['glove-outer', [0.78, 0.56, 0.16]], ['lta-waist', [0, 0.78, 0.24]],
    ['leg-knee', [0.24, 0.36, 0.06]], ['boot-sole', [0.24, 0.03, 0.16]],
    ['hut-hatch', [0, 1.3, -0.5]],
  ];
  const [hover, setHover] = useState<string | null>(null);
  return (
    <>
      {SPOTS.map(([id, pos]) => (
        <Html key={id} center position={pos} zIndexRange={[15, 0]} style={{ visibility: suppress ? 'hidden' : 'visible' }}>
          <button
            onClick={e => { e.stopPropagation(); onSelect(id); }}
            onPointerEnter={() => setHover(id)}
            onPointerLeave={() => setHover(null)}
            className="whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all"
            style={{
              pointerEvents: 'auto', cursor: 'pointer',
              borderColor: selected === id ? '#53D8E8' : 'rgba(107,141,255,0.4)',
              background: selected === id || hover === id ? 'rgba(7,12,22,0.94)' : 'rgba(7,12,22,0.62)',
              color: selected === id ? '#FFFFFF' : '#C9D6F0',
            }}
          >
            {labelFor(id)}
          </button>
        </Html>
      ))}
    </>
  );
}

/** re-export so the page can drive SUIT_PARTS ordering without a new import path */
export const SUIT_COMPONENT_IDS = COMPONENTS.map(s => s.id);
