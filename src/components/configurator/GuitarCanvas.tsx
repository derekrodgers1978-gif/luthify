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

type MaterialRole = 'body' | 'neck' | 'hardware' | 'strings' | 'pickguard' | 'other'

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

function materialRole(matName: string): MaterialRole {
  const name = matName.toLowerCase()
  if (matName === 'Body' || name.includes('body')) return 'body'
  if (matName === 'Wood' || name.includes('wood') || name.includes('neck')) return 'neck'
  if (matName === 'Plastic' || name.includes('plastic') || name.includes('pickguard')) return 'pickguard'
  if (matName === 'Chrome' || matName === 'Knobs' || name.includes('chrome') || name.includes('knob') || name.includes('hardware') || name.includes('metal')) return 'hardware'
  if (matName === 'Strings' || name.includes('string')) return 'strings'
  return 'pickguard'
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

function enhanceModernSMaterial(material: THREE.Material, colors: ReturnType<typeof makeColors>) {
  const mat = material as THREE.MeshStandardMaterial
  if (!mat.isMeshStandardMaterial) return
  const role = materialRole(mat.name)
  mat.envMapIntensity = 1.8
  if (role === 'body') {
    applyBodyMaterial(mat, colors)
  } else if (role === 'neck') {
    applyWoodMaterial(mat, colors)
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
          enhanceModernSMaterial(mat, colors)
          if (materialRole(mat.name) === 'neck') woodMaterialIndex = index
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
        enhanceMaterial(materialRole(mat.name), mat, colors)
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

function SvgPremiumPreview({ view }: { view: 'standard' | 'detail' }) {
  const shape = useConfigStore(s => s.shape)
  const finishId = useConfigStore(s => s.finish)
  const neckId = useConfigStore(s => s.neck)
  const fretboardId = useConfigStore(s => s.fretboard)
  const hardwareId = useConfigStore(s => s.hardware)
  const bridgeId = useConfigStore(s => s.bridge)
  const pickupsId = useConfigStore(s => s.pickups)
  const finish = FINISHES.find(f => f.id === finishId)
  const neck = NECK_WOODS.find(n => n.id === neckId)
  const board = FRETBOARDS.find(f => f.id === fretboardId)
  const hw = HARDWARE_COLORS.find(h => h.id === hardwareId)
  const colors = makeColors(finish, neck, board, hw)
  const isSingleCut = shape === 'single-cut'
  const id = `${shape}-${finishId}-${hardwareId}-${bridgeId}-${pickupsId}`.replace(/[^a-z0-9-]/gi, '')
  const bodyPath = isSingleCut
    ? 'M -95 -120 C -40 -204 82 -195 139 -100 C 160 -66 188 -67 207 -39 C 238 8 219 95 158 151 C 92 212 -21 214 -110 161 C -198 108 -229 7 -184 -78 C -164 -116 -128 -128 -95 -120 Z'
    : 'M -51 -151 C -2 -177 48 -151 57 -98 C 90 -127 153 -112 168 -61 C 184 -7 137 21 78 28 C 136 70 121 145 54 173 C -7 199 -77 166 -82 101 C -122 143 -194 113 -193 46 C -192 -8 -148 -42 -91 -34 C -119 -80 -102 -128 -51 -151 Z'
  const bodyInnerPath = isSingleCut
    ? 'M -78 -96 C -33 -162 64 -154 109 -80 C 126 -52 150 -53 165 -31 C 188 7 173 75 126 118 C 74 166 -17 167 -88 126 C -157 85 -181 7 -146 -59 C -130 -89 -103 -101 -78 -96 Z'
    : 'M -45 -126 C -8 -145 30 -127 38 -83 C 67 -104 114 -92 126 -52 C 139 -9 103 11 54 17 C 96 51 85 108 35 129 C -11 149 -61 122 -65 73 C -96 105 -150 82 -149 34 C -148 -5 -114 -27 -70 -21 C -92 -58 -83 -105 -45 -126 Z'
  const headstockPath = isSingleCut
    ? 'M -37 -7 C -8 -21 38 -11 51 24 L 70 116 C 39 139 -8 146 -50 130 L -63 50 C -60 22 -53 3 -37 -7 Z'
    : 'M -29 -3 C 2 -19 43 -7 58 26 L 74 102 C 51 137 12 153 -36 139 L -61 85 C -50 46 -48 14 -29 -3 Z'
  const pickups = pickupsId === 'singlecoil'
    ? ['single', 'single', 'single']
    : pickupsId === 'hss'
      ? ['single', 'single', 'hum']
      : pickupsId === 'p90'
        ? ['p90', 'p90']
        : ['hum', 'hum']
  const pickupYs = pickups.length === 3 ? [-56, -7, 44] : [-42, 34]
  const strings = [-16, -9.5, -3.2, 3.2, 9.5, 16]
  const transform = `translate(500 398) rotate(-12) scale(${view === 'detail' ? 1.15 : 1})`
  const bridgeY = isSingleCut ? 91 : 82

  return (
    <div data-preview-shape={shape} style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 43%, #19171d 0%, #09090B 64%)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <svg key={`${shape}-${pickupsId}-${bridgeId}-${hardwareId}-${finishId}`} data-shape={shape} viewBox="0 0 1000 760" role="img" aria-label={`${isSingleCut ? 'Single Cut' : 'S-Style'} modular guitar preview`} style={{ width: 'min(92%, 980px)', height: 'min(92%, 700px)' }}>
        <defs>
          <filter id={`${id}-shadow`} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="26" stdDeviation="22" floodColor="#000000" floodOpacity="0.48" />
          </filter>
          <linearGradient id={`${id}-solid`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={colors.finish} />
            <stop offset="48%" stopColor={colors.finish} />
            <stop offset="100%" stopColor="#09090B" stopOpacity="0.38" />
          </linearGradient>
          <radialGradient id={`${id}-burst`} cx="45%" cy="44%" r="73%">
            <stop offset="0%" stopColor="#F3B24D" />
            <stop offset="42%" stopColor={colors.finish} />
            <stop offset="78%" stopColor="#2C0D04" />
            <stop offset="100%" stopColor="#080303" />
          </radialGradient>
          <linearGradient id={`${id}-natural`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#8D5B2F" />
            <stop offset="22%" stopColor={colors.finish} />
            <stop offset="48%" stopColor="#F2D09A" />
            <stop offset="72%" stopColor={colors.finish} />
            <stop offset="100%" stopColor="#70421D" />
          </linearGradient>
          <linearGradient id={`${id}-neck`} x1="0" x2="1">
            <stop offset="0%" stopColor="#5a3118" />
            <stop offset="42%" stopColor={colors.neck} />
            <stop offset="100%" stopColor="#2f180b" />
          </linearGradient>
          <linearGradient id={`${id}-metal`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
            <stop offset="45%" stopColor={colors.hardware} />
            <stop offset="100%" stopColor="#16171A" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id={`${id}-gloss`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="52%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.16" />
          </linearGradient>
          <pattern id={`${id}-grain`} width="36" height="18" patternUnits="userSpaceOnUse">
            <path d="M0 9 C8 3 16 15 24 8 S34 8 36 4" fill="none" stroke="#2d1708" strokeOpacity="0.18" strokeWidth="1.4" />
          </pattern>
        </defs>

        <g transform={transform} filter={`url(#${id}-shadow)`}>
          <path data-body-outline="true" d={bodyPath} transform="translate(0 126)" fill="#F4E8CB" stroke="#130D08" strokeWidth="9" strokeLinejoin="round" />
          <path d={bodyPath} transform="translate(0 126)" fill={isBurstFinish(finish?.id) ? `url(#${id}-burst)` : isNaturalFinish(finish?.id) ? `url(#${id}-natural)` : `url(#${id}-solid)`} stroke="#F1E7CD" strokeWidth="4" strokeLinejoin="round" />
          {isNaturalFinish(finish?.id) && <path d={bodyPath} transform="translate(0 126)" fill={`url(#${id}-grain)`} opacity="0.62" />}
          <path d={bodyInnerPath} transform="translate(0 126)" fill={`url(#${id}-gloss)`} opacity="0.72" />
          <path d={bodyInnerPath} transform="translate(0 126)" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="2" />

          <path d="M -31 -236 L 31 -236 L 26 58 Q 0 76 -26 58 Z" fill={`url(#${id}-neck)`} stroke="#211008" strokeWidth="3" />
          <path d="M -23 -226 L 23 -226 L 18 72 Q 0 86 -18 72 Z" fill={colors.board} stroke="#080503" strokeWidth="2" />
          {[-198, -170, -142, -113, -84, -55, -26, 3, 32, 59].map(y => (
            <line key={y} x1="-22" x2="22" y1={y} y2={y} stroke="#D8DDE5" strokeWidth="2.2" strokeOpacity="0.85" />
          ))}
          {[-142, -84, -26, 32].map(y => (
            <circle key={y} cx="0" cy={y + 12} r="4.5" fill="#D7DCE5" opacity="0.92" />
          ))}
          <path d={headstockPath} transform="translate(0 -350)" fill={`url(#${id}-neck)`} stroke="#211008" strokeWidth="3" strokeLinejoin="round" />
          <rect x="-31" y="-246" width="62" height="11" rx="3" fill="#F1E4C8" stroke="#2a1b0e" strokeWidth="1.5" />

          {[-46, 46].flatMap((x, sideIndex) => [-328, -295, -262].map((y, i) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
              <circle r="8" fill={`url(#${id}-metal)`} stroke="#111318" strokeWidth="1.3" />
              <rect x={sideIndex === 0 ? -30 : 10} y="-5" width="21" height="10" rx="4" fill={`url(#${id}-metal)`} stroke="#111318" strokeWidth="1" />
            </g>
          )))}

          {pickups.map((type, i) => (
            <g key={`${type}-${i}`} transform={`translate(${isSingleCut ? -10 : 0} ${126 + pickupYs[i]}) rotate(${isSingleCut ? -3 : -7})`}>
              {type === 'single' ? (
                <>
                  <rect x="-58" y="-10" width="116" height="20" rx="9" fill="#F4EDE1" stroke="#161514" strokeWidth="2" />
                  {[...Array(6)].map((_, p) => <circle key={p} cx={-37 + p * 15} cy="0" r="3" fill={`url(#${id}-metal)`} />)}
                </>
              ) : type === 'p90' ? (
                <>
                  <rect x="-64" y="-17" width="128" height="34" rx="12" fill="#E8DDC7" stroke="#15130F" strokeWidth="2.2" />
                  {[...Array(6)].map((_, p) => <circle key={p} cx={-38 + p * 15.5} cy="0" r="3.5" fill="#151515" />)}
                </>
              ) : (
                <>
                  <rect x="-70" y="-23" width="140" height="46" rx="8" fill={`url(#${id}-metal)`} stroke="#15171B" strokeWidth="2.5" />
                  <rect x="-58" y="-16" width="52" height="32" rx="4" fill="#101014" />
                  <rect x="6" y="-16" width="52" height="32" rx="4" fill="#101014" />
                  {[...Array(6)].map((_, p) => <circle key={p} cx={-43 + p * 17} cy="0" r="3" fill="#DDE2EA" opacity="0.82" />)}
                </>
              )}
            </g>
          ))}

          <g transform={`translate(${isSingleCut ? -14 : 0} ${126 + bridgeY}) rotate(-4)`}>
            <rect x="-75" y="-13" width="150" height="26" rx="10" fill={`url(#${id}-metal)`} stroke="#121419" strokeWidth="2" />
            {bridgeId === 'tuneomatic' || bridgeId === 'bigsby' ? <rect x="-92" y="38" width="184" height="20" rx="10" fill={`url(#${id}-metal)`} stroke="#121419" strokeWidth="2" /> : null}
            {bridgeId === 'trem' ? <path d="M 42 16 C 92 48 105 74 82 99" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="8" strokeLinecap="round" /> : null}
            {strings.map(x => <rect key={x} x={x - 2.1} y="-20" width="4.2" height="18" rx="1.5" fill="#EEF2F7" opacity="0.86" />)}
          </g>

          {(isSingleCut ? [[112, 61], [146, 9], [83, 115], [141, 116]] : [[88, 82], [119, 50], [60, 122]]).map(([x, y], i) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${126 + y})`}>
              <circle r={i === 3 ? 9 : 13} fill={`url(#${id}-metal)`} stroke="#111318" strokeWidth="2" />
              <circle r={i === 3 ? 4 : 6} fill="#ffffff" opacity="0.18" />
            </g>
          ))}

          {strings.map((x, i) => (
            <line key={x} x1={x * 0.75} y1="-239" x2={x * 1.15} y2={126 + bridgeY - 22} stroke="#EFF3F8" strokeWidth={1.1 + i * 0.18} strokeOpacity="0.8" />
          ))}
        </g>
      </svg>
    </div>
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
          <ConfiguredInstrument view={view} />
        </Bounds>
      </Suspense>
    </>
  )
}

function ConfiguredInstrument({ view }: { view: 'standard' | 'detail' }) {
  const shape = useConfigStore(s => s.shape)
  return <GlbInstrument view={view} />
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
  const showSvgPremiumPreview = shape === 'modern-s' || shape === 'single-cut'
  const showSingleCutFallback = webglLost && shape === 'single-cut'

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {showSvgPremiumPreview ? (
        <div key={`premium-preview-${shape}`} style={{ width: '100%', height: '100%' }}>
          <SvgPremiumPreview view={view === 'detail' ? 'detail' : 'standard'} />
        </div>
      ) : showSingleCutFallback ? (
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
