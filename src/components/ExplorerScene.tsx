'use client';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture, useGLTF, Stars, Html, Line } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { MoonSnapshot } from '@/services/astro';
import { surfaceVector } from '@/services/astro';
import type { EvaluatedLandmark } from '@/services/visibility';
import calibration from '@/data/glb-calibration.json';

export type { SiteMarkers };
export interface ExplorerSettings {
  autoRotate: boolean;
  rotateSpeed: number;
  lighting: 'phase' | 'uniform';
  relief: boolean;
  exaggeration: number;
  markers: boolean;
  labels: boolean;
  quality: 'low' | 'med' | 'high';
  model: 'sphere' | 'glb';
}

export interface FlyTarget { vec: [number, number, number]; nonce: number }

interface Props {
  snap: MoonSnapshot;
  evaluated: EvaluatedLandmark[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  settings: ExplorerSettings;
  fly: FlyTarget | null;
  labelFor: (id: string) => string;
  onGlbError: () => void;
  viewAll?: boolean;
  sites?: EvaluatedLandmark[];
  typeLabel?: (t: string) => string;
}

const DPR: Record<ExplorerSettings['quality'], [number, number]> = { low: [0.75, 1], med: [1, 1.5], high: [1, 2] };
const TMP = new THREE.Vector3();

/** Screen-space label decluttering against MEASURED DOM rects, so it stays
 *  correct at any zoom level and font. Priority decides which label wins a
 *  collision; colliders are hidden, never their markers. */
function declutterLabels(
  els: (HTMLSpanElement | null)[],
  prio: number[],
  key: (i: number) => number,
  keep: (i: number) => boolean,
) {
  type Box = { l: number; r: number; t: number; b: number; p: number; i: number };
  const order: Box[] = [];
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (!el) continue;
    if (!keep(i)) { el.style.display = 'none'; continue; }
    el.style.display = 'inline-block'; // measure at full visibility
    const r = el.getBoundingClientRect();
    order.push({ l: r.left, r: r.right, t: r.top, b: r.bottom, p: prio[i] ?? 0, i });
  }
  order.sort((a, b) => b.p - a.p || key(a.i) - key(b.i));
  const placed: Box[] = [];
  for (const b of order) {
    const pad = 3;
    const hit = placed.some(p => b.l - pad < p.r && p.l < b.r + pad && b.t - pad < p.b && p.t < b.b + pad);
    els[b.i]!.style.display = hit ? 'none' : 'inline-block';
    if (!hit) placed.push(b);
  }
}

function CameraRig({ fly, controls }: { fly: FlyTarget | null; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  const target = useRef<THREE.Vector3 | null>(null);
  useEffect(() => {
    if (!fly) return;
    const dist = camera.position.length();
    target.current = new THREE.Vector3(...fly.vec).normalize().multiplyScalar(Math.max(1.6, Math.min(6, dist)));
  }, [fly, camera]);
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const cancel = () => { target.current = null; };
    c.addEventListener('start', cancel);
    return () => c.removeEventListener('start', cancel);
  }, [controls]);
  useFrame((_, dt) => {
    if (!target.current) return;
    const k = 1 - Math.exp(-dt * 4.5);
    camera.position.lerp(target.current, k);
    camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(target.current) < 0.015) target.current = null;
  });
  return null;
}

function GraySphere() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <sphereGeometry args={[1, 64, 48]} />
      <meshStandardMaterial color="#8a94a8" roughness={1} metalness={0} />
    </mesh>
  );
}

