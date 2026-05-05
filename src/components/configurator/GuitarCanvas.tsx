'use client'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bounds, Center, ContactShadows, Environment, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigStore } from '@/store/configStore'
import { BODY_SHAPES, FINISHES, FRETBOARDS, HARDWARE_COLORS, NECK_WOODS } from '@/lib/configurator-options'
import { MODULAR_GUITAR_MODEL_PATH, createModularGuitarModel } from '@/lib/modelLoader'

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

useGLTF.preload(MODULAR_GUITAR_MODEL_PATH)

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

function makeColors(finish?: FinishOption, neck?: WoodOption, board?: BoardOption, hw?: HardwareOption) {
  const neckColor = NECK_COLORS[neck?.id ?? ''] ?? NECK_COLORS.mahogany
  const boardColor = FRETBOARD_COLORS[board?.id ?? ''] ?? board?.hex ?? FRETBOARD_COLORS.ebony
  const isDarkBoard = boardColor !== FRETBOARD_COLORS.maple
  const hardware = HARDWARE_FINISHES[hw?.id ?? ''] ?? HARDWARE_FINISHES.nickel

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
    pickguard: '#F2EEE2',
  }
}

const FINISH_TEXTURE_PATHS: Record<string, string> = {
  'burst-amber': '/models/burst_amber.png',
  'burst-vintage': '/models/burst_vintage.png',
  'burst-cherry': '/models/burst_cherry.png',
  sunburst: '/models/burst_sunburst.png',
}

const PICKUP_FINISHES: Record<string, { color: string; metalness: number; roughness: number }> = {
  singlecoil: { color: '#F5F0E6', metalness: 0.02, roughness: 0.35 },
  hss: { color: '#F5F0E6', metalness: 0.08, roughness: 0.34 },
  p90: { color: '#F0E7D2', metalness: 0.04, roughness: 0.36 },
  'dual-hum': { color: '#101014', metalness: 0.22, roughness: 0.32 },
  'active-hum': { color: '#09090B', metalness: 0.26, roughness: 0.3 },
}

function standardMaterials(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  return materials.filter((material): material is THREE.MeshStandardMaterial => {
    return Boolean((material as THREE.MeshStandardMaterial).isMeshStandardMaterial)
  })
}

function applyBodyColorFallback(body: THREE.Mesh, finish?: FinishOption) {
  standardMaterials(body).forEach(mat => {
    mat.map = null
    mat.color = new THREE.Color(finish?.hex ?? '#D4B896')
    mat.metalness = 0.04
    mat.roughness = Math.min(finish?.roughness ?? 0.24, 0.24)
    mat.envMapIntensity = 1.8
    mat.needsUpdate = true
  })
}

function applyMeshColor(mesh: THREE.Mesh | undefined, material: {
  color: string
  metalness: number
  roughness: number
  envMapIntensity?: number
}) {
  if (!mesh) return

  standardMaterials(mesh).forEach(mat => {
    mat.map = null
    mat.color = new THREE.Color(material.color)
    mat.metalness = material.metalness
    mat.roughness = material.roughness
    mat.envMapIntensity = material.envMapIntensity ?? 1.55
    mat.needsUpdate = true
  })
}

function GlbInstrument({ view }: { view: 'standard' | 'detail' }) {
  const finishId = useConfigStore(s => s.finishId)
  const hardwareId = useConfigStore(s => s.hardwareId)
  const fretboardId = useConfigStore(s => s.fretboardId)
  const pickupId = useConfigStore(s => s.pickupId)
  const neckId = useConfigStore(s => s.neck)
  const finish = FINISHES.find(f => f.id === finishId)
  const neck = NECK_WOODS.find(n => n.id === neckId)
  const board = FRETBOARDS.find(f => f.id === fretboardId)
  const hw = HARDWARE_COLORS.find(h => h.id === hardwareId)
  const partColors = useMemo(() => makeColors(undefined, neck, board, hw), [board, hw, neck])
  const textureLoader = useMemo(() => new THREE.TextureLoader(), [])
  const { scene } = useGLTF(MODULAR_GUITAR_MODEL_PATH)
  const { model, center, scale, meshMap, meshAudit } = useMemo(() => {
    return createModularGuitarModel(scene, MODEL_TARGET_SIZE.default)
  }, [scene])
  const body = meshMap.BODY

  const applyFinish = useCallback((nextFinishId: string) => {
    if (!body) return

    const texturePath = FINISH_TEXTURE_PATHS[nextFinishId]
    if (!texturePath) {
      applyBodyColorFallback(body, finish)
      return
    }

    const texture = textureLoader.load(
      texturePath,
      loadedTexture => {
        loadedTexture.flipY = false
        loadedTexture.colorSpace = THREE.SRGBColorSpace
        loadedTexture.needsUpdate = true
      },
      undefined,
      () => applyBodyColorFallback(body, finish)
    )
    texture.flipY = false
    texture.colorSpace = THREE.SRGBColorSpace

    standardMaterials(body).forEach(mat => {
      mat.color = new THREE.Color('#FFFFFF')
      mat.map = texture
      mat.metalness = 0.04
      mat.roughness = Math.min(finish?.roughness ?? 0.24, 0.24)
      mat.envMapIntensity = 1.8
      mat.needsUpdate = true
    })
  }, [body, finish, textureLoader])

  useEffect(() => {
    if (meshAudit.missing.length > 0) {
      console.warn('meshAudit.missing:', meshAudit.missing)
    }
  }, [meshAudit])

  useEffect(() => {
    applyFinish(finishId)
  }, [applyFinish, finishId])

  useEffect(() => {
    applyMeshColor(meshMap.NECK, {
      color: partColors.neck,
      metalness: 0.02,
      roughness: 0.44,
      envMapIntensity: 1.4,
    })
    applyMeshColor(meshMap.FRETBOARD, {
      color: partColors.board,
      metalness: 0.02,
      roughness: 0.48,
      envMapIntensity: 1.4,
    })
    applyMeshColor(meshMap.PICKGUARD, {
      color: partColors.pickguard,
      metalness: 0.02,
      roughness: 0.34,
      envMapIntensity: 1.35,
    })
    applyMeshColor(meshMap.HARDWARE, {
      color: partColors.hardware,
      metalness: partColors.hardwareMetalness,
      roughness: partColors.hardwareRoughness,
      envMapIntensity: 1.8,
    })
    applyMeshColor(meshMap.PICKUPS, {
      ...(PICKUP_FINISHES[pickupId] ?? PICKUP_FINISHES['dual-hum']),
      envMapIntensity: 1.45,
    })
  }, [meshMap, partColors, pickupId])

  const baseRotation = MODEL_ROTATION.default ?? [0, 0, 0]
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
  const hw = HARDWARE_COLORS.find(h => h.id === store.hardware)
  const colors = makeColors(finish, neck, board, hw)
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
            fill="#F2EEE2"
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
