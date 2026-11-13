'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SUIT_PARTS, type SuitPartId } from '@/data/environment/suit';

export interface SuitSceneProps {
  selected: SuitPartId | null;
  onSelect: (id: SuitPartId) => void;
  explode: number;
  autoRotate: boolean;
  quality: 'low' | 'med' | 'high';
  labelFor: (id: SuitPartId) => string;
}
const DPR = { low: [0.75, 1], med: [1, 1.5], high: [1, 2] } as const;
const RADII = [0.3, 0.345, 0.39, 0.44, 0.485];
const SPREAD = 0.66;
const color = (id: SuitPartId) => SUIT_PARTS.find(p => p.id === id)!.color;

function Part({ id, selected, onSelect, children, label, labelPos }: {
  id: SuitPartId; selected: SuitPartId | null; onSelect: (id: SuitPartId) => void;
  children: (emissive: string, ei: number) => React.ReactNode;
  label: string; labelPos: [number, number, number];
}) {
  const [hover, setHover] = useState(false);
  const sel = selected === id;
  return (
    <group
      onClick={e => { e.stopPropagation(); onSelect(id); }}
      onPointerOver={e => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
    >
      {children('#53D8E8', sel ? 0.5 : hover ? 0.26 : 0)}
      <Html center distanceFactor={3.4} position={labelPos} style={{ pointerEvents: 'none' }}>
        <span style={{ display: sel || hover ? 'inline-block' : 'none', transform: 'translateY(-1.25em)', fontSize: 11, fontWeight: 600, color: '#EAF2FF', background: 'transparent', textShadow: '0 0 2px rgba(4,8,16,0.95), 0 1px 3px rgba(4,8,16,0.85)', whiteSpace: 'nowrap' }}>{label}</span>
      </Html>
    </group>
  );
}

/** Keeps the exploded spread framed: target follows the shell row, distance
 *  re-fits only when the explode value changes (never fights a user zoom). */
function SuitRig({ explode, controls }: { explode: number; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  const adjust = useRef(0);
  useEffect(() => { adjust.current = 1; }, [explode]);
  useEffect(() => {
    const c = controls.current; if (!c) return;
    const stop = () => { adjust.current = 0; };
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, [controls]);
  useFrame(() => {
    const c = controls.current; if (!c) return;
    const tx = explode * 1.25;
    c.target.x += (tx - c.target.x) * 0.08;
    c.target.y += (1.1 - c.target.y) * 0.08;
    if (adjust.current > 0.01) {
      const desired = 3.7 + explode * 2.6;
      const dir = camera.position.clone().sub(c.target);
      const dist = dir.length();
      const nd = dist + (desired - dist) * 0.08;
      camera.position.copy(c.target).add(dir.normalize().multiplyScalar(nd));
      adjust.current *= 0.94;
    }
  });
  return null;
}

function Suit({ selected, onSelect, explode, labelFor }: Omit<SuitSceneProps, 'autoRotate' | 'quality'>) {
  const shells = useMemo(() => SUIT_PARTS.filter(p => p.layer <= 4).sort((a, b) => a.layer - b.layer), []);
  return (
    <group>
      {/* exploded torso shells slide out along +X with guide lines back to the body */}
      {shells.map((p, i) => {
        const x = explode * i * SPREAD;
        const r = RADII[i];
        return (
          <group key={p.id}>
            {i > 0 && explode > 0.04 && (
              <Line points={[[0, 1.15, 0], [x, 1.15, 0]]} color="#53D8E8" lineWidth={1} dashed dashSize={0.06} gapSize={0.05} transparent opacity={0.4} />
            )}
            <group position={[x, 0, 0]}>
              <Part id={p.id} selected={selected} onSelect={onSelect} label={labelFor(p.id)} labelPos={[0, 1.78, 0]}>
                {(em, ei) => (<>
                  <mesh position={[0, 1.15, 0]} castShadow>
                    <cylinderGeometry args={[r * 0.93, r, 0.95, 32, 1, false]} />
                    <meshStandardMaterial
                      color={p.color}
                      roughness={p.id === 'tmg' ? 0.5 : p.id === 'bladder' ? 0.35 : 0.85}
                      metalness={p.id === 'tmg' ? 0.25 : 0.05}
                      emissive={p.id === 'tmg' ? '#241a06' : em}
                      emissiveIntensity={p.id === 'tmg' ? 0.3 + ei : ei}
                      transparent={p.id === 'bladder'} opacity={p.id === 'bladder' ? 0.82 : 1}
                    />
                  </mesh>
                  <mesh position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[r * 0.965, 0.008, 6, 40]} />
                    <meshStandardMaterial color="#0B1322" roughness={0.6} />
                  </mesh>
                </>)}
              </Part>
              {p.id === 'lcvg' && [0.92, 1.15, 1.38].map(y => (
                <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.305, 0.013, 8, 36]} />
                  <meshStandardMaterial color="#7FB3E8" roughness={0.4} />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}

      {/* the body stays assembled at the origin so the exploded layers read as
          garments pulled off one astronaut, not disconnected buckets */}
      <group position={[0, explode * 0.72, 0]}>
        <Part id="helmet" selected={selected} onSelect={onSelect} label={labelFor('helmet')} labelPos={[0, 2.16, 0]}>
          {(em, ei) => (<>
            <mesh position={[0, 1.85, 0]} castShadow><sphereGeometry args={[0.24, 28, 20]} /><meshStandardMaterial color="#E8ECF4" roughness={0.55} emissive={em} emissiveIntensity={ei} /></mesh>
            <mesh position={[0, 1.85, 0.115]}><sphereGeometry args={[0.185, 24, 16]} /><meshStandardMaterial color={color('helmet')} metalness={0.55} roughness={0.22} emissive="#3a2a06" emissiveIntensity={0.35 + ei * 0.5} /></mesh>
            <mesh position={[0, 1.63, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.2, 0.03, 10, 32]} /><meshStandardMaterial color="#9AA6BC" metalness={0.5} roughness={0.4} /></mesh>
          </>)}
        </Part>
      </group>

      <group position={[0, 0, -explode * 1.05]}>
        <Part id="plss" selected={selected} onSelect={onSelect} label={labelFor('plss')} labelPos={[0, 1.8, -0.55]}>
          {(em, ei) => (<>
            <mesh position={[0, 1.25, -0.53]} castShadow><boxGeometry args={[0.5, 0.72, 0.26]} /><meshStandardMaterial color={color('plss')} roughness={0.75} emissive={em} emissiveIntensity={ei} /></mesh>
            <mesh position={[0, 1.5, -0.68]}><boxGeometry args={[0.3, 0.12, 0.06]} /><meshStandardMaterial color="#53D8E8" emissive="#53D8E8" emissiveIntensity={0.4} roughness={0.4} /></mesh>
          </>)}
        </Part>
      </group>

      {([-1, 1] as const).map(side => (
        <group key={side}>
          <mesh position={[side * 0.56, 1.42, 0]} rotation={[0, 0, side * -0.5]} castShadow><capsuleGeometry args={[0.09, 0.42, 4, 12]} /><meshStandardMaterial color="#E8ECF4" roughness={0.85} /></mesh>
          <mesh position={[side * 0.72, 1.02, 0.05]} rotation={[0.3, 0, side * -0.25]} castShadow><capsuleGeometry args={[0.08, 0.36, 4, 12]} /><meshStandardMaterial color="#DFE4EE" roughness={0.85} /></mesh>
          <Part id="joints" selected={selected} onSelect={onSelect} label={labelFor('joints')} labelPos={[side * 0.66, 1.34, 0]}>
            {(em, ei) => (<>
              <mesh position={[side * 0.52, 1.52, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.1, 0.025, 10, 24]} /><meshStandardMaterial color={color('joints')} metalness={0.45} roughness={0.35} emissive={em} emissiveIntensity={ei} /></mesh>
              <mesh position={[side * 0.66, 1.22, 0.03]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.085, 0.022, 10, 24]} /><meshStandardMaterial color={color('joints')} metalness={0.45} roughness={0.35} emissive={em} emissiveIntensity={ei} /></mesh>
              <mesh position={[side * 0.2, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.1, 0.025, 10, 24]} /><meshStandardMaterial color={color('joints')} metalness={0.45} roughness={0.35} emissive={em} emissiveIntensity={ei} /></mesh>
            </>)}
          </Part>
          <group position={[side * explode * 0.5, 0, 0]}>
            <Part id="gloves" selected={selected} onSelect={onSelect} label={labelFor('gloves')} labelPos={[side * 0.8, 0.9, 0.12]}>
              {(em, ei) => (
                <mesh position={[side * 0.8, 0.78, 0.12]} castShadow><sphereGeometry args={[0.095, 16, 14]} /><meshStandardMaterial color={color('gloves')} roughness={0.8} emissive={em} emissiveIntensity={ei} /></mesh>
              )}
            </Part>
          </group>
          <mesh position={[side * 0.2, 0.42, 0]} castShadow><capsuleGeometry args={[0.1, 0.5, 4, 12]} /><meshStandardMaterial color="#E8ECF4" roughness={0.85} /></mesh>
          <group position={[0, -explode * 0.5, 0]}>
            <Part id="boots" selected={selected} onSelect={onSelect} label={labelFor('boots')} labelPos={[side * 0.22, 0.26, 0.1]}>
              {(em, ei) => (
                <mesh position={[side * 0.2, 0.09, 0.05]} castShadow><boxGeometry args={[0.2, 0.16, 0.34]} /><meshStandardMaterial color={color('boots')} roughness={0.9} emissive={em} emissiveIntensity={ei} /></mesh>
              )}
            </Part>
          </group>
        </group>
      ))}
    </group>
  );
}

export default function SuitScene(props: SuitSceneProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  return (
    <Canvas
      dpr={DPR[props.quality] as unknown as [number, number]}
      shadows={props.quality !== 'low'}
      camera={{ position: [2.4, 1.7, 3.7], fov: 40, near: 0.05, far: 60 }}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#070C16']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.8} color="#FFF6E8" castShadow={props.quality !== 'low'} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-4, 2, -3]} intensity={0.9} color="#6B8DFF" />
      <directionalLight position={[0, -2, 4]} intensity={0.35} color="#53D8E8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.2, -0.02, 0]} receiveShadow>
        <circleGeometry args={[4.4, 56]} />
        <meshStandardMaterial color="#0A1322" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.2, -0.01, 0]}>
        <ringGeometry args={[4.3, 4.37, 72]} />
        <meshBasicMaterial color="#53D8E8" transparent opacity={0.35} />
      </mesh>
      <Suit selected={props.selected} onSelect={props.onSelect} explode={props.explode} labelFor={props.labelFor} />
      <OrbitControls ref={controls} enableDamping dampingFactor={0.08} autoRotate={props.autoRotate} autoRotateSpeed={0.8} minDistance={1.6} maxDistance={11} target={[0, 1.1, 0]} maxPolarAngle={1.6} />
      <SuitRig explode={props.explode} controls={controls} />
    </Canvas>
  );
}