function CalibratedSphere({ settings }: { settings: ExplorerSettings }) {
  // three SphereGeometry: u=0 at (−1,0,0), poles on Y — rotate +90° about X to put
  // the prime meridian on +X, 90°E on +Y and north on +Z (verified against kit probes).
  const maps = useTexture({ map: '/assets/moon-color.jpg', bump: '/assets/moon-elevation.png' });
  useEffect(() => {
    maps.map.colorSpace = THREE.SRGBColorSpace;
    maps.map.anisotropy = 4;
    maps.map.needsUpdate = true;
  }, [maps]);
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <sphereGeometry args={[1, 128, 96]} />
      <meshStandardMaterial
        map={maps.map}
        bumpMap={settings.relief ? maps.bump : null}
        bumpScale={settings.relief ? 0.0045 * settings.exaggeration : 0}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

class GlbBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function NasaModel() {
  const { scene } = useGLTF('/assets/moon-model.glb', false, true);
  const matrix = useMemo(() => {
    // calibration maps body -> glTF; invert to bring the model into the body frame,
    // then normalize center/radius so it matches the calibrated sphere exactly.
    const m = calibration.matrix;
    const rot = new THREE.Matrix4().set(
      m[0], m[1], m[2], 0,
      m[3], m[4], m[5], 0,
      m[6], m[7], m[8], 0,
      0, 0, 0, 1,
    );
    const inv = rot.clone().invert();
    const c = calibration.center;
    const t = new THREE.Matrix4().makeTranslation(-c[0], -c[1], -c[2]);
    const s = new THREE.Matrix4().makeScale(1 / calibration.radius, 1 / calibration.radius, 1 / calibration.radius);
    return s.multiply(inv).multiply(t);
  }, []);
  useEffect(() => {
    scene.traverse(o => {
      if (o instanceof THREE.Mesh) {
        const mat = o.material as THREE.MeshStandardMaterial;
        if (mat && 'roughness' in mat) { mat.roughness = 1; mat.metalness = 0; }
        if (mat?.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.anisotropy = 4; }
      }
    });
  }, [scene]);
  return (
    <group matrix={matrix} matrixAutoUpdate={false}>
      <primitive object={scene} />
    </group>
  );
}

/** Moon-wide site atlas markers: all locations, clickable, with screen-space
 *  label decluttering. Nearby labels never overlap; markers themselves always
 *  stay rendered so no location is ever hidden from the dataset. */
function SiteMarkers({ sites, selectedId, onSelect, labelFor, typeLabel, visible }: {
  sites: EvaluatedLandmark[]; selectedId: string | null; onSelect: (id: string | null) => void;
  labelFor: (id: string) => string; typeLabel: (t: string) => string; visible: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const { camera, size } = useThree();
  const items = useMemo(() => {
    const pts = sites.map(ev => ({ ev, pos: surfaceVector(ev.landmark.lat, ev.landmark.lon) }));
    // Co-located NASA entries (e.g. Apollo 14 sits inside the Fra Mauro Highlands)
    // keep their exact coordinates in the data, but their RENDERED marker gets a
    // small deterministic tangential offset so every marker stays individually
    // clickable at low zoom. This is a display offset only, never a data change.
    const DEG = Math.PI / 180;
    const sep = (a: [number, number, number], b: [number, number, number]) =>
      Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / DEG;
    const placed: [number, number, number][] = [];
    const BUCKET = 0.16; // degrees — closer than this counts as visually coincident
    return pts.map(pt => {
      const near = placed.find(p => sep(p, pt.pos) < BUCKET);
      let out = pt.pos;
      if (near) {
        // offset ~1.6° along a deterministic bearing to clear the crowded marker
        const bearing = (Math.abs(pt.ev.landmark.name.length * 7) % 360) * DEG;
        const north: [number, number, number] = [0, 1, 0];
        const east: [number, number, number] = [
          north[1] * pt.pos[2] - north[2] * pt.pos[1],
          north[2] * pt.pos[0] - north[0] * pt.pos[2],
          north[0] * pt.pos[1] - north[1] * pt.pos[0],
        ];
        const el = Math.hypot(...east) || 1;
        const e: [number, number, number] = [east[0] / el, east[1] / el, east[2] / el];
        const n2: [number, number, number] = [
          pt.pos[1] * e[2] - pt.pos[2] * e[1],
          pt.pos[2] * e[0] - pt.pos[0] * e[2],
          pt.pos[0] * e[1] - pt.pos[1] * e[0],
        ];
        const d = 1.6 * DEG;
        out = [
          pt.pos[0] * Math.cos(d) + (e[0] * Math.cos(bearing) + n2[0] * Math.sin(bearing)) * Math.sin(d),
          pt.pos[1] * Math.cos(d) + (e[1] * Math.cos(bearing) + n2[1] * Math.sin(bearing)) * Math.sin(d),
          pt.pos[2] * Math.cos(d) + (e[2] * Math.cos(bearing) + n2[2] * Math.sin(bearing)) * Math.sin(d),
        ];
      }
      placed.push(out);
      return { ev: pt.ev, pos: out };
    });
  }, [sites]);
  const frame = useRef(0);

  useFrame(() => {
    if (!group.current) return;
    const camDir = camera.position.clone().normalize();
    if (++frame.current % 3 !== 0) return; // throttled: labels are not per-frame critical
    group.current.children.forEach((child, i) => {
      const it = items[i];
      if (!it) return;
      child.visible = it.pos[0] * camDir.x + it.pos[1] * camDir.y + it.pos[2] * camDir.z > 0.03;
    });
    declutterLabels(
      labelRefs.current,
      items.map(it => {
        const id = it.ev.landmark.id;
        return selectedId === id ? 3 : hovered === id ? 2 : Math.min(1, it.ev.landmark.diameterKm / 400);
      }),
      i => Math.hypot(items[i].pos[0] - camDir.x, items[i].pos[1] - camDir.y, items[i].pos[2] - camDir.z),
      i => group.current!.children[i]?.visible === true,
    );
  });

  return (
    <group ref={group} visible={visible}>
      {items.map(({ ev, pos }, idx) => {
        const l = ev.landmark;
        const sel = selectedId === l.id;
        const color = l.type === 'landing' ? '#F87171'
          : l.type === 'crater' ? '#F5B85C'
            : l.type === 'mare' || l.type === 'basin' ? '#53D8E8'
              : l.type === 'mountain' || l.type === 'highlands' ? '#929AFF'
                : l.type === 'dome' ? '#4ADE80' : '#AAB6CC';
        return (
          <group key={l.id} position={[pos[0] * 1.004, pos[1] * 1.004, pos[2] * 1.004]}>
            {/* hit target is generous so dense clusters stay clickable */}
            <mesh
              scale={sel ? 1.8 : hovered === l.id ? 1.45 : 1}
              onClick={e => { e.stopPropagation(); onSelect(sel ? null : l.id); }}
              onPointerOver={e => { e.stopPropagation(); setHovered(l.id); document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { setHovered(h => (h === l.id ? null : h)); document.body.style.cursor = ''; }}
            >
              <sphereGeometry args={[0.016, 10, 10]} />
              <meshBasicMaterial color={sel ? '#F1F5FF' : color} transparent opacity={0.95} />
            </mesh>
            <mesh scale={1}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshBasicMaterial color={sel ? '#F1F5FF' : color} transparent opacity={0.16} depthWrite={false} />
            </mesh>
            <Html center distanceFactor={2.4} style={{ pointerEvents: 'none' }} position={[pos[0] * 0.024, pos[1] * 0.024, pos[2] * 0.024]}>
              <span
                ref={el => { labelRefs.current[idx] = el; }}
                title={`${labelFor(l.id)} — ${typeLabel(l.type)}`}
                style={{
                  display: 'inline-block', transform: 'translateY(-1.2em)',
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
                  color: sel ? '#FFFFFF' : '#E7EEFF', background: 'transparent',
                  textShadow: '0 0 2px rgba(4,8,16,0.98), 0 1px 3px rgba(4,8,16,0.9)',
                  whiteSpace: 'nowrap',
                }}
              >
                {labelFor(l.id)}
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function Markers({ evaluated, selectedId, onSelect, settings, labelFor }: Pick<Props, 'evaluated' | 'selectedId' | 'onSelect' | 'settings' | 'labelFor'>) {
  const group = useRef<THREE.Group>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const items = useMemo(() => evaluated.map(ev => ({
    ev,
    pos: surfaceVector(ev.landmark.lat, ev.landmark.lon),
  })), [evaluated]);
  const { camera, size } = useThree();
  useFrame(() => {
    if (!group.current) return;
    const camDir = camera.position.clone().normalize();
    group.current.children.forEach((child, i) => {
      const it = items[i];
      if (!it) return;
      child.visible = it.pos[0] * camDir.x + it.pos[1] * camDir.y + it.pos[2] * camDir.z > 0.12;
    });
    declutterLabels(
      labelRefs.current,
      items.map(it => {
        const id = it.ev.landmark.id;
        return selectedId === id ? 3 : hovered === id ? 2 : Math.min(1, it.ev.landmark.diameterKm / 400);
      }),
      i => Math.hypot(items[i].pos[0] - camDir.x, items[i].pos[1] - camDir.y, items[i].pos[2] - camDir.z),
      i => group.current!.children[i]?.visible === true,
    );
    void size;
  });

  return (
    <group ref={group}>
      {items.map(({ ev, pos }, idx) => {
        const l = ev.landmark;
        const sel = selectedId === l.id;
        const color = !ev.geoVisible ? '#42506b' : l.type === 'crater' ? '#F5B85C' : '#53D8E8';
        return (
          <group key={l.id} position={[pos[0] * 1.004, pos[1] * 1.004, pos[2] * 1.004]}>
            <mesh
              scale={sel ? 1.5 : hovered === l.id ? 1.25 : 1}
              onClick={e => { e.stopPropagation(); onSelect(sel ? null : l.id); }}
              onPointerOver={e => { e.stopPropagation(); setHovered(l.id); document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { setHovered(h => (h === l.id ? null : h)); document.body.style.cursor = ''; }}
            >
              <sphereGeometry args={[0.0085, 10, 10]} />
              <meshBasicMaterial color={sel ? '#F1F5FF' : color} />
            </mesh>
            {(settings.labels || sel || hovered === l.id) && (
              <Html center distanceFactor={2.2} style={{ pointerEvents: 'none' }} position={[pos[0] * 0.022, pos[1] * 0.022, pos[2] * 0.022]}>
                <span
                  ref={el => { labelRefs.current[idx] = el; }}
                  style={{
                    display: 'inline-block', transform: 'translateY(-1.15em)',
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
                    color: '#EAF2FF', background: 'transparent', padding: 0, border: 'none',
                    textShadow: '0 0 2px rgba(4,8,16,0.95), 0 1px 3px rgba(4,8,16,0.85)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {labelFor(l.id)}
                </span>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

export default function ExplorerScene({ snap, evaluated, selectedId, onSelect, settings, fly, labelFor, onGlbError, viewAll = false, sites = [], typeLabel }: Props) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const initialPos = useMemo<[number, number, number]>(() => {
    const e = snap.earthBody;
    return [e[0] * 3.1, e[1] * 3.1, e[2] * 3.1 + 0.4];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sun = snap.sunBody;

  return (
    <Canvas
      dpr={DPR[settings.quality]}
      camera={{ position: initialPos, fov: 38, near: 0.05, far: 300 }}
      onCreated={({ camera, gl }) => {
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 0, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      onPointerMissed={() => onSelect(null)}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#060B16']} />
      <Stars radius={70} depth={30} count={2600} factor={3.2} saturation={0.1} fade speed={0.5} />

      {settings.lighting === 'phase' ? (
        <>
          <ambientLight intensity={0.08} />
          <directionalLight position={[sun[0] * 12, sun[1] * 12, sun[2] * 12]} intensity={2.7} color="#fff6e8" />
          {/* exaggerated earthshine fill from the Earth direction (labeled in UI) */}
          <directionalLight
            position={[snap.earthBody[0] * 10, snap.earthBody[1] * 10, snap.earthBody[2] * 10]}
            intensity={0.55}
            color="#7d95d9"
          />
        </>
      ) : (
        <>
          <ambientLight intensity={1.9} />
          <directionalLight position={[5, 3, 6]} intensity={0.7} />
          <directionalLight position={[-5, -3, -4]} intensity={0.5} />
        </>
      )}

      <Suspense fallback={<GraySphere />}>
        {settings.model === 'glb' ? (
          <GlbBoundary fallback={<CalibratedSphere settings={settings} />} onError={onGlbError}>
            <NasaModel />
          </GlbBoundary>
        ) : (
          <CalibratedSphere settings={settings} />
        )}
      </Suspense>

      {viewAll && sites.length > 0 && (
        <SiteMarkers sites={sites} selectedId={selectedId} onSelect={onSelect} labelFor={labelFor} typeLabel={typeLabel ?? (t => t)} visible />
      )}
      {!viewAll && <Markers evaluated={evaluated} selectedId={selectedId} onSelect={onSelect} settings={settings} labelFor={labelFor} />}

      <OrbitControls
        ref={controls}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        minDistance={1.45}
        maxDistance={9}
        enablePan={false}
        autoRotate={settings.autoRotate}
        autoRotateSpeed={settings.rotateSpeed}
      />
      <CameraRig fly={fly} controls={controls} />
    </Canvas>
  );
}
