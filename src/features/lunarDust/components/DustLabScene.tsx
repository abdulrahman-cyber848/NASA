'use client';
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Line, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { DustEngine, SUIT_ZONES, type ScenarioId } from '../physics/engine';
import { terrainHeight, CRATERS } from '../physics/terrainInteraction';

export interface DustLabProps {
  engine: DustEngine;
  running: boolean;
  vizDensity: number;
  quality: 'low' | 'med' | 'high';
  showField: boolean;
  showTrail: boolean;
  grainScale: number; // visual only
  scenario: ScenarioId;
  suitState: 'clean' | 'exposure' | 'accumulated' | 'mitigation';
  onStats: (live: number, settled: number) => void;
  camera: 'surface' | 'overhead' | 'follow';
  labelZone: (z: string) => string;
}
const DPR = { low: [0.75, 1], med: [1, 1.5], high: [1, 2] } as const;
const CAP = { low: 1500, med: 3500, high: 6000 } as const;

function Terrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(120, 120, 170, 170);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    const base = new THREE.Color('#6E675E'), bg = new THREE.Color('#05080F'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, terrainHeight(x, z));
      const f = THREE.MathUtils.smoothstep(Math.hypot(x, z), 36, 58);
      c.copy(base).multiplyScalar(0.9 + Math.abs(Math.sin(x * 1.3 + z * 0.7)) * 0.15).lerp(bg, f);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const rocks = useMemo(() => {
    const arr: { p: [number, number, number]; s: number; r: number }[] = [];
    for (let i = 0; i < 150; i++) {
      const x = (Math.abs(Math.sin(i * 12.9) * 43758 % 1) * 2 - 1) * 28;
      const z = (Math.abs(Math.sin(i * 78.2) * 12543 % 1) * 2 - 1) * 28;
      if (Math.abs(x) < 7 && Math.abs(z) < 6) continue;
      arr.push({ p: [x, terrainHeight(x, z) + 0.02, z], s: 0.06 + Math.abs(Math.sin(i * 3.7) * 999 % 1) * 0.5, r: i });
    }
    return arr;
  }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const d = new THREE.Object3D();
    rocks.forEach((r, i) => { d.position.set(...r.p); d.scale.setScalar(r.s); d.rotation.set(r.r, r.r * 2, r.r * 0.5); d.updateMatrix(); ref.current!.setMatrixAt(i, d.matrix); });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [rocks]);
  return (
    <>
      <mesh geometry={geo} receiveShadow><meshStandardMaterial color="#fff" vertexColors roughness={1} /></mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, rocks.length]} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#7B746A" roughness={1} flatShading /></instancedMesh>
      {CRATERS.map((c, i) => <mesh key={i} position={[c.x, terrainHeight(c.x, c.z) + 0.01, c.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[c.r * 0.95, c.r * 1.05, 40]} /><meshBasicMaterial color="#3d3a34" transparent opacity={0.5} /></mesh>)}
    </>
  );
}

function Grains({ engine, vizDensity, quality, grainScale, showTrail }: Pick<DustLabProps, 'engine' | 'vizDensity' | 'quality' | 'grainScale' | 'showTrail'>) {
  const cap = CAP[quality];
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colFly = useMemo(() => new THREE.Color('#b8b0a4'), []);
  const colSet = useMemo(() => new THREE.Color('#6b6459'), []);
  const colStuck = useMemo(() => new THREE.Color('#F5B85C'), []);
  const colSel = useMemo(() => new THREE.Color('#53D8E8'), []);
  const trail = useRef<number[]>([]);
  const [trailPts, setTrailPts] = React.useState<[number, number, number][]>([]);
  const tick = useRef(0);
  useFrame(() => {
    const mesh = ref.current; if (!mesh) return;
    const renderCount = Math.floor(cap * vizDensity);
    let drawn = 0;
    const n = engine.params.maxParticles;
    for (let i = 0; i < n && drawn < renderCount; i++) {
      const st = engine.state[i];
      if (st === 0) continue;
      const ix = i * 3;
      dummy.position.set(engine.pos[ix], engine.pos[ix + 1], engine.pos[ix + 2]);
      const s = (st === 1 ? 1 : 0.8) * grainScale;
      dummy.scale.setScalar(s);
      dummy.rotation.set(i, i * 0.7, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(drawn, dummy.matrix);
      mesh.setColorAt(drawn, i === engine.selected ? colSel : st === 1 ? colFly : st === 3 ? colStuck : colSet);
      drawn++;
    }
    mesh.count = drawn;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // selected trail sampled ~15 Hz
    tick.current++;
    if (showTrail && engine.selected >= 0 && tick.current % 4 === 0) {
      const ix = engine.selected * 3;
      trail.current.push(engine.pos[ix], engine.pos[ix + 1], engine.pos[ix + 2]);
      if (trail.current.length > 120) trail.current.splice(0, trail.current.length - 120);
      const pts: [number, number, number][] = [];
      for (let i = 0; i < trail.current.length; i += 3) pts.push([trail.current[i], trail.current[i + 1], trail.current[i + 2]]);
      setTrailPts(pts);
    }
    if (!showTrail && trail.current.length) { trail.current = []; setTrailPts([]); }
  });
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, cap]} frustumCulled={false}>
        <dodecahedronGeometry args={[0.012, 0]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
      {showTrail && trailPts.length > 1 && <Line points={trailPts} color="#53D8E8" lineWidth={1.5} transparent opacity={0.8} />}
    </>
  );
}

