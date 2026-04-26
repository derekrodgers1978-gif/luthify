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

type MaterialRole = 'body' | 'neck' | 'fretboard' | 'hardware' | 'pickup' | 'bridge' | 'protected' | 'other'
type FinishOption = { id: string; hex?: string; roughness?: number }

const MODEL_PATHS = BODY_SHAPES.filter(shape => shape.id !== 'modern-s').map(shape => shape.modelPath).filter(Boolean) as string[]
MODEL_PATHS.forEach(path => useGLTF.preload(path))

const S_STYLE_BODY_PATH = 'M223 451 C175 435 140 397 143 349 C146 309 168 280 203 264 C184 238 187 207 211 185 C241 158 286 162 309 197 C330 158 379 146 416 169 C454 193 464 236 439 269 C485 282 512 326 497 370 C482 415 435 442 383 435 C364 476 317 499 271 480 C248 470 235 459 223 451 Z'

function hardwareColor(id?: string) {
  if (id === 'gold' || id === 'aged-brass') return '#C9A45C'
  if (id === 'black') return '#111116'
  return '#C9CED6'
}

function pickupPalette(id: string) {
  if (id === 'active-hum') return { cover: '#08080A', pole: '#23232A', rail: '#3A3A42' }
  if (id === 'p90') return { cover: '#ECE2C6', pole: '#4C4639', rail: '#B8AA86' }
  if (id === 'singlecoil') return { cover: '#F2EEE2', pole: '#3C3C3F', rail: '#BEB6A2' }
  return { cover: '#16161A', pole: '#D8DDE5', rail: '#3A3A42' }
}

function pickguardColor(id: string) {
  return PICKGUARDS.find(guard => guard.id === id)?.hex ?? '#F2EEE2'
}

