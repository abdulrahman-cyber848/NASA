'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader, DRACOLoader, MeshoptDecoder } from 'three-stdlib';
import { saveMesh, loadMesh, clearMesh } from '../services/modelStore';

/**
 * Client-side loader for a user-supplied Smithsonian Armstrong A7L .glb.
 *
 * 3d.si.edu sits behind Cloudflare Turnstile, so this build environment cannot
 * fetch the asset — but the user's own browser can. This component accepts the
 * file they downloaded (Smithsonian page → Download → GLB) and mounts it live,
 * so the real scan is displayed without the asset ever being redistributed.
 *
 * The file never leaves the browser: it is read as an object URL and parsed
 * locally by three.js.
 */

export interface SourceModelHandle {
  clear: () => void;
}

const TARGET_HEIGHT = 1.8; // metres — matches the lab's mannequin stature

/** Scale an arbitrary mesh to a target height and stand it on the floor plane
 *  (y = 0), which is how a suit actually sits — so the existing camera framing,
 *  annotations and turntable all stay valid. */
export function fitToViewport(obj: THREE.Object3D, targetHeight = TARGET_HEIGHT) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetHeight / maxDim;

  // normalise to origin first, so the offset below is applied to a clean shape
  obj.position.sub(center);
  obj.updateMatrixWorld(true);
  obj.scale.setScalar(scale);
  obj.updateMatrixWorld(true);

  // re-measure at the new scale, then lift so the base rests on y = 0
  const after = new THREE.Box3().setFromObject(obj);
  obj.position.y -= after.min.y;
  obj.updateMatrixWorld(true);

  const final = new THREE.Box3().setFromObject(obj);
  const fsize = new THREE.Vector3();
  final.getSize(fsize);
  return { radius: Math.max(fsize.x, fsize.y, fsize.z) / 2, size: fsize, height: fsize.y };
}

/**
 * Loader without a Draco decoder pre-attached: three.js throws
 * "Decoding failed: Not a Draco file" on plain meshes when one is set, so we
 * attach it lazily only after a real compression error, then retry once.
 */
let draco: DRACOLoader | null = null;
// MeshoptDecoder is a factory in three-stdlib; calling it yields the decoder
// instance with its `ready` promise and decode methods.
const meshopt = MeshoptDecoder();
function baseLoader() {
  // Meshopt (EXT_meshopt_compression) is what the Smithsonian exporter emits, so
  // it is attached up-front; three.js ignores it for uncompressed meshes.
  return new GLTFLoader().setMeshoptDecoder(meshopt);
}
function dracoLoader() {
  if (!draco) {
    draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  }
  return draco;
}

export function useUserModel() {
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [bytes, setBytes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [restoring, setRestoring] = useState(true);
  // track the live object URL so every swap/teardown revokes exactly one
  const live = useRef<string | null>(null);

  const swap = useCallback((blob: Blob, label: string) => {
    if (live.current) URL.revokeObjectURL(live.current);
    const u = URL.createObjectURL(blob);
    live.current = u;
    setUrl(u);
    setName(label);
    setBytes(blob.size);
  }, []);

  // Restore a previously supplied mesh so it survives reloads and navigation.
  useEffect(() => {
    let alive = true;
    (async () => {
      const rec = await loadMesh();
      if (!alive) return;
      if (rec) {
        swap(rec.blob, rec.name);
        setPersisted(true);
      }
      setRestoring(false);
    })();
    return () => { alive = false; };
  }, [swap]);

  const accept = useCallback(async (file: File) => {
    setError(null);
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      setError('Please choose a .glb or .gltf file exported from 3d.si.edu.');
      return;
    }
    if (file.size > 250 * 1024 * 1024) {
      setError('That file is over 250 MB — try the Draco-compressed export.');
      return;
    }
    setLoading(true);
    swap(file, file.name);
    // Persisting is best-effort: private mode / quota still leaves it working
    // for this session, and the UI says so instead of failing silently.
    const ok = await saveMesh(file, file.name);
    setPersisted(ok);
    setLoading(false);
  }, [swap]);

  const clear = useCallback(() => {
    if (live.current) URL.revokeObjectURL(live.current);
    live.current = null;
    setUrl(null); setName(null); setBytes(null); setError(null); setPersisted(false);
    void clearMesh();
  }, []);

  useEffect(() => () => {
    if (live.current) URL.revokeObjectURL(live.current);
    live.current = null;
  }, []);

  return { url, name, bytes, error, loading, persisted, restoring, accept, clear };
}

