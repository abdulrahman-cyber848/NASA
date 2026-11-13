'use client';
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { LUNAR_G } from '@/services/dustPhysics';

export interface DustSettings {
  density: number; psize: number; walk: number; rover: number; plume: number;
  echarge: boolean; charge: number; speed: number;
  quality: 'low' | 'med' | 'high'; footprints: boolean; paused: boolean;
  camera: 'surface' | 'overhead' | 'follow';
  resetNonce: number; impactNonce: number;
}
const MAX = 9000;
const CAP = { low: 2500, med: 5000, high: 9000 } as const;
const DPR = { low: [0.75, 1], med: [1, 1.5], high: [1, 2] } as const;
const hash = (x: number, z: number) => Math.sin(x * 12.9898 + z * 78.233) * 43758.5453 % 1;

interface Sim {
  pos: Float32Array; vel: Float32Array; life: Float32Array; maxLife: Float32Array;
  kind: Float32Array; col: Float32Array; cursor: number; active: number;
  t: number; ax: number; adir: number; rx: number; stepPhase: number;
  bursts: number; statTimer: number; fpIndex: number; fpTimer: number;
}

function Particles({ s, onStats }: { s: DustSettings; onStats: (n: number) => void }) {
  const sim = useRef<Sim>({
    pos: new Float32Array(MAX * 3).fill(-9999), vel: new Float32Array(MAX * 3),
    life: new Float32Array(MAX), maxLife: new Float32Array(MAX), kind: new Float32Array(MAX),
    col: new Float32Array(MAX * 3), cursor: 0, active: 0, t: 0, ax: 0, adir: 1, rx: -9,
    stepPhase: 0, bursts: 0, statTimer: 0, fpIndex: 0, fpTimer: 0,
  });
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const fpRef = useRef<THREE.InstancedMesh>(null);
  const astroRef = useRef<THREE.Group>(null);
  const roverRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);
  const plumeRef = useRef<THREE.Mesh>(null);
  const plateRef = useRef<THREE.Mesh>(null);
  const lastReset = useRef(s.resetNonce);
  const lastImpact = useRef(s.impactNonce);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cap = CAP[s.quality];

  useEffect(() => {
    if (s.resetNonce !== lastReset.current) {
      lastReset.current = s.resetNonce;
      const m = sim.current;
      m.pos.fill(-9999); m.life.fill(0); m.active = 0; m.cursor = 0; m.ax = 0; m.rx = -9;
      if (fpRef.current) { for (let i = 0; i < 60; i++) { dummy.position.set(0, -999, 0); dummy.updateMatrix(); fpRef.current.setMatrixAt(i, dummy.matrix); } fpRef.current.instanceMatrix.needsUpdate = true; }
    }
  }, [s.resetNonce, dummy]);
  useEffect(() => {
    if (s.impactNonce !== lastImpact.current) { lastImpact.current = s.impactNonce; sim.current.bursts += 1; }
  }, [s.impactNonce]);

  const spawn = (m: Sim, x: number, y: number, z: number, vx: number, vy: number, vz: number, kind: number, lifeS: number) => {
    if (m.active >= cap) return;
    let i = m.cursor; let guard = 0;
    while (m.life[i] > 0 && guard < 40) { i = (i + 1) % cap; guard++; }
    m.cursor = (i + 1) % cap;
    m.pos[i * 3] = x; m.pos[i * 3 + 1] = y; m.pos[i * 3 + 2] = z;
    m.vel[i * 3] = vx; m.vel[i * 3 + 1] = vy; m.vel[i * 3 + 2] = vz;
    m.life[i] = lifeS; m.maxLife[i] = lifeS; m.kind[i] = kind;
    if (kind === 1) { m.col[i * 3] = 0.33; m.col[i * 3 + 1] = 0.85; m.col[i * 3 + 2] = 0.91; }
    else { const g = 0.55 + Math.random() * 0.2; m.col[i * 3] = g; m.col[i * 3 + 1] = g * 0.96; m.col[i * 3 + 2] = g * 0.9; }
  };

  useFrame((_, rawDt) => {
    const m = sim.current;
    const dt = Math.min(rawDt, 0.05) * (s.paused ? 0 : s.speed);
    const rdt = Math.min(rawDt, 0.05);
    m.t += dt;
    // actors
    const walkSpeed = s.walk * 1.4;
    m.ax += m.adir * walkSpeed * dt;
    if (m.ax > 6) { m.ax = 6; m.adir = -1; } if (m.ax < -6) { m.ax = -6; m.adir = 1; }
    m.stepPhase += dt * (2 + s.walk * 5);
    if (astroRef.current) {
      astroRef.current.position.set(m.ax, 0, 0);
      astroRef.current.rotation.y = m.adir > 0 ? Math.PI / 2 : -Math.PI / 2;
      const swing = Math.sin(m.stepPhase) * 0.55 * s.walk;
      const legs = astroRef.current.children;
      if (legs[0]) legs[0].rotation.x = swing;
      if (legs[1]) legs[1].rotation.x = -swing;
    }
    m.rx += s.rover * 3.2 * dt; if (m.rx > 9.5) m.rx = -9.5;
    if (roverRef.current) roverRef.current.position.set(m.rx, 0, 3.6);
    wheelRefs.current.forEach(w => { if (w) w.rotation.z -= s.rover * 6 * dt; });
    if (plumeRef.current) {
      const p = s.plume;
      plumeRef.current.visible = p > 0.02;
      plumeRef.current.scale.set(0.4 + p * 1.1, 1, 0.4 + p * 1.1);
      (plumeRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + p * 0.3;
    }
    if (plateRef.current) {
      const mat = plateRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = s.echarge ? 0.25 + s.charge * 1.4 : 0.05;
    }
    if (dt > 0) {
      // spawn sources (rates ∝ density)
      const D = s.density;
      const nWalk = Math.floor(420 * s.walk * D * dt + Math.random());
      for (let i = 0; i < nWalk; i++) {
        const sp = 0.7 + Math.random() * 1.9 * s.walk;
        const el = (25 + Math.random() * 40) * Math.PI / 180;
        const az = Math.PI + (m.adir > 0 ? Math.PI : 0) + (Math.random() - 0.5) * 1.6;
        spawn(m, m.ax + (Math.random() - 0.5) * 0.3, 0.05, (Math.random() - 0.5) * 0.25,
          sp * Math.cos(el) * Math.cos(az), sp * Math.sin(el), sp * Math.cos(el) * Math.sin(az), 0, 6);
      }
      const nRover = Math.floor(950 * s.rover * D * dt + Math.random());
      for (let i = 0; i < nRover; i++) {
        const sp = 1.2 + Math.random() * 3.4 * s.rover;
        const el = (30 + Math.random() * 35) * Math.PI / 180;
        spawn(m, m.rx - 0.7, 0.08, 3.6 + (Math.random() - 0.5) * 0.9,
          -sp * Math.cos(el), sp * Math.sin(el), (Math.random() - 0.5) * 0.9, 0, 7);
      }
      const nPlume = Math.floor(1600 * s.plume * D * dt + Math.random());
      for (let i = 0; i < nPlume; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 4 + Math.random() * 8 * s.plume;
        const el = (4 + Math.random() * 12) * Math.PI / 180;
        spawn(m, 6.5 + Math.cos(a) * 0.5, 0.05, -5 + Math.sin(a) * 0.5,
          sp * Math.cos(el) * Math.cos(a), sp * Math.sin(el), sp * Math.cos(el) * Math.sin(a), 0, 8);
      }
      if (s.echarge) {
        const nE = Math.floor(140 * s.charge * D * dt + Math.random());
        for (let i = 0; i < nE; i++) {
          spawn(m, -4 + (Math.random() - 0.5) * 1.5, 0.03, -3 + (Math.random() - 0.5) * 0.9,
            (Math.random() - 0.5) * 0.15, 0.05 + Math.random() * 0.2, (Math.random() - 0.5) * 0.15, 1, 9);
        }
      }
      while (m.bursts > 0) {
        m.bursts--;
        const bx = (Math.random() - 0.5) * 8, bz = (Math.random() - 0.5) * 6;
        for (let i = 0; i < 480 * D; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 1 + Math.random() * 5;
          const el = (20 + Math.random() * 55) * Math.PI / 180;
          spawn(m, bx, 0.05, bz, sp * Math.cos(el) * Math.cos(a), sp * Math.sin(el), sp * Math.cos(el) * Math.sin(a), 0, 8);
        }
      }
      // integrate — pure vacuum ballistics
      let active = 0;
      for (let i = 0; i < cap; i++) {
        if (m.life[i] <= 0) continue;
        const ix = i * 3;
        let ay = -LUNAR_G;
        if (m.kind[i] === 1 && m.pos[ix + 1] < 1.3) ay = s.charge * 6.5 - LUNAR_G;
        m.pos[ix] += m.vel[ix] * dt;
        m.pos[ix + 1] += m.vel[ix + 1] * dt + 0.5 * ay * dt * dt;
        m.pos[ix + 2] += m.vel[ix + 2] * dt;
        m.vel[ix + 1] += ay * dt;
        if (m.pos[ix + 1] <= 0.01 && m.vel[ix + 1] < 0) {
          m.pos[ix + 1] = 0.01; m.vel[ix] = 0; m.vel[ix + 2] = 0; m.vel[ix + 1] = 0;
          m.life[i] = Math.min(m.life[i], 0.9); // settled: brief fade then recycle
        }
        m.life[i] -= dt;
        if (m.life[i] <= 0) { m.pos[ix + 1] = -9999; }
        else active++;
      }
      m.active = active;
      // footprints
      m.fpTimer += dt;
      if (s.footprints && s.walk > 0.05 && m.fpTimer > 0.55 / Math.max(0.2, s.walk) && fpRef.current) {
        m.fpTimer = 0;
        const side = m.fpIndex % 2 === 0 ? 0.12 : -0.12;
        dummy.position.set(m.ax - m.adir * 0.2, 0.015, side);
        dummy.rotation.set(-Math.PI / 2, 0, m.adir > 0 ? Math.PI / 2 : -Math.PI / 2);
        dummy.updateMatrix();
        fpRef.current.setMatrixAt(m.fpIndex % 60, dummy.matrix);
        fpRef.current.instanceMatrix.needsUpdate = true;
        m.fpIndex++;
      }
    }
    const g = geoRef.current;
    if (g) {
      (g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (g.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      g.setDrawRange(0, cap);
    }
    m.statTimer += rdt;
    if (m.statTimer > 0.5) { m.statTimer = 0; onStats(m.active); }
  });

  return (
    <>
      <points frustumCulled={false}>
        <bufferGeometry ref={geoRef}>
          <bufferAttribute attach="attributes-position" args={[sim.current.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[sim.current.col, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.035 * s.psize} vertexColors sizeAttenuation transparent opacity={0.95} depthWrite={false} />
      </points>
      <instancedMesh ref={fpRef} args={[undefined, undefined, 60]} frustumCulled={false}>
        <planeGeometry args={[0.3, 0.13]} />
        <meshStandardMaterial color="#3E3A34" roughness={1} />
      </instancedMesh>
      {/* astronaut */}
      <group ref={astroRef}>
        <group position={[0, 0.78, 0.09]}><mesh position={[0, -0.36, 0]} castShadow><capsuleGeometry args={[0.09, 0.55, 4, 8]} /><meshStandardMaterial color="#DFE4EE" roughness={0.85} /></mesh></group>
        <group position={[0, 0.78, -0.09]}><mesh position={[0, -0.36, 0]} castShadow><capsuleGeometry args={[0.09, 0.55, 4, 8]} /><meshStandardMaterial color="#DFE4EE" roughness={0.85} /></mesh></group>
        <mesh position={[0, 1.12, 0]} castShadow><capsuleGeometry args={[0.21, 0.42, 4, 12]} /><meshStandardMaterial color="#E8ECF4" roughness={0.9} /></mesh>
        <mesh position={[0, 1.62, 0]} castShadow><sphereGeometry args={[0.17, 20, 16]} /><meshStandardMaterial color="#E8ECF4" roughness={0.7} /></mesh>
        <mesh position={[0.1, 1.62, 0]}><sphereGeometry args={[0.13, 16, 12]} /><meshStandardMaterial color="#D4A017" metalness={0.9} roughness={0.25} /></mesh>
        <mesh position={[-0.24, 1.15, 0]} castShadow><boxGeometry args={[0.16, 0.5, 0.34]} /><meshStandardMaterial color="#9AA6BC" roughness={0.8} /></mesh>
      </group>
      {/* rover */}
      <group ref={roverRef}>
        <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.5, 0.28, 1]} /><meshStandardMaterial color="#B9C2D4" metalness={0.5} roughness={0.5} /></mesh>
        <mesh position={[0.3, 0.85, 0]}><boxGeometry args={[0.5, 0.4, 0.6]} /><meshStandardMaterial color="#8FA6C8" metalness={0.4} roughness={0.5} /></mesh>
        {[[-0.55, 0.55], [-0.55, -0.55], [0.55, 0.55], [0.55, -0.55]].map(([x, z], i) => (
          <mesh key={i} ref={el => { if (el) wheelRefs.current[i] = el; }} position={[x, 0.22, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.14, 14]} />
            <meshStandardMaterial color="#4A5568" metalness={0.7} roughness={0.4} wireframe />
          </mesh>
        ))}
      </group>
      {/* lander nozzle + plume */}
      <group position={[6.5, 0, -5]}>
        <mesh position={[0, 2.3, 0]}><coneGeometry args={[0.55, 1, 20, 1, true]} /><meshStandardMaterial color="#6B7688" metalness={0.8} roughness={0.35} side={THREE.DoubleSide} /></mesh>
        <mesh ref={plumeRef} position={[0, 1.05, 0]}>
          <coneGeometry args={[0.8, 2.1, 20, 1, true]} />
          <meshBasicMaterial color="#BFE9F2" transparent opacity={0.2} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      {/* charged plate */}
      <mesh ref={plateRef} position={[-4, 0.03, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.7, 1.1]} />
        <meshStandardMaterial color="#14243A" emissive="#53D8E8" emissiveIntensity={0.1} roughness={0.4} metalness={0.3} />
      </mesh>
    </>
  );
}

/** Smooth value noise — regolith reads as rolling powder, not a facet quilt. */
function vnoise(x: number, z: number): number {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const s = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return s(xi, zi) * (1 - u) * (1 - v) + s(xi + 1, zi) * u * (1 - v) + s(xi, zi + 1) * (1 - u) * v + s(xi + 1, zi + 1) * u * v;
}

function Terrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(120, 120, 170, 170);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    const base = new THREE.Color('#6E675E'), bg = new THREE.Color('#05080F'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const h = (vnoise(x * 0.18, z * 0.18) - 0.5) * 0.5
        + (vnoise(x * 0.7, z * 0.7) - 0.5) * 0.16
        + (vnoise(x * 2.3, z * 2.3) - 0.5) * 0.05;
      p.setY(i, h - 0.1);
      // radial fade to the sky color hides the plane edge without fake fog
      const f = THREE.MathUtils.smoothstep(Math.hypot(x, z), 36, 58);
      c.copy(base).multiplyScalar(0.9 + vnoise(x * 1.3, z * 1.3) * 0.2).lerp(bg, f);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const rocks = useMemo(() => {
    const arr: { p: [number, number, number]; s: number; r: number }[] = [];
    for (let i = 0; i < 130; i++) {
      const x = (Math.abs(hash(i, 7)) * 2 - 1) * 26, z = (Math.abs(hash(i, 13)) * 2 - 1) * 26;
      if (Math.abs(x) < 8 && Math.abs(z) < 6) continue;
      arr.push({ p: [x, 0.02, z], s: 0.06 + Math.abs(hash(i, 3)) * 0.4, r: hash(i, 5) * 6 });
    }
    return arr;
  }, []);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!rockRef.current) return;
    const d = new THREE.Object3D();
    rocks.forEach((r, i) => { d.position.set(...r.p); d.scale.setScalar(r.s); d.rotation.set(r.r, r.r * 2, r.r * 0.5); d.updateMatrix(); rockRef.current!.setMatrixAt(i, d.matrix); });
    rockRef.current.instanceMatrix.needsUpdate = true;
  }, [rocks]);
  return (
    <>
      <mesh geometry={geo} receiveShadow><meshStandardMaterial color="#FFFFFF" vertexColors roughness={1} /></mesh>
      <instancedMesh ref={rockRef} args={[undefined, undefined, rocks.length]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#7B746A" roughness={1} flatShading />
      </instancedMesh>
    </>
  );
}

