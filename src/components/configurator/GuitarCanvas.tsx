'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bounds, Center, ContactShadows, Environment, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigStore } from '@/store/configStore'
import { BODY_SHAPES, FINISHES, FRETBOARDS, HARDWARE_COLORS, NECK_WOODS } from '@/lib/configurator-options'

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

type MaterialRole = 'body' | 'neck' | 'fretboard' | 'hardware' | 'strings' | 'pickguard' | 'pickup' | 'other'

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

function materialRole(matName: string, meshName = ''): MaterialRole {
  const materialName = matName.toLowerCase()
  const combinedName = `${materialName} ${meshName.toLowerCase()}`

  if (materialName === 'body' || combinedName.includes('body')) return 'body'
  if (
    combinedName.includes('fret') ||
    combinedName.includes('board') ||
    combinedName.includes('ebony') ||
    combinedName.includes('rosewood')
  ) {
    return 'fretboard'
  }
  if (combinedName.includes('wood') || combinedName.includes('neck')) return 'neck'
  if (materialName === 'chrome' || materialName === 'knobs' || combinedName.includes('chrome') || combinedName.includes('knob') || combinedName.includes('hardware') || combinedName.includes('metal')) return 'hardware'
  if (materialName === 'strings' || combinedName.includes('string')) return 'strings'
  if (combinedName.includes('pickguard')) return 'pickguard'
  if (materialName === 'plastic' || combinedName.includes('pickup')) return 'pickup'
  return 'other'
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

function makeBurstTexture(colors: ReturnType<typeof makeColors>) {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const gradient = ctx.createRadialGradient(256, 256, 20, 256, 256, 360)
  if (colors.finishId === 'sunburst') {
    gradient.addColorStop(0, '#F2D49B')
    gradient.addColorStop(0.42, '#C68642')
    gradient.addColorStop(0.74, colors.finish)
    gradient.addColorStop(1, colors.burstEdge ?? '#120603')
  } else if (colors.finishId === 'burst-cherry') {
    gradient.addColorStop(0, '#B31924')
    gradient.addColorStop(0.58, colors.finish)
    gradient.addColorStop(1, '#000000')
  } else {
    gradient.addColorStop(0, colors.finish)
    gradient.addColorStop(0.64, colors.finish)
    gradient.addColorStop(1, colors.burstEdge ?? '#120603')
  }

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  return texture
}

function applyBodyMaterial(mat: THREE.MeshStandardMaterial, colors: ReturnType<typeof makeColors>) {
  if (colors.finishStyle === 'burst') {
    mat.color = new THREE.Color('#FFFFFF')
    mat.map = makeBurstTexture(colors)
  } else {
    mat.color = new THREE.Color(colors.finish)
    mat.map = null
  }
  mat.metalness = 0.04
  mat.roughness = Math.min(colors.finishRoughness ?? 0.24, 0.24)
}

function applyHardwareMaterial(mat: THREE.MeshStandardMaterial, colors: ReturnType<typeof makeColors>) {
  mat.color = new THREE.Color(colors.hardware)
  mat.metalness = colors.hardwareMetalness
  mat.roughness = colors.hardwareRoughness
}

function applyWoodMaterial(mat: THREE.MeshStandardMaterial, colors: ReturnType<typeof makeColors>, hasFretboardSplit = false) {
  mat.color = new THREE.Color(hasFretboardSplit ? colors.neck : colors.visibleWood)
  mat.metalness = 0.02
  mat.roughness = 0.44
}

function applyFretboardMaterial(mat: THREE.MeshStandardMaterial, colors: ReturnType<typeof makeColors>) {
  mat.color = new THREE.Color(colors.board)
  mat.metalness = 0.02
  mat.roughness = 0.48
}

function hardwareMaterialProps(colors: ReturnType<typeof makeColors>) {
  return {
    color: colors.hardware,
    metalness: colors.hardwareMetalness,
    roughness: colors.hardwareRoughness,
  }
}

function enhanceMaterial(role: MaterialRole, material: THREE.Material, colors: ReturnType<typeof makeColors>) {
  const mat = material as THREE.MeshStandardMaterial
  if (!mat.isMeshStandardMaterial) return
  mat.envMapIntensity = 1.55
  if (role === 'hardware') {
    applyHardwareMaterial(mat, colors)
  } else if (role === 'neck') {
    applyWoodMaterial(mat, colors)
  } else if (role === 'fretboard') {
    applyFretboardMaterial(mat, colors)
  } else if (role === 'strings') {
    mat.color = new THREE.Color(colors.strings)
    mat.metalness = 0.7
    mat.roughness = 0.26
  } else if (role === 'pickguard') {
    mat.color = new THREE.Color(colors.pickguard)
    mat.metalness = 0.02
    mat.roughness = 0.34
  } else if (role === 'body') {
    applyBodyMaterial(mat, colors)
  }
  mat.needsUpdate = true
}

function enhanceModernSMaterial(material: THREE.Material, colors: ReturnType<typeof makeColors>, meshName = '') {
  const mat = material as THREE.MeshStandardMaterial
  if (!mat.isMeshStandardMaterial) return
  const role = materialRole(mat.name, meshName)
  mat.envMapIntensity = 1.8
  if (role === 'body') {
    applyBodyMaterial(mat, colors)
  } else if (role === 'neck') {
    applyWoodMaterial(mat, colors)
  } else if (role === 'fretboard') {
    applyFretboardMaterial(mat, colors)
  } else if (role === 'hardware') {
    applyHardwareMaterial(mat, colors)
  } else if (role === 'strings') {
    mat.color = new THREE.Color(colors.strings)
    mat.metalness = 0.7
    mat.roughness = 0.26
  } else if (role === 'pickguard') {
    mat.color = new THREE.Color(colors.pickguard)
    mat.metalness = 0.02
    mat.roughness = 0.34
  }
  mat.needsUpdate = true
}

function getTriangleNormal(
  position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  index: THREE.BufferAttribute | null,
  triangleStart: number,
) {
  const a = index ? index.getX(triangleStart) : triangleStart
  const b = index ? index.getX(triangleStart + 1) : triangleStart + 1
  const c = index ? index.getX(triangleStart + 2) : triangleStart + 2
  const va = new THREE.Vector3().fromBufferAttribute(position, a)
  const vb = new THREE.Vector3().fromBufferAttribute(position, b)
  const vc = new THREE.Vector3().fromBufferAttribute(position, c)
  return vb.sub(va).cross(vc.sub(va)).normalize()
}

function mergeGroup(groups: THREE.BufferGeometry['groups'], start: number, materialIndex: number) {
  const previous = groups[groups.length - 1]
  if (previous && previous.materialIndex === materialIndex && previous.start + previous.count === start) {
    previous.count += 3
    return
  }
  groups.push({ start, count: 3, materialIndex })
}

function applyFretboardSplit(mesh: THREE.Mesh, woodMaterialIndex: number, colors: ReturnType<typeof makeColors>) {
  const geometry = mesh.geometry as THREE.BufferGeometry
  const position = geometry.getAttribute('position')
  if (!position) return false

  if (!mesh.userData.fretboardGeometryCloned) {
    mesh.geometry = geometry.clone()
    mesh.userData.fretboardGeometryCloned = true
  }

  const splitGeometry = mesh.geometry as THREE.BufferGeometry
  const splitPosition = splitGeometry.getAttribute('position')
  if (!splitPosition) return false

  if (!splitGeometry.userData.originalGroups) {
    const drawCount = splitGeometry.index?.count ?? splitPosition.count
    splitGeometry.userData.originalGroups = splitGeometry.groups.length
      ? splitGeometry.groups.map(group => ({ ...group }))
      : [{ start: 0, count: drawCount, materialIndex: 0 }]
  }

  const materials = Array.isArray(mesh.material) ? mesh.material.slice() : [mesh.material]
  const sourceWoodMaterial = materials[woodMaterialIndex] as THREE.MeshStandardMaterial
  if (!sourceWoodMaterial?.isMeshStandardMaterial) return false

  const fretboardMaterial = sourceWoodMaterial.clone()
  fretboardMaterial.name = `${sourceWoodMaterial.name}-Fretboard`
  fretboardMaterial.color = new THREE.Color(colors.board)
  fretboardMaterial.metalness = 0.02
  fretboardMaterial.roughness = 0.48
  fretboardMaterial.needsUpdate = true
  const fretboardMaterialIndex = materials.length
  materials.push(fretboardMaterial)

  const index = splitGeometry.index
  const originalGroups = splitGeometry.userData.originalGroups as THREE.BufferGeometry['groups']
  const nextGroups: THREE.BufferGeometry['groups'] = []
  let fretboardFaceCount = 0

  originalGroups.forEach(group => {
    if (group.materialIndex !== woodMaterialIndex) {
      nextGroups.push({ ...group })
      return
    }

    for (let start = group.start; start < group.start + group.count; start += 3) {
      const normal = getTriangleNormal(splitPosition, index, start)
      const isFretboardFacing = normal.y > 0.52 && Math.abs(normal.y) > Math.abs(normal.x) && Math.abs(normal.y) > Math.abs(normal.z)
      mergeGroup(nextGroups, start, isFretboardFacing ? fretboardMaterialIndex : woodMaterialIndex)
      if (isFretboardFacing) fretboardFaceCount += 1
    }
  })

  if (!fretboardFaceCount) return false

  splitGeometry.clearGroups()
  nextGroups.forEach(group => splitGeometry.addGroup(group.start, group.count, group.materialIndex))
  mesh.material = materials
  return true
}

function StratOptionOverlays({ colors }: { colors: ReturnType<typeof makeColors> }) {
  const pickups = useConfigStore(s => s.pickups)
  const bridge = useConfigStore(s => s.bridge)
  const pickupZ = [-0.17, -0.05, 0.08]
  const singleCoils = (
    <group>
      {pickupZ.map(z => (
        <mesh key={z} position={[-0.03, 0.014, z]} rotation={[0, 0.02, 0]}>
          <boxGeometry args={[0.095, 0.017, 0.032]} />
          <meshStandardMaterial color="#f5f0e6" metalness={0.02} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
  const humbucker = (z: number) => (
    <mesh key={z} position={[-0.03, 0.014, z]} rotation={[0, 0.02, 0]}>
      <boxGeometry args={[0.11, 0.017, 0.048]} />
      <meshStandardMaterial color="#101014" metalness={0.22} roughness={0.32} />
    </mesh>
  )

  return (
    <group>
      {(pickups === 'singlecoil' || pickups === 'hss') && singleCoils}
      {(pickups === 'dual-hum' || pickups === 'active-hum') && <group>{humbucker(-0.15)}{humbucker(0.04)}</group>}
      {pickups === 'p90' && <group>{pickupZ.map(z => humbucker(z))}</group>}
      {pickups === 'hss' && humbucker(-0.17)}

      {bridge === 'trem' && (
        <mesh position={[-0.03, 0.01, -0.24]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.15, 0.012, 0.06]} />
          <meshStandardMaterial {...hardwareMaterialProps(colors)} />
        </mesh>
      )}
      {bridge === 'hardtail' && (
        <mesh position={[-0.03, 0.01, -0.24]}>
          <boxGeometry args={[0.13, 0.014, 0.045]} />
          <meshStandardMaterial {...hardwareMaterialProps(colors)} />
        </mesh>
      )}
      {bridge === 'tuneomatic' && (
        <group>
          <mesh position={[-0.03, 0.012, -0.22]}>
            <boxGeometry args={[0.115, 0.012, 0.022]} />
            <meshStandardMaterial {...hardwareMaterialProps(colors)} />
          </mesh>
          <mesh position={[-0.03, 0.012, -0.265]}>
            <boxGeometry args={[0.085, 0.011, 0.018]} />
            <meshStandardMaterial {...hardwareMaterialProps(colors)} />
          </mesh>
        </group>
      )}
      {bridge === 'bigsby' && (
        <mesh position={[-0.03, 0.01, -0.245]}>
          <cylinderGeometry args={[0.018, 0.018, 0.13, 16]} />
          <meshStandardMaterial {...hardwareMaterialProps(colors)} />
        </mesh>
      )}
    </group>
  )
}

function GlbInstrument({ view }: { view: 'standard' | 'detail' }) {
  const store = useConfigStore()
  const shape = BODY_SHAPES.find(s => s.id === store.shape) ?? BODY_SHAPES[0]
  const finish = FINISHES.find(f => f.id === store.finish)
  const neck = NECK_WOODS.find(n => n.id === store.neck)
  const board = FRETBOARDS.find(f => f.id === store.fretboard)
  const hw = HARDWARE_COLORS.find(h => h.id === store.hardware)
  const modelPath = shape.modelPath ?? BODY_SHAPES[0].modelPath!
  const { scene } = useGLTF(modelPath)
  const { model, center, scale } = useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z) || 1
    const targetSize = MODEL_TARGET_SIZE[shape.id] ?? MODEL_TARGET_SIZE.default
    return { model: clone, center, scale: targetSize / maxDimension }
  }, [scene, shape.id])
  const colors = useMemo(() => makeColors(finish, neck, board, hw), [board, finish, hw, neck])

  useEffect(() => {
    model.traverse(obj => {
      if (!(obj as THREE.Mesh).isMesh) return
      const mesh = obj as THREE.Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
      if (!mesh.userData.baseMaterials) {
        const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mesh.userData.baseMaterials = sourceMaterials.map(mat => mat.clone())
        mesh.userData.usesMaterialArray = Array.isArray(mesh.material)
      }
      const baseMaterials = mesh.userData.baseMaterials as THREE.Material[]
      mesh.material = mesh.userData.usesMaterialArray
        ? baseMaterials.map(mat => mat.clone())
        : baseMaterials[0].clone()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      if (shape.id === 'modern-s') {
        let woodMaterialIndex = -1
        materials.forEach((mat, index) => {
          const role = materialRole(mat.name, mesh.name)
          enhanceModernSMaterial(mat, colors, mesh.name)
          if (role === 'neck') woodMaterialIndex = index
        })
        if (woodMaterialIndex >= 0) {
          const hasFretboardSplit = applyFretboardSplit(mesh, woodMaterialIndex, colors)
          const activeMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          const woodMaterial = activeMaterials[woodMaterialIndex] as THREE.MeshStandardMaterial
          if (woodMaterial?.isMeshStandardMaterial) {
            applyWoodMaterial(woodMaterial, colors, hasFretboardSplit)
            woodMaterial.envMapIntensity = 1.8
            woodMaterial.needsUpdate = true
          }
        }
        return
      }

      materials.forEach(mat => {
        enhanceMaterial(materialRole(mat.name, mesh.name), mat, colors)
      })
    })
  }, [colors, model, shape.id])

  const baseRotation = MODEL_ROTATION[shape.id] ?? [0, 0, 0]
  const yRotation = baseRotation[1] + (view === 'detail' ? -0.12 : 0.08)

  return (
    <Center>
      <group rotation={[baseRotation[0], yRotation, baseRotation[2]]}>
        <primitive object={model} position={[-center.x * scale, -center.y * scale, -center.z * scale]} scale={scale} />
        {shape.id === 'modern-s' && <group scale={0.74}><StratOptionOverlays colors={colors} /></group>}
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