/** Parses the object URL and mounts the mesh, centred and scaled. */
export function UserSuitModel({ url, opacity = 1, clip = [], onSelect }: { url: string; opacity?: number; clip?: THREE.Plane[]; onSelect?: () => void }) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  const [failed, setFailed] = useState(false);
  const { camera } = useThree();

  useEffect(() => {
    let alive = true;
    setObj(null); setFailed(false);
    let l = baseLoader();
    const attempt = (ldr: GLTFLoader, retry: boolean) => {
      ldr.load(
        url,
        gltf => {
          if (!alive) return;
          const scene: THREE.Object3D = (gltf as unknown as { scene: THREE.Object3D }).scene;
          setObj(prev => { if (prev) disposeTree(prev); return scene; });
        },
        undefined,
        err => {
          if (!alive) return;
          const msg = String((err as unknown as Error)?.message ?? err ?? '');
          // Smithsonian exports are often Draco-compressed; plain meshes are not.
          if (retry && /draco|ktx2|extension/i.test(msg)) {
            const withDraco = baseLoader().setDRACOLoader(dracoLoader());
            attempt(withDraco, false);
            return;
          }
          console.warn('[LunaNav] model parse failed', msg);
          setFailed(true);
        },
      );
    };
    attempt(l, true);
    return () => { alive = false; };
  }, [url]);

  // centre + frame once loaded
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!obj || done.current === url) return;
    done.current = url;
    fitToViewport(obj, TARGET_HEIGHT);
    obj.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true;
      const m = o.material as THREE.MeshStandardMaterial;
      if (m?.map) m.map.colorSpace = THREE.SRGBColorSpace;
      if (m) m.needsUpdate = true;
    });
    camera.position.set(1.7, 1.15, 2.9);
    camera.lookAt(0, 0.9, 0);
  }, [obj, url, camera]);

  useEffect(() => {
    if (!obj) return;
    obj.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      for (const material of materials) {
        const mat = material as THREE.MeshStandardMaterial;
        mat.transparent = opacity < 0.999;
        mat.opacity = opacity;
        mat.depthWrite = opacity >= 0.999;
        mat.clippingPlanes = clip.length ? clip : null;
        mat.side = clip.length ? THREE.DoubleSide : THREE.FrontSide;
        mat.needsUpdate = true;
      }
    });
  }, [obj, opacity, clip]);

  // slow turntable so the scan reads as a real object on display
  useFrame((_, dt) => {
    if (obj) obj.rotation.y += dt * 0.12;
  });

  if (failed) return null;
  if (!obj) return null;
  return (
    <group onClick={onSelect}>
      <primitive object={obj} />
    </group>
  );
}

export function disposeTree(o: THREE.Object3D) {
  o.traverse(c => {
    const m = c as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach(x => x.dispose());
    else mat?.dispose();
  });
}

/** File picker + drag-drop surface. Keeps everything client-side. */
export function ModelDropZone({ onFile, name, bytes, error, onClear, lang, persisted, restoring }: {
  onFile: (f: File) => void; name: string | null; bytes: number | null;
  error: string | null; onClear: () => void; lang: 'en' | 'ar';
  persisted?: boolean; restoring?: boolean;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const L = (en: string, ar: string) => (lang === 'ar' ? ar : en);

  return (
    <div className="space-y-2">
      <div
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => {
          e.preventDefault(); setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        onClick={() => input.current?.click()}
        className="rounded-xl border border-dashed p-3 text-center transition-colors cursor-pointer"
        style={{
          borderColor: over ? 'rgba(83,216,232,0.8)' : 'rgba(107,141,255,0.45)',
          background: over ? 'rgba(83,216,232,0.09)' : 'rgba(8,14,27,0.45)',
        }}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') input.current?.click(); }}
        aria-label={L('Upload Smithsonian GLB', 'تحميل نموذج سميثسونيان GLB')}
      >
        <p className="text-[12px] font-semibold text-[#9EE8F2]">
          {L('Drop the Smithsonian .glb here', 'أفلت ملف GLB من سميثسونيان هنا')}
        </p>
        <p className="mt-0.5 text-[10.5px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>
          {L('or click to browse — parsed locally, never uploaded', 'أو انقر للاختيار — يُحلل محليًا ولا يُرفع')}
        </p>
      </div>
      <input ref={input} type="file" accept=".glb,.gltf,model/gltf-binary" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />

      {restoring && !name && (
        <p className="text-[10.5px]" style={{ color: '#5f6f8d' }}>
          {L('Checking for a saved model…', 'جارٍ البحث عن نموذج محفوظ…')}
        </p>
      )}
      {name && (
        <>
          <div className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.07)' }}>
            <span className="chip chip-ok !py-0">{L('Loaded', 'مُحمَّل')}</span>
            <span className="truncate text-[11px] flex-1" title={name}>{name}</span>
            {bytes != null && <span className="font-mono text-[10px]" style={{ color: '#5f6f8d' }}>{(bytes / 1048576).toFixed(1)} MB</span>}
            <button className="opacity-70 hover:opacity-100" onClick={onClear} aria-label={L('Remove model', 'إزالة النموذج')}>✕</button>
          </div>
          <p className="text-[10.5px] leading-relaxed" style={{ color: persisted ? '#86EFAC' : '#F5B85C' }}>
            {persisted
              ? L('Saved in this browser — it stays after reloads. Nothing was uploaded.',
                  'محفوظ في هذا المتصفح — يفضل بعد إعادة التحميل. لم يُرفع أي شيء.')
              : L('Loaded for this session only (browser storage unavailable).',
                  'مُحمَّل لهذه الجلسة فقط (تخزين المتصفح غير متاح).')}
          </p>
        </>
      )}
      {error && <p className="text-[11px]" style={{ color: '#FCA5A5' }}>{error}</p>}
    </div>
  );
}
