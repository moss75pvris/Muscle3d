import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Bounds, Html, OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
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

const activeColor = new THREE.Color('#e9552c');
const activeEmissive = new THREE.Color('#3d0903');
const skinColor = new THREE.Color('#c77c6d');
const blackColor = new THREE.Color('#000000');
const muscleTones = ['#a54137', '#b14a42', '#98382f', '#aa453b'];

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[_()[\].:/-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function muscleForMesh(name: string) {
  const normalized = normalizeName(name);
  if (/bursa|trochlea|tendon sheath|synovial/.test(normalized)) return undefined;
  if (/fascia|aponeurosis/.test(normalized) && !/tensor fasciae latae/.test(normalized)) return undefined;
  return patterns.find(([, pattern]) => pattern.test(normalized))?.[0];
}

function isConnectiveTissue(name: string) {
  return /fascia|aponeurosis/.test(name) && !/tensor fasciae latae/.test(name);
}

function toneForMesh(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) hash = ((hash << 5) - hash + name.charCodeAt(index)) | 0;
  return muscleTones[Math.abs(hash) % muscleTones.length];
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

function StudioEnvironment({ mobile }: { mobile: boolean }) {
  const { gl, scene, invalidate } = useThree();

  useEffect(() => {
    const room = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(gl);
    const environment = generator.fromScene(room, mobile ? .02 : .045).texture;
    scene.environment = environment;
    scene.environmentIntensity = mobile ? .42 : .78;
    invalidate();

    return () => {
      if (scene.environment === environment) scene.environment = null;
      environment.dispose();
      room.dispose();
      generator.dispose();
    };
  }, [gl, scene, mobile, invalidate]);

  return null;
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
      const normalized = normalizeName(object.name);
      if (normalized.startsWith('muscular system')) {
        decorativeMeshes.push(object);
        return;
      }
      const connectiveTissue = isConnectiveTissue(normalized);
      if (/bursa|tendon sheath|synovial/.test(normalized)) {
        decorativeMeshes.push(object);
        return;
      }
      object.castShadow = false;
      object.receiveShadow = false;
      const muscleGroup = muscleForMesh(object.name);
      const tone = connectiveTissue ? 'connective' : toneForMesh(normalized);
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const clonedMaterials = materials.map((source) => {
        const key = `${source.uuid}:${muscleGroup ?? 'anatomy'}:${tone}`;
        const cached = materialCache.get(key);
        if (cached) return cached;
        const material = !mobile && !connectiveTissue
          ? new THREE.MeshPhysicalMaterial({
            color: tone,
            roughness: .46,
            metalness: 0,
            clearcoat: .22,
            clearcoatRoughness: .58,
            sheen: .18,
            sheenColor: new THREE.Color('#4a0b06'),
            sheenRoughness: .72,
            side: source.side,
          })
          : source.clone() as THREE.MeshStandardMaterial;
        if (connectiveTissue) material.color.set('#d2aa83');
        else material.color.set(tone);
        material.userData.baseColor = material.color.clone();
        material.userData.muscleGroup = muscleGroup;
        material.userData.tissue = connectiveTissue ? 'connective' : 'muscle';
        material.transparent = connectiveTissue;
        material.opacity = connectiveTissue ? mobile ? .3 : .26 : 1;
        material.depthWrite = !connectiveTissue;
        material.roughness = connectiveTissue ? .7 : mobile ? .58 : .46;
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
      const connectiveTissue = material.userData.tissue === 'connective';
      material.color.copy(isActive ? activeColor : base);
      if (focus && !isActive) material.color.lerp(skinColor, connectiveTissue ? .16 : group ? .3 : .4);
      material.transparent = connectiveTissue || Boolean(focus && !isActive);
      material.opacity = connectiveTissue ? mobile ? .3 : .26 : focus && !isActive ? mobile ? .58 : .52 : 1;
      material.depthWrite = !material.transparent;
      material.emissive?.copy(isActive ? activeEmissive : blackColor);
      material.emissiveIntensity = isActive ? .34 : 0;
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
    dpr={mobile ? [1, 1.4] : [1, 1.6]}
    frameloop="demand"
    shadows={false}
    performance={{ min: .5 }}
    gl={{ antialias: !mobile, alpha: false, powerPreference: 'high-performance' }}
    onCreated={({ gl }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = mobile ? 1 : 1.08;
    }}
  >
    <color attach="background" args={['#090a0b']} />
    <fog attach="fog" args={['#090a0b', 5.5, 12]} />
    <StudioEnvironment mobile={mobile} />
    <hemisphereLight args={['#ffe9df', '#111820', mobile ? .95 : .72]} />
    <directionalLight position={[4, 7, 6]} intensity={mobile ? 2.8 : 3.15} color="#fff0e9" />
    <directionalLight position={[-4, 2, -5]} intensity={mobile ? 1.8 : 2.35} color="#7893ad" />
    <pointLight position={[0, -1, 4]} intensity={mobile ? 1.25 : 1.05} color="#ff633b" />
    <Suspense fallback={<LoadingModel />}>
      <Bounds fit clip observe margin={mobile ? .95 : 1.08}>
        <RealAnatomy {...props} mobile={mobile} />
      </Bounds>
    </Suspense>
    <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={.075} minDistance={1.6} maxDistance={8} rotateSpeed={.62} target={[0, .05, 0]} />
  </Canvas>;
}
