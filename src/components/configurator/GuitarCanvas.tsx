'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bounds, Center, ContactShadows, Environment, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigStore } from '@/store/configStore'
import { BODY_SHAPES, FINISHES, FRETBOARDS, HARDWARE_COLORS, NECK_WOODS, PICKGUARDS } from '@/lib/configurator-options'

const MODEL_TARGET_SIZE: Record<string, number> = {
  cello: 4.8,
  banjo: 4.4,
  baritone: 4.6,
  default: 4.25,
}

const MODEL_ROTATION: Record<string, [number, number, number]> = {
  'semi-hollow': [0, Math.PI / 2, 0],
  resonator: [Math.PI / 2, 0, 0],
}

const CAMERA_DISTANCE: Record<string, number> = {
  cello: 8.4,
  baritone: 7.6,
  banjo: 7.2,
  'jazz-hollow': 7.1,
  classical: 7.1,
  resonator: 7.2,
  default: 6.4,
}

type MeshPart = 'BODY' | 'NECK' | 'FRETBOARD' | 'PICKGUARD' | 'HARDWARE' | 'PICKUPS'
type MaterialRole = 'body' | 'neck' | 'hardware' | 'strings' | 'pickguard' | 'pickups' | 'fretboard' | 'other'

const MODEL_PATHS = BODY_SHAPES.map(shape => shape.modelPath).filter(Boolean) as string[]
MODEL_PATHS.forEach(path => useGLTF.preload(path))

type FinishOption = {
  id?: string
  hex?: string
  roughness?: number
  finishStyle?: 'solid' | 'burst'
  burstEdgeHex?: string
}

type WoodOption = { id: string }
type BoardOption = { id: string; hex?: string }
type HardwareOption = { id: string }
type PickguardOption = { id: string; hex?: string }

const NECK_COLORS: Record<string, string> = {
  maple: '#F2D49B',
  mahogany: '#8B4513',
  walnut: '#5C3317',
  roasted: '#C68642',
}

const FRETBOARD_COLORS: Record<string, string> = {
  rosewood: '#3D1C02',
  ebony: '#1A0A00',
  maple: '#F2D49B',
  pau: '#3A1800',
}

const PICKGUARD_FINISHES: Record<string, { color: string; roughness: number }> = {
  white: { color: '#F2EEE2', roughness: 0.34 },
  black: { color: '#111114', roughness: 0.38 },
  parchment: { color: '#E8DCC2', roughness: 0.36 },
  tortoise: { color: '#5A2418', roughness: 0.4 },
}

const HARDWARE_FINISHES: Record<string, { color: string; metalness: number; roughness: number }> = {
  nickel: { color: '#C8C8C8', metalness: 0.8, roughness: 0.3 },
  chrome: { color: '#E8E8E8', metalness: 1.0, roughness: 0.1 },
  gold: { color: '#CFB53B', metalness: 0.9, roughness: 0.2 },
  black: { color: '#1A1A1A', metalness: 0.7, roughness: 0.4 },
  'aged-brass': { color: '#B08D57', metalness: 0.85, roughness: 0.28 },
}

function blendHexColors(from: string, to: string, amount: number) {
  return `#${new THREE.Color(from).lerp(new THREE.Color(to), amount).getHexString()}`
}

function makeColors(finish?: FinishOption, neck?: WoodOption, board?: BoardOption, hw?: HardwareOption, pickguard?: PickguardOption) {
  const neckColor = NECK_COLORS[neck?.id ?? ''] ?? NECK_COLORS.mahogany
  const boardColor = FRETBOARD_COLORS[board?.id ?? ''] ?? board?.hex ?? FRETBOARD_COLORS.ebony
  const isDarkBoard = boardColor !== FRETBOARD_COLORS.maple
  const hardware = HARDWARE_FINISHES[hw?.id ?? ''] ?? HARDWARE_FINISHES.nickel
  const pickguardFinish = PICKGUARD_FINISHES[pickguard?.id ?? ''] ?? PICKGUARD_FINISHES.white

  return {
    finish: finish?.hex ?? '#D4B896',
    finishId: finish?.id,
    finishStyle: finish?.finishStyle ?? 'solid',
    burstEdge: finish?.burstEdgeHex,
    finishRoughness: finish?.roughness ?? 0.18,
    neck: neckColor,
    visibleWood: blendHexColors(neckColor, boardColor, isDarkBoard ? 0.42 : 0.16),
    board: boardColor,
    hardware: hardware.color,
    hardwareMetalness: hardware.metalness,
    hardwareRoughness: hardware.roughness,
    strings: '#DDE2EA',
    pickguard: pickguard?.hex ?? pickguardFinish.color,
    pickguardRoughness: pickguardFinish.roughness,
  }
}