function FieldArrows({ engine, show }: { engine: DustEngine; show: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const m = ref.current; if (!m || !show) return;
    const t = clock.elapsedTime; let i = 0;
    for (let gx = 0; gx < 6; gx++) for (let gz = 0; gz < 3; gz++) {
      const x = -4.8 + gx * 0.32, z = -3.4 + gz * 0.4;
      const phase = engine.scenario === 'eds' ? Math.sin(x * 300 - t * 20) : 1;
      dummy.position.set(x, terrainHeight(x, z) + 0.12 + Math.abs(phase) * 0.1, z);
      dummy.rotation.set(0, 0, engine.scenario === 'eds' ? phase * 0.8 : 0);
      dummy.updateMatrix(); m.setMatrixAt(i++, dummy.matrix);
    }
    m.count = i; m.instanceMatrix.needsUpdate = true;
  });
  if (!show) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 18]} frustumCulled={false}>
      <coneGeometry args={[0.02, 0.09, 6]} />
      <meshBasicMaterial color="#53D8E8" transparent opacity={0.7} />
    </instancedMesh>
  );
}

function Actors({ engine, scenario, suitState, labelZone }: Pick<DustLabProps, 'engine' | 'scenario' | 'suitState' | 'labelZone'>) {
  const astro = useRef<THREE.Group>(null);
  const rover = useRef<THREE.Group>(null);
  const zoneRefs = useRef<Record<string, THREE.MeshStandardMaterial | null>>({});
  useFrame(({ clock }) => {
    if (astro.current) { astro.current.position.set(engine.astroX, terrainHeight(engine.astroX, 0), 0); astro.current.rotation.y = engine.astroDir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    if (rover.current) rover.current.position.set(engine.roverX, terrainHeight(engine.roverX, 3.4), 3.4);
    const t = clock.elapsedTime;
    for (const z of SUIT_ZONES) {
      const m = zoneRefs.current[z]; if (!m) continue;
      const hits = engine.zoneHits[z];
      const level = suitState === 'clean' ? 0 : suitState === 'mitigation' ? Math.min(0.25, hits / 400) : Math.min(1, hits / 150);
      m.color.set('#E8ECF4').lerp(new THREE.Color('#8d857a'), level);
      m.emissiveIntensity = suitState === 'mitigation' ? 0.15 + Math.sin(t * 4) * 0.1 : level * 0.25;
    }
  });
  const suit = scenario === 'suit';
  return (
    <group>
      {(scenario === 'footsteps' || suit) && (
        <group ref={astro}>
          {suit ? (
            <group>
              {([['visor', [0, 1.62, 0.1], 0.16], ['exterior', [0, 1.15, 0], 0.3], ['gloves', [0.78, 0.62, 0.12], 0.1], ['gloves', [-0.78, 0.62, 0.12], 0.1], ['boots', [0.15, 0.08, 0.05], 0.12], ['boots', [-0.15, 0.08, 0.05], 0.12], ['joints', [0.5, 1.4, 0], 0.1], ['joints', [-0.5, 1.4, 0], 0.1], ['seals', [0, 1.42, 0], 0.12], ['plss', [0, 1.2, -0.5], 0.3]] as [string, [number, number, number], number][]).map(([z, pos, r], i) => (
                <mesh key={i} position={pos}>
                  <sphereGeometry args={[r, 14, 12]} />
                  <meshStandardMaterial ref={el => { zoneRefs.current[z] = el; }} color="#E8ECF4" roughness={0.85} emissive="#F5B85C" emissiveIntensity={0} />
                </mesh>
              ))}
              <Html center position={[0, 2.05, 0]} style={{ pointerEvents: 'none' }}>
                <span style={{ fontSize: 10, color: '#9EE8F2', textShadow: '0 1px 3px #000', whiteSpace: 'nowrap' }}>{SUIT_ZONES.map(z => `${labelZone(z)}:${engine.zoneHits[z]}`).join(' · ')}</span>
              </Html>
            </group>
          ) : (
            <group>
              <mesh position={[0, 1.1, 0]}><capsuleGeometry args={[0.2, 0.5, 4, 12]} /><meshStandardMaterial color="#E8ECF4" roughness={0.85} /></mesh>
              <mesh position={[0, 1.6, 0]}><sphereGeometry args={[0.16, 16, 12]} /><meshStandardMaterial color="#E8ECF4" roughness={0.6} /></mesh>
              <mesh position={[0.1, 1.6, 0]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color="#D4A017" metalness={0.6} roughness={0.25} /></mesh>
              {([-1, 1] as const).map(sd => <mesh key={sd} position={[sd * 0.12, 0.4, 0]}><capsuleGeometry args={[0.08, 0.5, 4, 8]} /><meshStandardMaterial color="#DFE4EE" roughness={0.85} /></mesh>)}
            </group>
          )}
        </group>
      )}
      {scenario === 'rover' && (
        <group ref={rover}>
          <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.5, 0.28, 1]} /><meshStandardMaterial color="#B9C2D4" metalness={0.5} roughness={0.5} /></mesh>
          {[[-0.55, 0.55], [-0.55, -0.55], [0.55, 0.55], [0.55, -0.55]].map(([x, z], i) => <mesh key={i} position={[x, 0.22, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.22, 0.22, 0.14, 14]} /><meshStandardMaterial color="#4A5568" metalness={0.7} roughness={0.4} wireframe /></mesh>)}
        </group>
      )}
      {scenario === 'plume' && (
        <group position={[6.5, 0, -5]}>
          <mesh position={[0, 2.3, 0]}><coneGeometry args={[0.55, 1, 20, 1, true]} /><meshStandardMaterial color="#6B7688" metalness={0.8} roughness={0.35} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 1.05, 0]}><coneGeometry args={[0.8, 2.1, 20, 1, true]} /><meshBasicMaterial color="#BFE9F2" transparent opacity={0.18} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
        </group>
      )}
      {(scenario === 'adhesion' || scenario === 'eds') && (
        <group position={[-4, 0, -3]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><planeGeometry args={[1.7, 1.1]} /><meshStandardMaterial color="#14243A" emissive="#53D8E8" emissiveIntensity={0.3} roughness={0.4} /></mesh>
          {scenario === 'eds' && [...Array(8)].map((_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-0.75 + i * 0.21, 0.035, 0]}><planeGeometry args={[0.06, 1.05]} /><meshBasicMaterial color={i % 2 ? '#53D8E8' : '#6B8DFF'} transparent opacity={0.8} /></mesh>)}
        </group>
      )}
    </group>
  );
}

