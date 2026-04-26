'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bounds, Center, ContactShadows, Environment, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigStore } from '@/store/configStore'
import { BODY_SHAPES, FINISHES, FRETBOARDS, HARDWARE_COLORS, KNOBS, NECK_WOODS, PICKGUARDS, SWITCH_TIPS } from '@/lib/configurator-options'

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
type FinishOption = { id: string; hex?: string; roughness?: number; kind?: string }
type SvgFinishOption = FinishOption & { centerHex?: string; midHex?: string; edgeHex?: string; kind?: string }

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
    shader.uniforms.uIsBurst = { value: finish?.kind === 'burst' ? 1 : 0 }
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

const BODY_PATH = 'M92 286 C38 258 32 180 78 134 C118 95 178 99 219 128 C255 100 314 103 354 139 C385 167 401 202 395 239 C458 247 488 279 477 326 C466 374 407 395 356 371 C324 411 252 429 201 393 C150 420 84 396 70 338 C64 315 71 297 92 286 Z'

function optionHex(options: { id: string; hex?: string }[], id: string, fallback: string) {
  return options.find(o => o.id === id)?.hex ?? fallback
}

function SStyleConfiguratorPreview({ view }: { view: 'standard' | 'detail' | 'reset' }) {
  const store = useConfigStore()
  const finish = FINISHES.find(f => f.id === store.finish) as SvgFinishOption | undefined
  const neck = NECK_WOODS.find(n => n.id === store.neck)
  const board = FRETBOARDS.find(f => f.id === store.fretboard)
  const hw = HARDWARE_COLORS.find(h => h.id === store.hardware)
  const colors = makeColors(finish, neck, board, hw)
  const pickguard = optionHex(PICKGUARDS, store.pickguard, '#EEE8D6')
  const knobs = optionHex(KNOBS, store.knobs, '#E8DEBF')
  const switchTip = optionHex(SWITCH_TIPS, store.switchTip, '#E8DEBF')
  const isBurst = finish?.kind === 'burst'
  const bodyFill = isBurst ? 'url(#sStyleBurst)' : (finish?.hex ?? colors.finish)
  const zoom = view === 'detail' ? 'scale(1.14) translate(-36px, -4px)' : 'scale(1)'

  const SingleCoil = ({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) => (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect x="-28" y="-11" width="56" height="22" rx="9" fill="#F3EEE0" stroke="#1d1814" strokeWidth="2.4" />
      {[...Array(6)].map((_, i) => <circle key={i} cx={-18 + i * 7.2} cy="0" r="1.9" fill={colors.hardware} />)}
    </g>
  )
  const Humbucker = ({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) => (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect x="-34" y="-18" width="68" height="36" rx="5" fill="#111114" stroke={colors.hardware} strokeWidth="3" />
      <rect x="-28" y="-12" width="25" height="24" rx="3" fill="#232329" />
      <rect x="3" y="-12" width="25" height="24" rx="3" fill="#232329" />
      {[...Array(6)].map((_, i) => <circle key={i} cx={-21 + i * 8.4} cy="0" r="1.8" fill={colors.hardware} />)}
    </g>
  )
  const P90 = ({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) => (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect x="-35" y="-15" width="70" height="30" rx="8" fill="#F1EAD9" stroke="#1d1814" strokeWidth="2.6" />
      {[...Array(6)].map((_, i) => <circle key={i} cx={-22 + i * 8.8} cy="0" r="2.2" fill={colors.hardware} />)}
    </g>
  )
  const pickups = store.pickups === 'hss'
    ? [<Humbucker key="bridge" x={342} y={256} rotate={-8} />, <SingleCoil key="middle" x={280} y={235} rotate={-8} />, <SingleCoil key="neck" x={219} y={216} rotate={-8} />]
    : store.pickups === 'hh'
      ? [<Humbucker key="bridge" x={335} y={256} rotate={-8} />, <Humbucker key="neck" x={226} y={218} rotate={-8} />]
      : store.pickups === 'p90'
        ? [<P90 key="bridge" x={335} y={256} rotate={-8} />, <P90 key="neck" x={225} y={218} rotate={-8} />]
        : [<SingleCoil key="bridge" x={342} y={256} rotate={-8} />, <SingleCoil key="middle" x={280} y={235} rotate={-8} />, <SingleCoil key="neck" x={219} y={216} rotate={-8} />]

  return (
    <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at 46% 42%, #15171d 0%, #050608 68%)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <svg viewBox="0 0 1180 520" role="img" aria-label="Realistic S-Style electric guitar preview" style={{ width: 'min(98%, 1280px)', height: 'min(86%, 620px)', filter: 'drop-shadow(0 34px 58px rgba(0,0,0,0.62))', transition: 'transform 0.28s ease', transform: zoom }}>
        <defs>
          <radialGradient id="sStyleBurst" cx="50%" cy="52%" r="62%">
            <stop offset="0%" stopColor={finish?.centerHex ?? '#F6B84A'} />
            <stop offset="42%" stopColor={finish?.midHex ?? finish?.hex ?? '#B33116'} />
            <stop offset="76%" stopColor={finish?.edgeHex ?? '#120503'} />
            <stop offset="100%" stopColor="#030202" />
          </radialGradient>
          <linearGradient id="sStyleBodyGloss" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
            <stop offset="42%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.28)" />
          </linearGradient>
          <linearGradient id="sStyleNeckGrain" x1="0" x2="1">
            <stop offset="0%" stopColor={colors.neck} />
            <stop offset="46%" stopColor="#E0B76D" />
            <stop offset="100%" stopColor={colors.neck} />
          </linearGradient>
          <linearGradient id="sStyleMetal" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#F1F3F4" />
            <stop offset="45%" stopColor={colors.hardware} />
            <stop offset="100%" stopColor="#575C64" />
          </linearGradient>
        </defs>
        <g transform="translate(52 34)">
          <g stroke="#DDE3E9" strokeWidth="1.35" opacity={store.strings === 'stainless-10' ? 0.96 : 0.72}>
            {[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1={178} y1={256 + i * 5.8} x2={1042} y2={203 + i * 9.4} />)}
          </g>

          <path d="M396 202 L972 202 L972 280 L396 280 Z" fill="url(#sStyleNeckGrain)" stroke="#2a1608" strokeWidth="5" />
          <path d="M406 213 L950 213 L950 268 L406 268 Z" fill={colors.board} stroke="#120807" strokeWidth="2" />
          {[435, 467, 499, 532, 566, 603, 641, 683, 728, 776, 828, 884, 944].map(x => <line key={x} x1={x} x2={x} y1="213" y2="268" stroke="#B7BDC4" strokeWidth="2" opacity="0.78" />)}
          {[498, 566, 641, 728, 828, 912].map(x => <circle key={x} cx={x} cy="240" r="4.2" fill="#DCD6C8" opacity="0.86" />)}

          <path d="M950 190 C1006 179 1064 187 1110 211 C1119 216 1113 232 1102 232 L950 232 Z" fill="url(#sStyleNeckGrain)" stroke="#2a1608" strokeWidth="5" />
          <g fill="url(#sStyleMetal)" stroke="#2b2f35" strokeWidth="2">
            {[973, 1000, 1027, 1054, 1081, 1108].map((x, i) => <circle key={i} cx={x} cy={i < 3 ? 198 : 225} r={8.2} />)}
            {[973, 1000, 1027, 1054, 1081, 1108].map((x, i) => <rect key={`post-${i}`} x={x - 4} y={i < 3 ? 181 : 232} width="8" height="17" rx="3" fill={store.tuners === 'locking' || store.tuners === 'staggered' ? '#1B1C20' : colors.hardware} />)}
          </g>

          <g transform="translate(70 34) rotate(-2 230 260)">
            <path d={BODY_PATH} fill="#060607" opacity="0.72" transform="translate(13 16)" />
            <path d={BODY_PATH} fill={bodyFill} stroke="#111114" strokeWidth="9" strokeLinejoin="round" />
            {isBurst ? (
              <path d={BODY_PATH} fill="url(#sStyleBodyGloss)" opacity="0.5" />
            ) : (
              <path d={BODY_PATH} fill="rgba(255,255,255,0.08)" opacity="0.45" />
            )}
            <path d="M116 286 C92 244 110 174 153 143 C190 116 240 126 270 161 C233 181 210 212 209 250 C207 291 236 328 278 341 C239 373 185 369 151 337 C133 321 123 304 116 286 Z" fill="rgba(0,0,0,0.28)" opacity="0.36" />

            <path d="M150 303 C140 249 161 173 224 150 C273 132 340 151 386 199 C367 223 362 255 379 286 C345 307 292 322 232 331 C192 337 163 328 150 303 Z" fill={pickguard} stroke="rgba(0,0,0,0.55)" strokeWidth="3.5" />
            <path d="M164 295 C157 249 176 190 226 169 C269 152 327 166 366 203 C348 225 346 254 361 278 C330 296 285 306 235 313 C197 318 171 312 164 295 Z" fill="rgba(255,255,255,0.22)" opacity={store.pickguard === 'black' ? 0.08 : 0.38} />
            {store.pickguard === 'tortoise' && (
              <g opacity="0.45" fill="#C46B2D">
                <ellipse cx="206" cy="190" rx="28" ry="13" transform="rotate(-24 206 190)" />
                <ellipse cx="292" cy="205" rx="34" ry="15" transform="rotate(17 292 205)" />
                <ellipse cx="241" cy="288" rx="40" ry="16" transform="rotate(-13 241 288)" />
              </g>
            )}

            {pickups}

            {store.bridge === 'hardtail' ? (
              <g transform="translate(366 305) rotate(-7)">
                <rect x="-43" y="-18" width="86" height="36" rx="5" fill="url(#sStyleMetal)" stroke="#2b2f35" strokeWidth="3" />
                {[...Array(6)].map((_, i) => <rect key={i} x={-28 + i * 11} y="-11" width="7" height="22" rx="2" fill="#CDD2D8" stroke="#444951" />)}
              </g>
            ) : store.bridge === 'locking-tremolo' ? (
              <g transform="translate(367 304) rotate(-7)">
                <rect x="-48" y="-20" width="96" height="40" rx="5" fill="url(#sStyleMetal)" stroke="#2b2f35" strokeWidth="3" />
                {[...Array(6)].map((_, i) => <rect key={i} x={-33 + i * 12} y="-13" width="8" height="26" rx="2" fill="#1C1E23" stroke="#B8BEC7" />)}
                <circle cx="54" cy="-20" r="5" fill={colors.hardware} />
                <line x1="56" y1="-21" x2="100" y2="-55" stroke={colors.hardware} strokeWidth="5" strokeLinecap="round" />
              </g>
            ) : (
              <g transform="translate(365 304) rotate(-7)">
                <rect x="-44" y="-18" width="88" height="36" rx="5" fill="url(#sStyleMetal)" stroke="#2b2f35" strokeWidth="3" />
                {[...Array(6)].map((_, i) => <rect key={i} x={-31 + i * 11.5} y="-11" width="7" height="22" rx="2" fill="#E4E7EA" stroke="#545A62" />)}
                <circle cx="48" cy="-18" r="4" fill={colors.hardware} />
                <line x1="50" y1="-20" x2="92" y2="-54" stroke={colors.hardware} strokeWidth="4" strokeLinecap="round" />
              </g>
            )}

            <g fill={knobs} stroke="#9E967D" strokeWidth="2.4">
              <circle cx="367" cy="345" r="16" />
              <circle cx="421" cy="316" r="16" />
              <circle cx="430" cy="263" r="10" fill={switchTip} />
            </g>
            <path d="M410 286 L446 244" stroke={colors.hardware} strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="124" cy="335" rx="31" ry="20" transform="rotate(-42 124 335)" fill="url(#sStyleMetal)" stroke="#2b2f35" strokeWidth="4" />
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
      {shape === 'modern-s' ? (
        <SStyleConfiguratorPreview view={view} />
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
