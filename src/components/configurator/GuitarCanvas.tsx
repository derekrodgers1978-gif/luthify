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

type MaterialRole = 'body' | 'neck' | 'fretboard' | 'hardware' | 'pickup' | 'bridge' | 'protected' | 'other'
type FinishOption = { id: string; hex?: string; roughness?: number }

const MODEL_PATHS = BODY_SHAPES.map(shape => shape.modelPath).filter(Boolean) as string[]
MODEL_PATHS.forEach(path => useGLTF.preload(path))

function materialRole(meshName: string, materialName: string): MaterialRole {
  const key = `${meshName} ${materialName}`.toLowerCase()
  if (/(pickguard|scratchplate|guard|binding|inlay|dot|nut|logo|label|plastic|plate)/.test(key)) return 'protected'
  if (/(fretboard|fingerboard|finger board|fret|board)/.test(key)) return 'fretboard'
  if (/(neck|headstock|head stock|headstock|peghead)/.test(key)) return 'neck'
  if (/(pickup|pick up|humbucker|single coil|p90|p-90)/.test(key)) return 'pickup'
  if (/(bridge|tailpiece|tail piece|tremolo|vibrato|saddle)/.test(key)) return 'bridge'
  if (/(hardware|metal|chrome|tuner|tuning|knob|control|pot|string|ferrule|strap|jack|pickguard|scratchplate|guard)/.test(key)) return 'hardware'
  if (/(body|top|paint|finish|soundboard|sound board|back|side)/.test(key)) return 'body'
  return 'other'
}

function makeColors(finish?: { hex?: string; roughness?: number }, neck?: { id: string }, board?: { hex?: string }, hw?: { id: string }) {
  return {
    finish: finish?.hex ?? '#D4B896',
    finishRoughness: finish?.roughness ?? 0.18,
    neck: neck?.id === 'maple' ? '#C8A05A' : neck?.id === 'roasted' ? '#8B4A20' : neck?.id === 'walnut' ? '#4A2411' : '#5C2F17',
    board: board?.hex ?? '#1A0A00',
    hardware: hw?.id === 'gold' || hw?.id === 'aged-brass' ? '#C9A45C' : hw?.id === 'black' ? '#111116' : '#C9CED6',
  }
}

function isLikelyPaintSurface(mesh: THREE.Mesh, modelMaxDimension: number) {
  if (!mesh.geometry) return false
  mesh.geometry.computeBoundingBox()
  const box = mesh.geometry.boundingBox
  if (!box) return false
  const size = box.getSize(new THREE.Vector3()).multiply(mesh.scale)
  const dims = [Math.abs(size.x), Math.abs(size.y), Math.abs(size.z)].sort((a, b) => b - a)
  const largest = dims[0] || 0
  const middle = dims[1] || 0
  const ratio = middle > 0 ? largest / middle : Infinity
  return largest > modelMaxDimension * 0.3 && middle > modelMaxDimension * 0.16 && ratio < 2.4
}

function isSingleCutPaintSurface(mesh: THREE.Mesh, modelMaxDimension: number) {
  if (!mesh.geometry) return false
  mesh.geometry.computeBoundingBox()
  const box = mesh.geometry.boundingBox
  if (!box) return false
  const size = box.getSize(new THREE.Vector3()).multiply(mesh.scale)
  const center = box.getCenter(new THREE.Vector3())
  const dims = [Math.abs(size.x), Math.abs(size.y), Math.abs(size.z)].sort((a, b) => b - a)
  return (
    dims[0] > modelMaxDimension * 0.4 &&
    dims[1] > modelMaxDimension * 0.28 &&
    dims[2] < modelMaxDimension * 0.08 &&
    center.y > 0.15 &&
    center.y < 1.9
  )
}

