'use client'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bounds, Center, ContactShadows, Environment, Html, OrbitControls, Preload, useGLTF, useProgress } from '@react-three/drei'
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

function SStyleIllustration({ view }: { view: 'standard' | 'detail' | 'reset' }) {
  const store = useConfigStore()
  const finish = FINISHES.find(f => f.id === store.finish)
  const neck = NECK_WOODS.find(n => n.id === store.neck)
  const board = FRETBOARDS.find(f => f.id === store.fretboard)
  const hw = HARDWARE_COLORS.find(h => h.id === store.hardware)
  const colors = makeColors(finish, neck, board, hw)
  const bodyFill = finish?.id === 'sunburst' ? 'url(#sStyleBurst)' : colors.finish
  const isZoomed = view === 'detail'

  const pickupLayout = store.pickups === 'singlecoil'
    ? ['single', 'single', 'single']
    : store.pickups === 'hss'
      ? ['single', 'single', 'hum']
      : store.pickups === 'p90'
        ? ['p90', 'p90']
        : ['hum', 'hum']
  const bridgeLabel = store.bridge === 'bigsby'
    ? 'vibrato-tail'
    : store.bridge === 'trem'
      ? 'locking-trem'
      : store.bridge === 'hardtail'
        ? 'hardtail'
        : 'tuneomatic'
  const pickupXs = pickupLayout.length === 3 ? [214, 286, 358] : [250, 350]

  return (
    <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 45%, #17151a 0%, #09090B 62%)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <svg viewBox="0 0 900 520" role="img" aria-label="S-Style Electric finish preview" style={{ width: isZoomed ? 'min(102%, 980px)' : 'min(90%, 940px)', height: isZoomed ? 'min(94%, 620px)' : 'min(82%, 560px)', transform: isZoomed ? 'translateY(8px) scale(1.06)' : 'translateY(0)', transition: 'transform 280ms ease, width 280ms ease, height 280ms ease', filter: 'drop-shadow(0 30px 68px rgba(0,0,0,0.52))' }}>
        <defs>
          <radialGradient id="sStyleBurst" cx="36%" cy="48%" r="70%">
            <stop offset="0%" stopColor="#F4B04A" />
            <stop offset="42%" stopColor={colors.finish} />
            <stop offset="84%" stopColor="#180704" />
            <stop offset="100%" stopColor="#080302" />
          </radialGradient>
          <linearGradient id="sStyleBodyGloss" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.24)" />
          </linearGradient>
          <linearGradient id="sStyleMetal" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#F6F7F2" />
            <stop offset="42%" stopColor={colors.hardware} />
            <stop offset="100%" stopColor="#4A4D55" />
          </linearGradient>
          <linearGradient id="sStyleNeckGrain" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="42%" stopColor={colors.neck} />
            <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
          </linearGradient>
        </defs>

        <g transform="translate(26 8) rotate(-4 452 260)">
          <g data-part="body">
            <path
              d="M391 227 C352 172 300 151 250 174 C221 187 207 212 213 239 C217 259 232 270 256 274 C212 287 180 321 171 367 C160 425 201 472 266 476 C319 479 363 450 383 405 C405 455 465 468 515 435 C562 404 578 350 551 306 C532 275 501 262 462 268 C501 247 515 211 492 185 C462 151 413 177 391 227 Z"
              fill="#EEE7D6"
              stroke="#D8C89E"
              strokeWidth="16"
              strokeLinejoin="round"
            />
            <path
              d="M391 227 C352 172 300 151 250 174 C221 187 207 212 213 239 C217 259 232 270 256 274 C212 287 180 321 171 367 C160 425 201 472 266 476 C319 479 363 450 383 405 C405 455 465 468 515 435 C562 404 578 350 551 306 C532 275 501 262 462 268 C501 247 515 211 492 185 C462 151 413 177 391 227 Z"
              fill={bodyFill}
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M246 291 C207 308 190 341 194 375 C201 425 243 455 292 452 C337 449 365 420 381 386 C410 427 460 436 501 407 C535 383 543 337 520 309 C498 282 462 281 427 294 C462 263 469 225 442 211 C415 198 391 222 375 262 C341 224 296 226 271 250 C254 266 250 282 246 291 Z" fill="url(#sStyleBodyGloss)" opacity="0.62" />
            <path d="M229 391 C257 423 315 427 358 391" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="4" strokeLinecap="round" />
            <path d="M412 237 C433 212 460 206 481 219" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="4" strokeLinecap="round" />
          </g>

          <g data-part="neck">
            <path d="M350 240 L720 226 L724 276 L352 286 Z" fill="url(#sStyleNeckGrain)" stroke="#2a1609" strokeWidth="4" />
          </g>
          <g data-part="fretboard">
            <path d="M363 250 L718 238 L721 265 L364 276 Z" fill={colors.board} stroke="#110805" strokeWidth="3" />
            {[435, 470, 506, 542, 578, 614, 650, 686].map(x => (
              <line key={x} x1={x} x2={x + 2} y1="246" y2="268" stroke="#D5D8D8" strokeWidth="2" opacity="0.86" />
            ))}
            {[488, 560, 632].map(x => <circle key={x} cx={x} cy="257" r="3.2" fill="#D9CBA4" opacity="0.8" />)}
          </g>
          <g data-part="tuners">
            <path d="M715 219 C750 195 794 199 826 226 C821 252 796 273 762 278 L724 276 L720 226 Z" fill={colors.neck} stroke="#1a0d07" strokeWidth="5" />
            {[0, 1, 2].map(i => (
              <g key={`top-${i}`} transform={`translate(${744 + i * 25} ${218 - i * 6})`}>
                <circle r="5.8" fill="url(#sStyleMetal)" stroke="#26282d" strokeWidth="2" />
                <rect x="-5" y="-24" width="10" height="16" rx="4" fill="url(#sStyleMetal)" stroke="#26282d" strokeWidth="2" />
              </g>
            ))}
            {[0, 1, 2].map(i => (
              <g key={`bottom-${i}`} transform={`translate(${746 + i * 25} ${270 - i * 3})`}>
                <circle r="5.8" fill="url(#sStyleMetal)" stroke="#26282d" strokeWidth="2" />
                <rect x="-5" y="8" width="10" height="16" rx="4" fill="url(#sStyleMetal)" stroke="#26282d" strokeWidth="2" />
              </g>
            ))}
          </g>

          <g data-part="pickguard">
            <path
              d="M216 288 C260 255 326 252 373 280 C409 301 453 305 501 286 C530 314 532 363 501 396 C465 434 404 424 360 391 C323 363 286 360 246 389 C220 366 204 319 216 288 Z"
              fill="#F2EEE2"
              stroke="#D7D0C2"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <rect x="342" y="248" width="60" height="38" rx="12" fill="#F2EEE2" stroke="#D7D0C2" strokeWidth="4" />
            <path d="M236 296 C292 270 344 275 383 299 C422 322 464 322 503 301" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
          </g>

          <g data-part="pickups">
            {pickupLayout.map((type, i) => {
              const x = pickupXs[i]
              const width = type === 'single' ? 24 : type === 'p90' ? 34 : 38
              const height = type === 'single' ? 86 : 102
              const y = 287 - (height - 86) / 2
              return (
                <g key={`${type}-${i}`} transform={`rotate(84 ${x + width / 2} ${y + height / 2})`}>
                  <rect x={x} y={y} width={width} height={height} rx={type === 'single' ? 10 : 7} fill={type === 'p90' ? '#EEE7D6' : '#07070A'} stroke={type === 'p90' ? '#1E2025' : '#D5D8D8'} strokeWidth="3" />
                  {type === 'hum' && <line x1={x + width / 2} x2={x + width / 2} y1={y + 4} y2={y + height - 4} stroke="#2E3036" strokeWidth="2" />}
                  {[0, 1, 2, 3, 4, 5].map(p => (
                    <circle key={p} cx={x + width / 2} cy={y + 17 + p * ((height - 34) / 5)} r="2.2" fill={type === 'p90' ? colors.hardware : '#C9CED6'} opacity="0.9" />
                  ))}
                </g>
              )
            })}
          </g>

          <g data-part="bridge">
            <rect x="414" y="314" width="126" height="25" rx="7" fill="url(#sStyleMetal)" stroke="#20232A" strokeWidth="3" />
            {[0, 1, 2, 3, 4, 5].map(i => (
              <rect key={i} x={423 + i * 18} y="309" width="12" height="35" rx="3" fill={colors.hardware} stroke="#25272d" strokeWidth="1.4" />
            ))}
            {bridgeLabel === 'vibrato-tail' && <path d="M537 330 C584 353 590 389 558 413" fill="none" stroke="url(#sStyleMetal)" strokeWidth="8" strokeLinecap="round" />}
            {bridgeLabel === 'locking-trem' && <rect x="408" y="346" width="139" height="18" rx="7" fill="url(#sStyleMetal)" stroke="#20232A" strokeWidth="3" />}
            {bridgeLabel === 'hardtail' && <rect x="430" y="348" width="93" height="16" rx="6" fill="url(#sStyleMetal)" stroke="#20232A" strokeWidth="3" />}
            {bridgeLabel === 'tuneomatic' && <rect x="407" y="355" width="140" height="17" rx="8" fill="url(#sStyleMetal)" stroke="#20232A" strokeWidth="3" />}
          </g>

          <g data-part="knobs" fill="url(#sStyleMetal)" stroke="#20232A" strokeWidth="3">
            <circle cx="443" cy="380" r="16" />
            <circle cx="483" cy="398" r="15" />
            <circle cx="407" cy="411" r="14" />
          </g>

          <g data-part="switch" transform="rotate(-16 473 294)">
            <rect x="452" y="287" width="44" height="12" rx="6" fill="#EEE7D6" stroke="#20232A" strokeWidth="2.5" />
            <line x1="474" x2="492" y1="293" y2="273" stroke="url(#sStyleMetal)" strokeWidth="4" strokeLinecap="round" />
            <circle cx="495" cy="270" r="5" fill={colors.hardware} stroke="#20232A" strokeWidth="2" />
          </g>

          <g data-part="strings" stroke="#DDE2EA" strokeLinecap="round" opacity="0.86">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <line key={i} x1="187" y1={322 + i * 5} x2={805} y2={240 + i * 5} strokeWidth={1.1 + i * 0.14} />
            ))}
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
  const showSStyleIllustration = shape === 'modern-s'
  const showSingleCutFallback = webglLost && shape === 'single-cut'

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {showSStyleIllustration ? (
        <SStyleIllustration view={view} />
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
