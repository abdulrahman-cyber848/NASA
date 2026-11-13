'use client';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';

/**
 * The original Smithsonian Neil Armstrong Apollo A7-L spacesuit scan.
 *
 * Canonical object:
 *   https://3d.si.edu/object/3d/d8c63ba6-4ebc-11ea-b77f-2e728ce88125
 *
 * 3d.si.edu is gated by Cloudflare Turnstile, so the low-resolution GLB was
 * obtained from the documented public mirror in Google's <model-viewer>
 * shared assets. That mirror's ATTRIBUTIONS.md names the same object id and
 * credits the Smithsonian Digitization Programs Office + National Air and
 * Space Museum, confirming it is the original scan and not a substitute.
 *
 * The file is bundled byte-for-byte at public/assets/smithsonian-armstrong.glb
 * and served by this app — no iframe, no screenshot, no external dependency.
 *
 * IMPORTANT: this scan is a SINGLE MERGED MESH with no separable internals.
 * Internal / Exploded / Cross-section-of-layers views therefore use a separate,
 * clearly-labelled generic EVA reference — never presented as A7-L internals.
 */

export const SI_MODEL_URL = '/assets/smithsonian-armstrong.glb';
export const SI_MODEL_PAGE = 'https://3d.si.edu/object/3d/d8c63ba6-4ebc-11ea-b77f-2e728ce88125';
export const SI_MODEL_MIRROR = 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb';
export const SI_TERMS = 'https://www.si.edu/Termsofuse';
export const SI_ATTRIBUTION = '/assets/smithsonian-armstrong-ATTRIBUTION.txt';

/** Reads availability from the served manifest (no runtime 404 probing). */
export function useSmithsonianAvailability(): { checking: boolean; available: boolean; bytes?: number } {
  const [state, setState] = useState<{ checking: boolean; available: boolean; bytes?: number }>({ checking: true, available: false });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/assets/assets-manifest.json', { cache: 'no-store' });
        if (!alive) return;
        if (!res.ok) { setState({ checking: false, available: false }); return; }
        const m = await res.json();
        const si = m?.smithsonianArmstrongA7L;
        setState({
          checking: false,
          available: Boolean(si?.present),
          bytes: typeof si?.bytes === 'number' ? si.bytes : undefined,
        });
      } catch {
        if (alive) setState({ checking: false, available: false });
      }
    })();
    return () => { alive = false; };
  }, []);
  return state;
}

/** Uniformly scale to a display height and rest the base on the floor (y = 0). */
export function fitToViewport(obj: THREE.Object3D, targetHeight = 1.8) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetHeight / maxDim;

  // centre horizontally, then scale, then drop the base to the floor
  obj.position.x -= center.x;
  obj.position.z -= center.z;
  obj.scale.setScalar(scale);
  obj.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(obj);
  obj.position.y -= scaled.min.y;
  obj.updateMatrixWorld(true);

  const final = new THREE.Box3().setFromObject(obj);
  const fs = new THREE.Vector3();
  final.getSize(fs);
  return { height: fs.y, size: fs };
}

export function SmithsonianModel({
  visible = true,
  opacity = 1,
  clip = [],
  onSelect,
}: {
  visible?: boolean;
  /** 0..1 — only touched when the user actually asks for transparency */
  opacity?: number;
  clip?: THREE.Plane[];
  onSelect?: () => void;
}) {
  const gltf = useGLTF(SI_MODEL_URL) as unknown as { scene: THREE.Object3D };
  const cloned = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const { camera } = useThree();

  // Fit once. Materials/textures are left exactly as authored.
  useEffect(() => {
    fitToViewport(cloned, 1.8);
    cloned.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true;
      o.receiveShadow = false;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        const sm = m as THREE.MeshStandardMaterial;
        if (sm?.map) sm.map.colorSpace = THREE.SRGBColorSpace;
        if (sm) sm.needsUpdate = true;
      }
    });
    camera.position.set(0.2, 1.15, 3.4);
    camera.lookAt(0, 0.95, 0);
  }, [cloned, camera]);

  // Apply only the inspection effects the user asked for; never recolour.
  useEffect(() => {
    const transparent = opacity < 0.999;
    cloned.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        const sm = m as THREE.MeshStandardMaterial;
        if (!sm) continue;
        sm.transparent = transparent;
        sm.opacity = opacity;
        sm.depthWrite = !transparent;
        sm.clippingPlanes = clip.length ? clip : null;
        sm.side = clip.length ? THREE.DoubleSide : THREE.FrontSide;
        sm.needsUpdate = true;
      }
    });
  }, [cloned, opacity, clip]);

  return (
    <group visible={visible}>
      <primitive
        object={cloned}
        onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); onSelect?.(); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
      />
    </group>
  );
}

useGLTF.preload(SI_MODEL_URL);