function CamRig({ camera, engine, controls }: { camera: DustLabProps['camera']; engine: DustEngine; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera: cam } = useThree();
  const follow = useRef(false);
  useEffect(() => {
    follow.current = camera === 'follow';
    if (camera === 'surface') { cam.position.set(9, 3.6, 10.5); controls.current?.target.set(1.2, 0.8, -1.2); }
    if (camera === 'overhead') { cam.position.set(0.5, 20, 0.6); controls.current?.target.set(0, 0, 0); }
  }, [camera, cam, controls]);
  useFrame(() => {
    if (!follow.current) return;
    cam.position.lerp(new THREE.Vector3(engine.astroX - 3.4, 2.2, 4.6), 0.05);
    controls.current?.target.lerp(new THREE.Vector3(engine.astroX, 1, 0), 0.08);
  });
  return null;
}

function SimDriver({ engine, running, onStats }: { engine: DustEngine; running: boolean; onStats: (l: number, s: number) => void }) {
  const statT = useRef(0);
  useFrame((_, dt) => {
    if (running) engine.advance(dt);
    statT.current += dt;
    if (statT.current > 0.25) { statT.current = 0; const c = engine.counts(); onStats(c.live, c.settled); }
  });
  return null;
}

export default function DustLabScene(p: DustLabProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  return (
    <Canvas dpr={DPR[p.quality] as unknown as [number, number]} shadows={p.quality !== 'low'} camera={{ position: [9, 3.6, 10.5], fov: 42, near: 0.1, far: 220 }} style={{ touchAction: 'none' }}>
      <color attach="background" args={['#05080F']} />
      <Stars radius={90} depth={30} count={2200} factor={3} fade speed={0.4} />
      <ambientLight intensity={0.07} />
      <directionalLight position={[-16, 7, 9]} intensity={2.7} color="#FFF3E0" castShadow={p.quality !== 'low'} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} />
      <directionalLight position={[12, 5, -12]} intensity={0.35} color="#6B8DFF" />
      <mesh position={[-28, 17, -36]}><sphereGeometry args={[1.5, 24, 18]} /><meshStandardMaterial color="#3E7FC1" emissive="#2A5FA8" emissiveIntensity={0.5} /></mesh>
      <SimDriver engine={p.engine} running={p.running} onStats={p.onStats} />
      <Terrain />
      <Grains engine={p.engine} vizDensity={p.vizDensity} quality={p.quality} grainScale={p.grainScale} showTrail={p.showTrail} />
      <FieldArrows engine={p.engine} show={p.showField && (p.scenario === 'eds' || p.scenario === 'adhesion')} />
      <Actors engine={p.engine} scenario={p.scenario} suitState={p.suitState} labelZone={p.labelZone} />
      <OrbitControls ref={controls} enableDamping dampingFactor={0.08} minDistance={2} maxDistance={34} maxPolarAngle={1.52} target={[1.2, 0.8, -1.2]} />
      <CamRig camera={p.camera} engine={p.engine} controls={controls} />
    </Canvas>
  );
}