function makeBaseMaterial(name: string, envMapIntensity = 1.55) {
  const mat = new THREE.MeshStandardMaterial({ name })
  mat.envMapIntensity = envMapIntensity
  return mat
}

function burstStops(colors: ReturnType<typeof makeColors>) {
  if (colors.finishId === 'sunburst') {
    return {
      center: new THREE.Color('#F5E4A0'),
      middle: new THREE.Color('#D4903A'),
      edge: new THREE.Color(colors.burstEdge ?? '#0A0300'),
    }
  }
  if (colors.finishId === 'burst-cherry') {
    return {
      center: new THREE.Color('#E03040'),
      middle: new THREE.Color(colors.finish),
      edge: new THREE.Color('#050000'),
    }
  }
  return {
    center: new THREE.Color(colors.finish).addScalar(0.3),
    middle: new THREE.Color(colors.finish),
    edge: new THREE.Color(colors.burstEdge ?? '#0A0300'),
  }
}

function makeBodyMaterial(colors: ReturnType<typeof makeColors>, mesh?: THREE.Mesh) {
  const mat = makeBaseMaterial('BODY_config_material', 1.8)
  if (colors.finishStyle === 'burst') {
    mat.color = new THREE.Color('#FFFFFF')
    mat.map = null
    if (mesh?.geometry) {
      const geometry = mesh.geometry
      geometry.computeBoundingBox()
      const bounds = geometry.boundingBox ?? new THREE.Box3().setFromObject(mesh)
      const size = bounds.getSize(new THREE.Vector3())
      const axes = [0, 1, 2].sort((a, b) => size.getComponent(b) - size.getComponent(a))
      const axisU = new THREE.Vector3().setComponent(axes[0], 1)
      const axisV = new THREE.Vector3().setComponent(axes[1], 1)
      const stops = burstStops(colors)

      mat.onBeforeCompile = shader => {
        shader.uniforms.bodyBoundsMin = { value: bounds.min.clone() }
        shader.uniforms.bodyBoundsMax = { value: bounds.max.clone() }
        shader.uniforms.bodyBurstAxisU = { value: axisU }
        shader.uniforms.bodyBurstAxisV = { value: axisV }
        shader.uniforms.bodyBurstCenter = { value: stops.center }
        shader.uniforms.bodyBurstMiddle = { value: stops.middle }
        shader.uniforms.bodyBurstEdge = { value: stops.edge }
        shader.vertexShader = `varying vec3 vBodyLocalPosition;\n${shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n  vBodyLocalPosition = position;'
        )}`
        shader.fragmentShader = `
uniform vec3 bodyBoundsMin;
uniform vec3 bodyBoundsMax;
uniform vec3 bodyBurstAxisU;
uniform vec3 bodyBurstAxisV;
uniform vec3 bodyBurstCenter;
uniform vec3 bodyBurstMiddle;
uniform vec3 bodyBurstEdge;
varying vec3 vBodyLocalPosition;
${shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
  vec3 bodySize = max(bodyBoundsMax - bodyBoundsMin, vec3(0.0001));
  vec2 bodyUv = vec2(
    (dot(vBodyLocalPosition, bodyBurstAxisU) - dot(bodyBoundsMin, bodyBurstAxisU)) / max(dot(bodySize, bodyBurstAxisU), 0.0001),
    (dot(vBodyLocalPosition, bodyBurstAxisV) - dot(bodyBoundsMin, bodyBurstAxisV)) / max(dot(bodySize, bodyBurstAxisV), 0.0001)
  );
  float bodyBurstDistance = distance(bodyUv, vec2(0.5, 0.5));
  vec3 bodyBurstColor = mix(bodyBurstCenter, bodyBurstMiddle, smoothstep(0.12, 0.42, bodyBurstDistance));
  bodyBurstColor = mix(bodyBurstColor, bodyBurstEdge, smoothstep(0.42, 0.72, bodyBurstDistance));
  diffuseColor.rgb *= bodyBurstColor;`
        )}`
      }
      mat.customProgramCacheKey = () => `body-burst-${colors.finishId}-${colors.finish}-${colors.burstEdge}-${axes.join('')}`
    }
  } else {
    mat.color = new THREE.Color(colors.finish)
    mat.map = null
  }
  mat.metalness = 0.04
  mat.roughness = Math.min(colors.finishRoughness ?? 0.24, 0.24)
  mat.needsUpdate = true
  return mat
}

function makeHardwareMaterial(colors: ReturnType<typeof makeColors>) {
  const mat = makeBaseMaterial('HARDWARE_config_material', 1.8)
  mat.color = new THREE.Color(colors.hardware)
  mat.metalness = colors.hardwareMetalness
  mat.roughness = colors.hardwareRoughness
  mat.needsUpdate = true
  return mat
}

function makeNeckMaterial(colors: ReturnType<typeof makeColors>) {
  const mat = makeBaseMaterial('NECK_config_material', 1.4)
  mat.color = new THREE.Color(colors.neck)
  mat.metalness = 0.02
  mat.roughness = 0.44
  mat.needsUpdate = true
  return mat
}

function makeFretboardMaterial(colors: ReturnType<typeof makeColors>) {
  const mat = makeBaseMaterial('FRETBOARD_config_material', 1.4)
  mat.color = new THREE.Color(colors.board)
  mat.metalness = 0.02
  mat.roughness = 0.48
  mat.needsUpdate = true
  return mat
}

function makePickguardMaterial(colors: ReturnType<typeof makeColors>) {
  const mat = makeBaseMaterial('PICKGUARD_config_material', 1.35)
  mat.color = new THREE.Color(colors.pickguard)
  mat.metalness = 0.02
  mat.roughness = colors.pickguardRoughness
  mat.needsUpdate = true
  return mat
}

function makePickupMaterial() {
  const mat = makeBaseMaterial('PICKUPS_config_material', 1.5)
  mat.color = new THREE.Color('#101014')
  mat.metalness = 0.22
  mat.roughness = 0.32
  mat.needsUpdate = true
  return mat
}

function makeStringMaterial(colors: ReturnType<typeof makeColors>) {
  const mat = makeBaseMaterial('STRINGS_config_material', 1.8)
  mat.color = new THREE.Color(colors.strings)
  mat.metalness = 0.7
  mat.roughness = 0.26
  mat.needsUpdate = true
  return mat
}

const PART_TOKENS: Record<MeshPart, string[]> = {
  BODY: ['body', 'guitarbody'],
  NECK: ['neck', 'neckblank', 'neckprofile'],
  FRETBOARD: ['fretboard', 'fingerboard', 'board'],
  PICKGUARD: ['pickguard', 'scratchplate'],
  HARDWARE: ['hardware', 'bridge', 'tuner', 'tuners', 'saddle', 'saddles', 'knob', 'knobs', 'pot', 'control', 'switch', 'jack', 'plate', 'screw', 'screwhole', 'bolt', 'metal', 'chrome'],
  PICKUPS: ['pickup', 'pickups', 'humbucker', 'singlecoil', 'singlecoilcutout', 'p90'],
}

function canonicalName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeMeshPart(...names: (string | undefined)[]): MeshPart | undefined {
  const normalized = names.map(name => canonicalName(name ?? '')).filter(Boolean)
  for (const part of ['PICKGUARD', 'PICKUPS', 'FRETBOARD', 'NECK', 'HARDWARE', 'BODY'] as MeshPart[]) {
    if (normalized.some(name => PART_TOKENS[part].some(token => name.includes(token)))) {
      return part
    }
  }
  return undefined
}

function roleFromMaterialName(materialName: string): MaterialRole {
  const part = normalizeMeshPart(materialName)
  if (part === 'BODY') return 'body'
  if (part === 'NECK') return 'neck'
  if (part === 'FRETBOARD') return 'fretboard'
  if (part === 'PICKGUARD') return 'pickguard'
  if (part === 'HARDWARE') return 'hardware'
  if (part === 'PICKUPS') return 'pickups'
  const name = canonicalName(materialName)
  if (name.includes('string') || name.includes('cordas')) return 'strings'
  if (name.includes('wood') || name.includes('madeira') || name.includes('oak')) return 'neck'
  if (name.includes('plastic')) return 'pickguard'
  return 'other'
}

function materialForRole(role: MaterialRole, colors: ReturnType<typeof makeColors>, mesh?: THREE.Mesh) {
  if (role === 'body') return makeBodyMaterial(colors, mesh)
  if (role === 'neck') return makeNeckMaterial(colors)
  if (role === 'fretboard') return makeFretboardMaterial(colors)
  if (role === 'pickguard') return makePickguardMaterial(colors)
  if (role === 'hardware') return makeHardwareMaterial(colors)
  if (role === 'pickups') return makePickupMaterial()
  if (role === 'strings') return makeStringMaterial(colors)
  return null
}

function assignMaterial(mesh: THREE.Mesh, material: THREE.Material) {
  mesh.material = Array.isArray(mesh.material) ? mesh.material.map(() => material.clone()) : material
}

function applyFallbackMaterials(mesh: THREE.Mesh, colors: ReturnType<typeof makeColors>) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  const updated = materials.map(source => {
    const role = roleFromMaterialName(source?.name ?? '')
    return materialForRole(role, colors, mesh) ?? source
  })
  mesh.material = Array.isArray(mesh.material) ? updated : updated[0]
}

function mapMeshParts(root: THREE.Object3D) {
  const parts = new Map<MeshPart, THREE.Mesh[]>()
  root.traverse(obj => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    const materialNames = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(mat => mat?.name)
    const part = normalizeMeshPart(mesh.name, mesh.parent?.name, ...materialNames)
    if (!part) return
    const meshes = parts.get(part) ?? []
    meshes.push(mesh)
    parts.set(part, meshes)
  })
  return parts
}

function GlbInstrument({ view }: { view: 'standard' | 'detail' }) {
  const store = useConfigStore()
  const shape = BODY_SHAPES.find(s => s.id === store.shape) ?? BODY_SHAPES[0]
  const finish = FINISHES.find(f => f.id === store.finish)
  const neck = NECK_WOODS.find(n => n.id === store.neck)
  const board = FRETBOARDS.find(f => f.id === store.fretboard)
  const pickguard = PICKGUARDS.find(p => p.id === store.pickguard)
  const hw = HARDWARE_COLORS.find(h => h.id === store.hardware)
  const modelPath = shape.modelPath ?? BODY_SHAPES[0].modelPath!
  const { scene } = useGLTF(modelPath)
  const { model, center, scale, parts } = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse(obj => {
      if (!(obj as THREE.Mesh).isMesh) return
      const mesh = obj as THREE.Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z) || 1
    const targetSize = MODEL_TARGET_SIZE[shape.id] ?? MODEL_TARGET_SIZE.default
    return { model: clone, center, scale: targetSize / maxDimension, parts: mapMeshParts(clone) }
  }, [scene, shape.id])
  const colors = useMemo(() => makeColors(finish, neck, board, hw, pickguard), [board, finish, hw, neck, pickguard])

  useEffect(() => {
    const assignedMeshes = new Set<THREE.Mesh>()
    parts.forEach((meshes, part) => {
      meshes.forEach(mesh => {
        const material = part === 'BODY'
          ? makeBodyMaterial(colors, mesh)
          : part === 'NECK'
            ? makeNeckMaterial(colors)
            : part === 'FRETBOARD'
              ? makeFretboardMaterial(colors)
              : part === 'PICKGUARD'
                ? makePickguardMaterial(colors)
                : part === 'HARDWARE'
                  ? makeHardwareMaterial(colors)
                  : makePickupMaterial()
        assignMaterial(mesh, material)
        assignedMeshes.add(mesh)
      })
    })

    model.traverse(obj => {
      if (!(obj as THREE.Mesh).isMesh) return
      const mesh = obj as THREE.Mesh
      if (!assignedMeshes.has(mesh)) applyFallbackMaterials(mesh, colors)
    })
  }, [colors, model, parts])

  const baseRotation = MODEL_ROTATION[shape.id] ?? [0, 0, 0]
  const yRotation = baseRotation[1] + (view === 'detail' ? -0.12 : 0.08)

  return (
    <Center>
      <group rotation={[baseRotation[0], yRotation, baseRotation[2]]}>
        <primitive object={model} position={[-center.x * scale, -center.y * scale, -center.z * scale]} scale={scale} />
      </group>
    </Center>
  )
}

function ModelLoading() {
  return (
    <group>
      <mesh>
        <torusGeometry args={[0.8, 0.025, 12, 72]} />
        <meshStandardMaterial color="#C9A45C" transparent opacity={0.28} />
      </mesh>
    </group>
  )
}

function SingleCutFinishFallback() {
  const store = useConfigStore()
  const finish = FINISHES.find(f => f.id === store.finish)
  const neck = NECK_WOODS.find(n => n.id === store.neck)
  const board = FRETBOARDS.find(f => f.id === store.fretboard)
  const pickguard = PICKGUARDS.find(p => p.id === store.pickguard)
  const hw = HARDWARE_COLORS.find(h => h.id === store.hardware)
  const colors = makeColors(finish, neck, board, hw, pickguard)
  const bodyFill = finish?.id === 'sunburst' ? 'url(#singleCutBurst)' : colors.finish

  return (
    <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 45%, #17151a 0%, #09090B 62%)', display: 'grid', placeItems: 'center' }}>
      <svg viewBox="0 0 760 520" role="img" aria-label="Single Cut Electric finish preview" style={{ width: 'min(86%, 860px)', height: 'min(82%, 560px)', filter: 'drop-shadow(0 28px 60px rgba(0,0,0,0.46))' }}>
        <defs>
          <radialGradient id="singleCutBurst" cx="46%" cy="54%" r="62%">
            <stop offset="0%" stopColor="#F2A33B" />
            <stop offset="45%" stopColor={colors.finish} />
            <stop offset="86%" stopColor="#140703" />
          </radialGradient>
          <linearGradient id="singleCutTopGloss" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="42%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.16)" />
          </linearGradient>
        </defs>
        <g transform="translate(68 36) rotate(-12 330 230)">
          <rect x="295" y="58" width="78" height="318" rx="21" fill={colors.neck} />
          <rect x="315" y="68" width="38" height="298" rx="13" fill={colors.board} />
          <path d="M286 42 L379 42 L398 8 Q334 -20 267 8 Z" fill={colors.neck} stroke="#1a0d07" strokeWidth="6" />
          {[86, 122, 158, 194, 230, 266, 302, 338].map(y => (
            <line key={y} x1="316" x2="352" y1={y} y2={y} stroke="#C9CED6" strokeWidth="2.4" opacity="0.9" />
          ))}
          <path
            d="M213 254 C164 241 123 198 126 148 C128 95 179 66 233 83 C261 31 341 39 365 92 C410 98 449 132 449 184 C449 244 399 286 337 288 C321 333 270 354 226 333 C178 360 108 331 105 274 C103 234 157 220 213 254 Z"
            fill={colors.pickguard}
            stroke="#D9CBA4"
            strokeWidth="14"
            strokeLinejoin="round"
          />
          <path
            d="M213 254 C164 241 123 198 126 148 C128 95 179 66 233 83 C261 31 341 39 365 92 C410 98 449 132 449 184 C449 244 399 286 337 288 C321 333 270 354 226 333 C178 360 108 331 105 274 C103 234 157 220 213 254 Z"
            fill={bodyFill}
            stroke="#F2EEE2"
            strokeWidth="8"
            strokeLinejoin="round"
          />
          <path
            d="M190 246 C151 229 128 191 134 151 C142 102 188 77 234 92 C262 49 329 54 355 101 C396 106 431 137 431 183 C431 235 386 269 328 270 C312 306 268 326 229 304 C184 329 130 305 122 267 C116 235 151 222 190 246 Z"
            fill="url(#singleCutTopGloss)"
            opacity="0.55"
          />
          <g fill={colors.hardware} stroke="#1E2025" strokeWidth="3">
            <rect x="232" y="168" width="92" height="32" rx="8" />
            <rect x="229" y="221" width="96" height="32" rx="8" />
            <rect x="181" y="289" width="140" height="18" rx="9" />
            <circle cx="367" cy="236" r="13" />
            <circle cx="400" cy="207" r="13" />
          </g>
          <g stroke="#DDE2EA" strokeWidth="1.2" opacity="0.75">
            {[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1={324 + i * 5} x2={180 + i * 17} y1="46" y2="298" />)}
          </g>
        </g>
      </svg>
    </div>
  )
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene({ view }: { view: 'standard' | 'detail' }) {
  return (
    <>
      <ambientLight intensity={0.42} />
      <directionalLight position={[4.5, 7, 4]} intensity={1.35} castShadow shadow-mapSize={[2048, 2048]} />
      <spotLight position={[-4, 4, 4]} angle={0.45} penumbra={0.7} intensity={0.8} color="#E2C07A" castShadow />
      <pointLight position={[3, -1, 3]} color="#fff6df" intensity={0.42} />
      <Environment preset="studio" />
      <ContactShadows position={[0, -2.35, -0.06]} opacity={0.32} scale={7.2} blur={3.1} far={4} color="#000000" />
      <Suspense fallback={<ModelLoading />}>
        <Bounds fit clip observe margin={1.28}>
          <GlbInstrument view={view} />
        </Bounds>
      </Suspense>
    </>
  )
}

function CameraControls({ view }: { view: 'standard' | 'detail' | 'reset' }) {
  const { camera } = useThree()
  const shape = useConfigStore(s => s.shape)
  useFrame(() => {
    const distance = CAMERA_DISTANCE[shape] ?? CAMERA_DISTANCE.default
    const target = view === 'detail'
      ? new THREE.Vector3(0.12, 0.08, Math.max(4.6, distance * 0.72))
      : view === 'reset'
        ? new THREE.Vector3(0.28, 0.32, distance)
        : new THREE.Vector3(0.28, 0.32, distance)
    camera.position.lerp(target, 0.08)
    camera.lookAt(0, 0, 0)
  })
  return null
}

// ── Canvas wrapper ─────────────────────────────────────────────────────────────
export default function GuitarCanvas() {
  const [view, setView] = useState<'standard' | 'detail' | 'reset'>('standard')
  const [webglLost, setWebglLost] = useState(false)
  const shape = useConfigStore(s => s.shape)
  const showSingleCutFallback = webglLost && shape === 'single-cut'

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {showSingleCutFallback ? (
        <SingleCutFinishFallback />
      ) : (
        <Canvas
          camera={{ position: [0.35, 0.25, 5.35], fov: 37 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: 'radial-gradient(circle at 50% 45%, #17151a 0%, #09090B 62%)', width: '100%', height: '100%' }}
          shadows
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', event => {
              event.preventDefault()
              setWebglLost(true)
            })
            gl.domElement.addEventListener('webglcontextrestored', () => setWebglLost(false))
          }}
        >
          <CameraControls view={view} />
          <Scene view={view === 'reset' ? 'standard' : view} />
          <OrbitControls
            enablePan={false}
            target={[0, 0, 0]}
            minDistance={3.2}
            maxDistance={10}
            enableDamping
            dampingFactor={0.08}
            autoRotate={false}
            maxPolarAngle={Math.PI * 0.75}
            minPolarAngle={Math.PI * 0.2}
          />
        </Canvas>
      )}
      <div style={{ position: 'absolute', left: 20, top: 64, zIndex: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          ['standard', 'Reset'],
          ['detail', 'Zoom'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setView(id as 'standard' | 'detail')} style={{ border: '1px solid rgba(201,164,92,0.24)', background: view === id ? 'rgba(201,164,92,0.14)' : 'rgba(9,9,11,0.68)', color: '#C9A45C', borderRadius: 999, padding: '7px 12px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