function applySingleCutBodyFinish(mat: THREE.MeshStandardMaterial, finish: FinishOption | undefined, colors: ReturnType<typeof makeColors>, mesh: THREE.Mesh) {
  mesh.geometry.computeBoundingBox()
  const box = mesh.geometry.boundingBox
  const center = box?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3()
  const size = box?.getSize(new THREE.Vector3()) ?? new THREE.Vector3(1, 1, 1)
  const halfSize = new THREE.Vector2(Math.max(size.x * 0.5, 0.001), Math.max(size.y * 0.5, 0.001))

  mat.color = new THREE.Color('#ffffff')
  mat.map = null
  mat.metalness = 0.04
  mat.roughness = Math.min(colors.finishRoughness, 0.24)
  mat.onBeforeCompile = shader => {
    shader.uniforms.uFinishColor = { value: new THREE.Color(colors.finish) }
    shader.uniforms.uBindingColor = { value: new THREE.Color('#F2EEE2') }
    shader.uniforms.uBodyCenter = { value: new THREE.Vector2(center.x, center.y) }
    shader.uniforms.uBodyHalfSize = { value: halfSize }
    shader.uniforms.uIsBurst = { value: finish?.id === 'sunburst' ? 1 : 0 }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFinishPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFinishPosition = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uFinishColor;\nuniform vec3 uBindingColor;\nuniform vec2 uBodyCenter;\nuniform vec2 uBodyHalfSize;\nuniform int uIsBurst;\nvarying vec3 vFinishPosition;'
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
vec2 finishUv = (vFinishPosition.xy - uBodyCenter) / uBodyHalfSize;
float finishRadius = length(finishUv);
vec3 burstColor = mix(vec3(0.95, 0.58, 0.16), uFinishColor, smoothstep(0.18, 0.56, finishRadius));
burstColor = mix(burstColor, vec3(0.07, 0.025, 0.008), smoothstep(0.62, 0.92, finishRadius));
vec3 paintColor = uIsBurst == 1 ? burstColor : uFinishColor;
float binding = smoothstep(0.82, 0.91, finishRadius);
diffuseColor.rgb = mix(paintColor, uBindingColor, binding * 0.92);`
      )
  }
  mat.customProgramCacheKey = () => `single-cut-finish-${finish?.id ?? 'default'}-${colors.finish}`
}

function enhanceMaterial(role: MaterialRole, material: THREE.Material, colors: ReturnType<typeof makeColors>, mesh: THREE.Mesh, modelMaxDimension: number, shapeId: string, finish?: FinishOption) {
  const mat = material as THREE.MeshStandardMaterial
  if (!mat.isMeshStandardMaterial) return
  mat.envMapIntensity = 1.55
  if (shapeId === 'single-cut' && isSingleCutPaintSurface(mesh, modelMaxDimension)) {
    applySingleCutBodyFinish(mat, finish, colors, mesh)
  } else if (role === 'hardware' || role === 'bridge') {
    mat.color = new THREE.Color(colors.hardware)
    mat.metalness = 0.9
    mat.roughness = 0.2
  } else if (role === 'pickup') {
    mat.color = new THREE.Color('#08080A')
    mat.metalness = 0.35
    mat.roughness = 0.3
  } else if (role === 'neck') {
    mat.color = new THREE.Color(colors.neck)
    mat.metalness = 0.02
    mat.roughness = 0.42
  } else if (role === 'fretboard') {
    mat.color = new THREE.Color(colors.board)
    mat.metalness = 0
    mat.roughness = 0.58
  } else if (role === 'protected') {
    mat.color = new THREE.Color('#F2EEE2')
    mat.metalness = 0.02
    mat.roughness = 0.34
  } else if (role === 'body' || (role === 'other' && isLikelyPaintSurface(mesh, modelMaxDimension))) {
    mat.color = new THREE.Color(colors.finish)
    mat.metalness = 0.04
    mat.roughness = Math.min(colors.finishRoughness, 0.24)
  }
  mat.needsUpdate = true
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
  const { model, center, scale, maxDimension } = useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z) || 1
    const targetSize = MODEL_TARGET_SIZE[shape.id] ?? MODEL_TARGET_SIZE.default
    return { model: clone, center, scale: targetSize / maxDimension, maxDimension }
  }, [scene, shape.id])
  const colors = useMemo(() => makeColors(finish, neck, board, hw), [board, finish, hw, neck])

  useEffect(() => {
    model.traverse(obj => {
      if (!(obj as THREE.Mesh).isMesh) return
      const mesh = obj as THREE.Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(mat => mat.clone())
      } else {
        mesh.material = mesh.material.clone()
      }
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach(mat => enhanceMaterial(materialRole(mesh.name, mat.name), mat, colors, mesh, maxDimension, shape.id, finish))
    })
  }, [colors, finish, maxDimension, model, shape.id])

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

function makeSStyleBodyShape() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.34, 1.05)
  shape.bezierCurveTo(-0.86, 1.02, -1.18, 0.72, -1.1, 0.34)
  shape.bezierCurveTo(-1.02, -0.03, -0.72, -0.15, -0.43, -0.19)
  shape.bezierCurveTo(-0.9, -0.42, -1.18, -0.82, -1.04, -1.26)
  shape.bezierCurveTo(-0.87, -1.84, -0.12, -2.04, 0.47, -1.68)
  shape.bezierCurveTo(0.86, -1.94, 1.52, -1.79, 1.7, -1.2)
  shape.bezierCurveTo(1.86, -0.68, 1.46, -0.28, 0.98, -0.13)
  shape.bezierCurveTo(1.42, 0.03, 1.62, 0.44, 1.44, 0.78)
  shape.bezierCurveTo(1.24, 1.17, 0.72, 1.16, 0.35, 0.86)
  shape.bezierCurveTo(0.13, 1.02, -0.08, 1.08, -0.34, 1.05)
  return shape
}

function makeSStylePickguardShape() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.36, 0.8)
  shape.bezierCurveTo(-0.69, 0.72, -0.88, 0.47, -0.78, 0.19)
  shape.bezierCurveTo(-0.67, -0.11, -0.34, -0.13, -0.11, -0.19)
  shape.bezierCurveTo(-0.46, -0.4, -0.55, -0.75, -0.35, -1.0)
  shape.bezierCurveTo(-0.04, -1.38, 0.68, -1.23, 0.96, -0.82)
  shape.bezierCurveTo(1.24, -0.4, 1.04, 0.2, 0.66, 0.46)
  shape.bezierCurveTo(0.37, 0.66, 0.03, 0.83, -0.36, 0.8)
  return shape
}

function makeSStyleHeadstockShape() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.22, 0)
  shape.lineTo(-0.35, 0.76)
  shape.bezierCurveTo(-0.31, 1.08, 0.12, 1.26, 0.34, 1.02)
  shape.bezierCurveTo(0.48, 0.86, 0.35, 0.58, 0.16, 0.55)
  shape.lineTo(0.22, 0)
  shape.closePath()
  return shape
}

function SStyleElectric({ view }: { view: 'standard' | 'detail' }) {
  const store = useConfigStore()
  const finish = FINISHES.find(f => f.id === store.finish)
  const neck = NECK_WOODS.find(n => n.id === store.neck)
  const board = FRETBOARDS.find(f => f.id === store.fretboard)
  const hw = HARDWARE_COLORS.find(h => h.id === store.hardware)
  const colors = makeColors(finish, neck, board, hw)
  const bodyShape = useMemo(makeSStyleBodyShape, [])
  const pickguardShape = useMemo(makeSStylePickguardShape, [])
  const headstockShape = useMemo(makeSStyleHeadstockShape, [])
  const bodyFill = finish?.id === 'sunburst' ? '#6B2200' : colors.finish
  const pickupLayout = store.pickups === 'singlecoil'
    ? ['single', 'single', 'single']
    : store.pickups === 'hss'
      ? ['single', 'single', 'hum']
      : store.pickups === 'p90'
        ? ['p90', 'p90']
        : ['hum', 'hum']
  const pickupYs = pickupLayout.length === 3 ? [0.36, -0.02, -0.4] : [0.24, -0.34]
  const bridgeY = -0.82
  const hardwareColor = colors.hardware
  const viewRotation: [number, number, number] = view === 'detail' ? [-0.08, -0.22, -0.2] : [-0.04, 0.16, -0.22]

  return (
    <Center>
      <group rotation={viewRotation} scale={1.18} position={[0.18, 0.02, 0]}>
        <mesh position={[0, -0.38, -0.08]} castShadow receiveShadow>
          <extrudeGeometry args={[bodyShape, { depth: 0.18, bevelEnabled: true, bevelSegments: 8, bevelSize: 0.045, bevelThickness: 0.045 }]} />
          <meshStandardMaterial color={bodyFill} roughness={Math.min(colors.finishRoughness, 0.24)} metalness={0.04} envMapIntensity={1.65} />
        </mesh>
        {finish?.id === 'sunburst' && (
          <mesh position={[0, -0.38, 0.012]} scale={[0.84, 0.83, 1]}>
            <shapeGeometry args={[bodyShape]} />
            <meshStandardMaterial color="#F2A33B" roughness={0.18} metalness={0.03} transparent opacity={0.88} />
          </mesh>
        )}
        <mesh position={[0, -0.38, 0.026]} scale={[0.91, 0.91, 1]}>
          <shapeGeometry args={[bodyShape]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.11} roughness={0.2} metalness={0.02} />
        </mesh>

        <group rotation={[0, 0, -0.05]} position={[0.06, 1.1, -0.03]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <boxGeometry args={[0.58, 3.1, 0.12]} />
            <meshStandardMaterial color={colors.neck} roughness={0.42} metalness={0.02} />
          </mesh>
          <mesh position={[0, -0.13, 0.07]} castShadow>
            <boxGeometry args={[0.36, 3.0, 0.055]} />
            <meshStandardMaterial color={colors.board} roughness={0.58} metalness={0} />
          </mesh>
          {[-1.34, -1.02, -0.7, -0.38, -0.06, 0.26, 0.58, 0.9].map(y => (
            <mesh key={y} position={[0, y, 0.105]}>
              <boxGeometry args={[0.39, 0.012, 0.018]} />
              <meshStandardMaterial color="#DDE2EA" roughness={0.18} metalness={0.65} />
            </mesh>
          ))}
          <mesh position={[0, 1.48, 0.02]} castShadow>
            <extrudeGeometry args={[headstockShape, { depth: 0.1, bevelEnabled: true, bevelSegments: 5, bevelSize: 0.02, bevelThickness: 0.02 }]} />
            <meshStandardMaterial color={colors.neck} roughness={0.42} metalness={0.02} />
          </mesh>
          {[-0.22, 0, 0.22].map((x, i) => (
            <group key={x}>
              <mesh position={[x, 2.18 - i * 0.24, 0.13]}>
                <cylinderGeometry args={[0.055, 0.055, 0.035, 18]} />
                <meshStandardMaterial color={hardwareColor} roughness={0.2} metalness={0.9} />
              </mesh>
              <mesh position={[-x, 1.78 - i * 0.24, 0.13]}>
                <cylinderGeometry args={[0.055, 0.055, 0.035, 18]} />
                <meshStandardMaterial color={hardwareColor} roughness={0.2} metalness={0.9} />
              </mesh>
            </group>
          ))}
        </group>

        <mesh position={[0.15, -0.48, 0.055]} scale={[0.88, 0.9, 1]} castShadow>
          <shapeGeometry args={[pickguardShape]} />
          <meshStandardMaterial color="#F2EEE2" roughness={0.34} metalness={0.02} />
        </mesh>

        {pickupLayout.map((kind, i) => (
          <group key={`${kind}-${i}`} position={[0.12, pickupYs[i] - 0.38, 0.11]} rotation={[0, 0, -0.08]}>
            <mesh castShadow>
              <boxGeometry args={[kind === 'single' ? 0.72 : kind === 'p90' ? 0.82 : 0.9, kind === 'single' ? 0.14 : 0.24, 0.08]} />
              <meshStandardMaterial color={kind === 'single' || kind === 'p90' ? '#EFE9D7' : '#08080A'} roughness={0.3} metalness={kind === 'hum' ? 0.35 : 0.08} />
            </mesh>
            {kind === 'hum' && (
              <lineSegments position={[0, 0, 0.047]}>
                <edgesGeometry args={[new THREE.BoxGeometry(0.92, 0.25, 0.01)]} />
                <lineBasicMaterial color={hardwareColor} />
              </lineSegments>
            )}
          </group>
        ))}

        <group position={[0.02, bridgeY - 0.38, 0.13]} rotation={[0, 0, -0.08]}>
          <mesh castShadow>
            <boxGeometry args={[store.bridge === 'trem' || store.bridge === 'bigsby' ? 1.0 : 0.82, 0.2, 0.11]} />
            <meshStandardMaterial color={hardwareColor} roughness={0.2} metalness={0.9} />
          </mesh>
          {(store.bridge === 'trem' || store.bridge === 'bigsby') && (
            <mesh position={[0.52, -0.14, 0.02]} rotation={[0, 0, -0.55]}>
              <boxGeometry args={[0.08, 0.72, 0.05]} />
              <meshStandardMaterial color={hardwareColor} roughness={0.2} metalness={0.9} />
            </mesh>
          )}
        </group>

        <group>
          {[0.7, 0.98, 1.18].map((x, i) => (
            <mesh key={x} position={[x, -0.78 - i * 0.28, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.085, 0.085, 0.055, 24]} />
              <meshStandardMaterial color={hardwareColor} roughness={0.2} metalness={0.9} />
            </mesh>
          ))}
        </group>
        <mesh position={[1.28, -1.1, 0.12]} rotation={[0, 0, -0.58]}>
          <boxGeometry args={[0.34, 0.12, 0.06]} />
          <meshStandardMaterial color={hardwareColor} roughness={0.2} metalness={0.9} />
        </mesh>

        {[-0.15, -0.09, -0.03, 0.03, 0.09, 0.15].map((x, i) => (
          <mesh key={x} position={[x - 0.04, 0.28, 0.19]} rotation={[0, 0, -0.055]}>
            <boxGeometry args={[0.008, 3.62 + i * 0.018, 0.008]} />
            <meshStandardMaterial color="#DDE2EA" roughness={0.2} metalness={0.78} />
          </mesh>
        ))}
      </group>
    </Center>
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
  const shape = useConfigStore(s => s.shape)

  return (
    <>
      <ambientLight intensity={0.42} />
      <directionalLight position={[4.5, 7, 4]} intensity={1.35} castShadow shadow-mapSize={[2048, 2048]} />
      <spotLight position={[-4, 4, 4]} angle={0.45} penumbra={0.7} intensity={0.8} color="#E2C07A" castShadow />
      <pointLight position={[3, -1, 3]} color="#fff6df" intensity={0.42} />
      <Environment preset="studio" />
      <ContactShadows position={[0, -2.35, -0.06]} opacity={0.32} scale={7.2} blur={3.1} far={4} color="#000000" />
      <Suspense fallback={<ModelLoading />}>
        {shape === 'modern-s' ? (
          <Bounds fit clip observe margin={1.18}>
            <SStyleElectric view={view} />
          </Bounds>
        ) : (
          <Bounds fit clip observe margin={1.28}>
            <GlbInstrument view={view} />
          </Bounds>
        )}
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