function SStylePickup({ type, x, y, rotation = -8, color }: { type: 'single' | 'hum' | 'p90'; x: number; y: number; rotation?: number; color: ReturnType<typeof pickupPalette> }) {
  const isHum = type === 'hum'
  const isP90 = type === 'p90'
  const width = isHum ? 76 : isP90 ? 72 : 62
  const height = isHum ? 44 : isP90 ? 34 : 28

  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation})`} filter="url(#sStylePartShadow)">
      <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={isP90 ? 15 : 8} fill={color.cover} stroke="rgba(0,0,0,0.55)" strokeWidth="3" />
      {isHum && (
        <>
          <rect x="-31" y="-14" width="27" height="28" rx="4" fill="rgba(255,255,255,0.05)" stroke={color.rail} strokeWidth="2" />
          <rect x="4" y="-14" width="27" height="28" rx="4" fill="rgba(255,255,255,0.05)" stroke={color.rail} strokeWidth="2" />
        </>
      )}
      {isP90 ? (
        <line x1="-24" x2="24" y1="0" y2="0" stroke={color.rail} strokeWidth="5" strokeLinecap="round" />
      ) : (
        [-22, -13, -4, 5, 14, 23].map(cx => <circle key={cx} cx={cx} cy="0" r="3.1" fill={color.pole} />)
      )}
    </g>
  )
}

function SStylePickups({ selection }: { selection: string }) {
  const color = pickupPalette(selection)
  if (selection === 'dual-hum' || selection === 'active-hum') {
    return (
      <>
        <SStylePickup type="hum" x={276} y={280} color={color} />
        <SStylePickup type="hum" x={352} y={315} color={color} />
      </>
    )
  }
  if (selection === 'hss') {
    return (
      <>
        <SStylePickup type="single" x={248} y={268} color={pickupPalette('singlecoil')} />
        <SStylePickup type="single" x={306} y={292} color={pickupPalette('singlecoil')} />
        <SStylePickup type="hum" x={368} y={321} color={color} />
      </>
    )
  }
  const type = selection === 'p90' ? 'p90' : 'single'
  return (
    <>
      <SStylePickup type={type} x={248} y={268} color={color} />
      <SStylePickup type={type} x={306} y={292} color={color} />
      <SStylePickup type={type} x={365} y={318} color={color} />
    </>
  )
}

function SStyleBridge({ bridge, metal }: { bridge: string; metal: string }) {
  if (bridge === 'bigsby') {
    return (
      <g filter="url(#sStylePartShadow)">
        <rect x="342" y="356" width="108" height="22" rx="11" fill={metal} stroke="#1E2025" strokeWidth="3" />
        <rect x="326" y="332" width="72" height="24" rx="9" fill={metal} stroke="#1E2025" strokeWidth="3" />
        <path d="M406 366 C452 389 457 424 424 444" fill="none" stroke={metal} strokeWidth="7" strokeLinecap="round" />
        <circle cx="423" cy="444" r="7" fill="#EDE6D4" stroke="#1E2025" strokeWidth="2" />
      </g>
    )
  }
  if (bridge === 'hardtail') {
    return (
      <g filter="url(#sStylePartShadow)">
        <rect x="320" y="330" width="100" height="34" rx="10" fill={metal} stroke="#1E2025" strokeWidth="3" />
        {[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={331 + i * 13} y="336" width="8" height="20" rx="2" fill="rgba(255,255,255,0.35)" stroke="#333740" strokeWidth="1" />)}
      </g>
    )
  }
  if (bridge === 'trem') {
    return (
      <g filter="url(#sStylePartShadow)">
        <rect x="316" y="327" width="108" height="40" rx="10" fill={metal} stroke="#1E2025" strokeWidth="3" />
        <rect x="331" y="337" width="70" height="16" rx="5" fill="rgba(255,255,255,0.25)" />
        <path d="M403 355 C446 375 452 411 424 435" fill="none" stroke={metal} strokeWidth="7" strokeLinecap="round" />
        <circle cx="424" cy="435" r="7" fill="#EDE6D4" stroke="#1E2025" strokeWidth="2" />
      </g>
    )
  }
  return (
    <g filter="url(#sStylePartShadow)">
      <rect x="312" y="323" width="105" height="22" rx="8" fill={metal} stroke="#1E2025" strokeWidth="3" />
      <rect x="330" y="356" width="110" height="18" rx="9" fill={metal} stroke="#1E2025" strokeWidth="3" />
    </g>
  )
}

function SStyleLayeredPreview({ view }: { view: 'standard' | 'detail' | 'reset' }) {
  const store = useConfigStore()
  const finish = FINISHES.find(f => f.id === store.finish)
  const neck = NECK_WOODS.find(n => n.id === store.neck)
  const board = FRETBOARDS.find(f => f.id === store.fretboard)
  const colors = makeColors(finish, neck, board, { id: store.hardware })
  const metal = hardwareColor(store.hardware)
  const bodyFill = finish?.id === 'sunburst' ? '#D6943E' : colors.finish
  const guardFill = pickguardColor(store.pickguard)
  const zoom = view === 'detail' ? 1.16 : 1

  return (
    <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 45%, #17151a 0%, #09090B 62%)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <svg viewBox="0 0 880 620" role="img" aria-label="Layered S-Style electric guitar preview" style={{ width: 'min(94%, 1040px)', height: 'min(90%, 680px)', transform: `scale(${zoom})`, transition: 'transform 0.28s ease', filter: 'drop-shadow(0 32px 64px rgba(0,0,0,0.5))' }}>
        <defs>
          <filter id="sStylePartShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.35" />
          </filter>
          <clipPath id="sStyleBodyClip">
            <path d={S_STYLE_BODY_PATH} />
          </clipPath>
          <radialGradient id="sStyleBurstOverlay" cx="45%" cy="43%" r="72%">
            <stop offset="0%" stopColor="#F3B65B" stopOpacity="0.02" />
            <stop offset="42%" stopColor={colors.finish} stopOpacity="0.2" />
            <stop offset="72%" stopColor={colors.finish} stopOpacity="0.74" />
            <stop offset="100%" stopColor="#100604" stopOpacity="0.96" />
          </radialGradient>
          <linearGradient id="sStyleGloss" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
            <stop offset="42%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="sStyleNeckGrain" x1="0" x2="1">
            <stop offset="0%" stopColor={colors.neck} />
            <stop offset="50%" stopColor="#E0BE72" stopOpacity="0.42" />
            <stop offset="100%" stopColor={colors.neck} />
          </linearGradient>
        </defs>
        <g transform="translate(102 40) rotate(-12 350 270)">
          {/* neck */}
          <rect x="382" y="252" width="328" height="58" rx="10" fill="url(#sStyleNeckGrain)" stroke="#2B1609" strokeWidth="4" />
          {[416, 460, 504, 548, 592, 636, 680].map(x => <line key={x} x1={x} x2={x} y1="254" y2="308" stroke="rgba(92,47,23,0.24)" strokeWidth="2" />)}

          {/* fretboard */}
          <rect x="383" y="266" width="330" height="31" rx="8" fill={colors.board} stroke="rgba(0,0,0,0.58)" strokeWidth="3" />
          {[418, 456, 493, 529, 564, 598, 631, 663, 694].map(x => <line key={x} x1={x} x2={x} y1="266" y2="297" stroke="#C9CED6" strokeWidth="2" opacity="0.9" />)}
          {[474, 546, 612, 676].map(x => <circle key={x} cx={x} cy="281.5" r="3.1" fill="#D7D1BD" opacity="0.78" />)}

          {/* tuners */}
          <path d="M704 239 C737 218 783 222 803 248 C790 262 770 269 735 267 L735 306 C765 309 788 320 804 340 C776 357 735 351 704 323 Z" fill={colors.neck} stroke="#2B1609" strokeWidth="5" strokeLinejoin="round" />
          <g fill={metal} stroke="#1E2025" strokeWidth="2.2" filter="url(#sStylePartShadow)">
            {[0, 1, 2].map(i => <circle key={`top-${i}`} cx={748 + i * 23} cy={242 + i * 4} r="7" />)}
            {[0, 1, 2].map(i => <circle key={`bottom-${i}`} cx={748 + i * 22} cy={327 - i * 4} r="7" />)}
          </g>

          {/* body */}
          <path d={S_STYLE_BODY_PATH} fill={bodyFill} stroke="rgba(246,240,224,0.62)" strokeWidth="7" strokeLinejoin="round" />

          {/* burst overlay */}
          {finish?.id === 'sunburst' && <path d={S_STYLE_BODY_PATH} fill="url(#sStyleBurstOverlay)" />}
          <path d="M190 398 C162 365 165 315 203 286 C236 260 266 252 305 230 C343 207 394 215 427 248 C394 247 369 260 343 284 C303 321 263 373 190 398 Z" fill="url(#sStyleGloss)" clipPath="url(#sStyleBodyClip)" opacity="0.58" />

          {/* pickguard */}
          <path
            d="M220 239 C251 217 302 207 344 223 C368 233 381 250 392 271 C415 285 433 311 431 342 C409 360 383 375 349 379 C309 385 266 375 235 353 C215 338 205 314 212 291 C218 270 238 259 258 255 C240 253 228 248 220 239 Z"
            fill={guardFill}
            stroke="#D7D0BE"
            strokeWidth="5"
            strokeLinejoin="round"
            filter="url(#sStylePartShadow)"
          />
          <path d="M241 251 C273 235 327 230 356 247" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="2" />

          {/* pickups */}
          <SStylePickups selection={store.pickups} />

          {/* bridge and trem arm */}
          <SStyleBridge bridge={store.bridge} metal={metal} />

          {/* knobs and switch */}
          <g filter="url(#sStylePartShadow)">
            <path d="M389 271 L427 253" stroke={metal} strokeWidth="5" strokeLinecap="round" />
            <circle cx="388" cy="271" r="5" fill="#16161A" />
            {[0, 1, 2].map(i => (
              <circle key={i} cx={401 + i * 26} cy={390 - i * 18} r="14" fill="#F4F0E4" stroke={metal} strokeWidth="4" />
            ))}
          </g>

          {/* strings */}
          <g stroke="#E2E7EF" strokeLinecap="round" opacity="0.78">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <line key={i} x1={337 + i * 8} x2={747 + i * 8} y1={334 + i * 4} y2={259 + i * 13} strokeWidth={1.1 + i * 0.12} />
            ))}
          </g>
        </g>
      </svg>
    </div>
  )
}

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
  const showSStylePreview = shape === 'modern-s'

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {showSStylePreview ? (
        <SStyleLayeredPreview view={view} />
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