function CameraRig({ mode, controls }: { mode: DustSettings['camera']; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  const follow = useRef(false);
  useEffect(() => {
    follow.current = mode === 'follow';
    if (mode === 'surface') { camera.position.set(9, 3.6, 10.5); controls.current?.target.set(1.2, 0.8, -1.2); }
    if (mode === 'overhead') { camera.position.set(0.5, 20, 0.6); controls.current?.target.set(0, 0, 0); }
  }, [mode, camera, controls]);
  useEffect(() => {
    const c = controls.current; if (!c) return;
    const stop = () => { follow.current = false; };
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, [controls]);
  useFrame(() => {
    if (!follow.current) return;
    const t = performance.now() / 1000;
    const ax = Math.sin(t * 0.15) * 6; // approx astronaut drift; exact pos not critical for framing
    camera.position.lerp(new THREE.Vector3(ax - 3.4, 2.2, 4.6), 0.04);
    controls.current?.target.lerp(new THREE.Vector3(ax, 1, 0), 0.08);
  });
  return null;
}

export default function DustScene({ settings, onStats }: { settings: DustSettings; onStats: (n: number) => void }) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const shadows = settings.quality !== 'low';
  return (
    <Canvas
      dpr={DPR[settings.quality] as unknown as [number, number]}
      shadows={shadows}
      camera={{ position: [9, 3.6, 10.5], fov: 42, near: 0.1, far: 220 }}
      style={{ touchAction: 'none' }}
      gl={{ antialias: settings.quality !== 'low' }}
    >
      <color attach="background" args={['#05080F']} />
      <Stars radius={90} depth={30} count={2400} factor={3} fade speed={0.4} />
      <ambientLight intensity={0.07} />
      <directionalLight
        position={[-16, 7, 9]} intensity={2.7} color="#FFF3E0"
        castShadow={shadows} shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18}
      />
      <directionalLight position={[12, 5, -12]} intensity={0.35} color="#6B8DFF" />
      {/* Earth in the lunar sky */}
      <mesh position={[-28, 17, -36]}>
        <sphereGeometry args={[1.5, 24, 18]} />
        <meshStandardMaterial color="#3E7FC1" emissive="#2A5FA8" emissiveIntensity={0.5} roughness={0.6} />
      </mesh>
      <Terrain />
      <Particles s={settings} onStats={onStats} />
      <OrbitControls ref={controls} enableDamping dampingFactor={0.08} minDistance={2.5} maxDistance={34} maxPolarAngle={1.52} target={[1.2, 0.8, -1.2]} />
      <CameraRig mode={settings.camera} controls={controls} />
    </Canvas>
  );
}