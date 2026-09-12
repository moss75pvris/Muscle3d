import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Bounds, Html, OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import type { Muscle } from '../types';

type Props = { selected?: Muscle; onPick: (id: string) => void };
type ModelProps = Props & { mobile: boolean };

const patterns: Array<[string, RegExp]> = [
  ['hamstrings', /biceps femoris|semimembranosus|semitendinosus/],
  ['quadriceps', /rectus femoris|vastus lateralis|vastus medialis|vastus intermedius/],
  ['calves', /gastrocnemius|soleus muscle/],
  ['glutes', /gluteus (maximus|medius|minimus)/],
  ['chest', /pectoralis (major|minor)/],
  ['shoulders', /(part of deltoid|deltoid muscle)/],
  ['triceps', /triceps brachii|anconeus muscle/],
  ['biceps', /biceps brachii|brachialis muscle/],
  ['abs', /rectus abdominis|abdominal oblique|transversus abdominis/],
  ['back', /latissimus dorsi|trapezius muscle|part of trapezius|erector spinae|multifidus/],
];

const activeColor = new THREE.Color('#ff5a1f');
const dimColor = new THREE.Color('#26110c');

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[_()[\].:/-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function muscleForMesh(name: string) {
  const normalized = normalizeName(name);
  if (/fascia|bursa|trochlea/.test(normalized)) return undefined;
  return patterns.find(([, pattern]) => pattern.test(normalized))?.[0];
}

function firstMuscleHit(intersections: Array<{ object: THREE.Object3D }>) {
  for (const hit of intersections) {
    const group = hit.object.userData.muscleGroup as string | undefined;
    if (group) return group;
  }
  return undefined;
}

function LoadingModel() {
  const { progress } = useProgress();
  return <Html center className="model-loader">
    <span>{Math.round(progress)}%</span>
    <p>CHARGEMENT DE L’ATLAS ANATOMIQUE</p>
  </Html>;
}

function RealAnatomy({ selected, onPick, mobile }: ModelProps) {
  const { scene } = useGLTF('/models/muscular.glb', '/draco/');
  const { invalidate, camera, gl } = useThree();

  const model = useMemo(() => {
    const clone = scene.clone(true);
    const decorativeMeshes: THREE.Object3D[] = [];
    const materialCache = new Map<string, THREE.MeshStandardMaterial>();
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.visible) return;
      if (normalizeName(object.name).startsWith('muscular system')) {
        decorativeMeshes.push(object);
        return;
      }
      if (/fascia|bursa|tendon sheath|synovial|aponeurosis/.test(normalizeName(object.name))) {
        decorativeMeshes.push(object);
        return;
      }
      object.castShadow = false;
      object.receiveShadow = false;
      const muscleGroup = muscleForMesh(object.name);
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const clonedMaterials = materials.map((source) => {
        const key = `${source.uuid}:${muscleGroup ?? 'anatomy'}`;
        const cached = materialCache.get(key);
        if (cached) return cached;
        const material = source.clone() as THREE.MeshStandardMaterial;
        material.userData.baseColor = material.color?.clone() ?? new THREE.Color('#8c2d20');
        material.userData.muscleGroup = muscleGroup;
        material.transparent = false;
        material.opacity = 1;
        material.roughness = .62;
        material.metalness = 0;
        materialCache.set(key, material);
        return material;
      });
      object.material = Array.isArray(object.material) ? clonedMaterials : clonedMaterials[0];
      object.userData.muscleGroup = muscleGroup;
    });
    decorativeMeshes.forEach((object) => object.removeFromParent());
    clone.userData.optimizedMaterials = [...materialCache.values()];
    return clone;
  }, [scene, mobile]);

  useEffect(() => {
    const focus = selected?.id;
    const materials = model.userData.optimizedMaterials as THREE.MeshStandardMaterial[];
    materials.forEach((material) => {
      const group = material.userData.muscleGroup as string | undefined;
      const isActive = Boolean(focus && group === focus);
      const base = (material.userData.baseColor as THREE.Color | undefined) ?? material.color.clone();
      material.color.copy(isActive ? activeColor : base);
      if (focus && !isActive) material.color.lerp(dimColor, group ? .38 : .52);
      material.emissive?.set(isActive ? '#4c1004' : '#000000');
      material.emissiveIntensity = isActive ? .72 : 0;
      material.needsUpdate = true;
    });
    invalidate();
  }, [model, selected, invalidate]);

  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let press: { x: number; y: number; id: number } | undefined;

    const pointerDown = (event: PointerEvent) => { press = { x: event.clientX, y: event.clientY, id: event.pointerId }; };
    const pointerUp = (event: PointerEvent) => {
      if (!press || press.id !== event.pointerId || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 9) {
        press = undefined;
        return;
      }
      press = undefined;
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const group = firstMuscleHit(raycaster.intersectObject(model, true));
      if (group) onPick(group);
    };
    const cancel = () => { press = undefined; };

    canvas.addEventListener('pointerdown', pointerDown, { passive: true });
    canvas.addEventListener('pointerup', pointerUp, { passive: true });
    canvas.addEventListener('pointercancel', cancel, { passive: true });
    return () => {
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', cancel);
    };
  }, [camera, gl, model, onPick]);

  return <primitive object={model} />;
}

useGLTF.preload('/models/muscular.glb', '/draco/');

export function Anatomy(props: Props) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 900px), (pointer: coarse)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px), (pointer: coarse)');
    const update = () => setMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return <Canvas
    camera={{ position: [0, .15, 5], fov: mobile ? 39 : 35 }}
    dpr={mobile ? 1 : [1, 1.25]}
    frameloop="demand"
    shadows={false}
    performance={{ min: .5 }}
    gl={{ antialias: !mobile, alpha: false, powerPreference: 'high-performance' }}
  >
    <color attach="background" args={['#090a0b']} />
    <fog attach="fog" args={['#090a0b', 5.5, 12]} />
    <hemisphereLight args={['#ffe9df', '#151a20', 1.35]} />
    <directionalLight position={[4, 7, 6]} intensity={3.4} color="#fff0e9" />
    <directionalLight position={[-4, 2, -5]} intensity={2.2} color="#7893ad" />
    <pointLight position={[0, -1, 4]} intensity={1.6} color="#ff4e20" />
    <Suspense fallback={<LoadingModel />}>
      <Bounds fit clip observe margin={mobile ? .95 : 1.08}>
        <RealAnatomy {...props} mobile={mobile} />
      </Bounds>
    </Suspense>
    <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={.075} minDistance={1.6} maxDistance={8} rotateSpeed={.62} target={[0, .05, 0]} />
  </Canvas>;
}
