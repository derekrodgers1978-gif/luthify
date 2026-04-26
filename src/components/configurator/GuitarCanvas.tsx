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

  const pickupYs = pickupLayout.length === 3 ? [235, 286, 337] : [251, 322]

  return (
    <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 45%, #17151a 0%, #09090B 62%)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <svg viewBox="0 0 900 620" role="img" aria-label="S-Style Electric finish preview" style={{ width: isZoomed ? 'min(102%, 980px)' : 'min(88%, 900px)', height: isZoomed ? 'min(96%, 660px)' : 'min(86%, 620px)', transform: isZoomed ? 'translateY(18px) scale(1.08)' : 'translateY(2px)', transition: 'transform 280ms ease, width 280ms ease, height 280ms ease', filter: 'drop-shadow(0 30px 68px rgba(0,0,0,0.52))' }}>
        <defs>
          <radialGradient id="sStyleBurst" cx="46%" cy="54%" r="66%">
            <stop offset="0%" stopColor="#F4B04A" />
            <stop offset="42%" stopColor={colors.finish} />
            <stop offset="82%" stopColor="#180704" />
            <stop offset="100%" stopColor="#080302" />
          </radialGradient>
          <linearGradient id="sStyleBodyGloss" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
            <stop offset="36%" stopColor="rgba(255,255,255,0.08)" />
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

        <g transform="translate(112 16) rotate(-8 360 302)">
          <g data-part="neck">
            <path d="M360 60 L418 60 L407 360 L371 360 Z" fill="url(#sStyleNeckGrain)" stroke="#2a1609" strokeWidth="4" />
            <path d="M360 60 L418 60 L407 360 L371 360 Z" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
          </g>

          <g data-part="fretboard">
            <path d="M374 68 L405 68 L398 359 L381 359 Z" fill={colors.board} stroke="#110805" strokeWidth="3" />
            {[92, 118, 145, 173, 202, 232, 263, 295, 329].map((y, i) => (
              <line key={y} x1={374.5 + i * 0.7} x2={404.5 - i * 0.55} y1={y} y2={y} stroke="#D5D8D8" strokeWidth="2" opacity="0.86" />
            ))}
            {[132, 188, 247, 309].map(y => (
              <circle key={y} cx="389.5" cy={y} r="3.2" fill="#D9CBA4" opacity="0.8" />
            ))}
          </g>

          <g data-part="tuners">
            <path d="M350 54 C348 30 365 12 394 6 C431 0 456 17 463 43 C454 57 439 64 418 64 L360 64 C356 63 352 60 350 54 Z" fill={colors.neck} stroke="#1a0d07" strokeWidth="5" />
            <path d="M399 10 C430 10 450 23 455 43 C441 49 430 50 415 50 L374 50 C372 31 381 16 399 10 Z" fill="rgba(255,255,255,0.12)" />
            {[0, 1, 2].map(i => (
              <g key={`left-${i}`} transform={`translate(${357 - i * 6} ${28 + i * 12})`}>
                <circle r="5.8" fill="url(#sStyleMetal)" stroke="#26282d" strokeWidth="2" />
                <rect x="-20" y="-5" width="15" height="10" rx="4" fill="url(#sStyleMetal)" stroke="#26282d" strokeWidth="2" />
              </g>
            ))}
            {[0, 1, 2].map(i => (
              <g key={`right-${i}`} transform={`translate(${430 + i * 5} ${25 + i * 12})`}>
                <circle r="5.8" fill="url(#sStyleMetal)" stroke="#26282d" strokeWidth="2" />
                <rect x="5" y="-5" width="15" height="10" rx="4" fill="url(#sStyleMetal)" stroke="#26282d" strokeWidth="2" />
              </g>
            ))}
          </g>

          <g data-part="body">
            <path
              d="M386 246 C374 212 344 185 308 194 C279 202 258 232 260 263 C262 283 275 297 296 302 L336 311 C294 316 252 332 225 366 C187 414 205 480 262 505 C318 529 366 501 389 456 C417 509 487 512 540 462 C586 419 594 358 563 315 C541 288 513 278 477 280 L442 284 C476 260 504 232 482 204 C456 172 418 197 397 235 C393 242 389 245 386 246 Z"
              fill="#EEE7D6"
              stroke="#D8C89E"
              strokeWidth="16"
              strokeLinejoin="round"
            />
            <path
              d="M386 246 C374 212 344 185 308 194 C279 202 258 232 260 263 C262 283 275 297 296 302 L336 311 C294 316 252 332 225 366 C187 414 205 480 262 505 C318 529 366 501 389 456 C417 509 487 512 540 462 C586 419 594 358 563 315 C541 288 513 278 477 280 L442 284 C476 260 504 232 482 204 C456 172 418 197 397 235 C393 242 389 245 386 246 Z"
              fill={bodyFill}
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M300 321 C264 327 238 350 226 384 C211 429 243 471 291 484 C333 495 365 477 388 443 C415 480 469 482 514 443 C553 408 561 356 529 321 C510 302 482 293 447 297 C471 270 465 235 440 229 C412 222 392 242 374 270 C351 237 319 235 301 260 C288 278 289 301 309 316 Z"
              fill="url(#sStyleBodyGloss)"
              opacity="0.62"
            />
            <path d="M478 281 C516 296 548 338 545 383 C561 345 548 309 523 290 C506 278 492 274 478 281 Z" fill="rgba(0,0,0,0.14)" />
            <path d="M259 392 C281 432 326 454 372 438" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="4" strokeLinecap="round" />
            <path d="M418 238 C435 217 452 211 468 218" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="4" strokeLinecap="round" />
            <path d="M300 304 C326 307 345 309 366 307" fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth="3" strokeLinecap="round" />
          </g>

          <g data-part="pickguard">
            <path
              d="M342 271 C368 250 399 254 421 275 C445 298 476 304 508 300 C523 318 525 348 509 375 C491 404 458 413 426 401 C398 391 377 370 350 363 C330 358 315 367 303 383 C295 357 300 320 318 294 C326 283 334 276 342 271 Z"
              fill="#F2EEE2"
              stroke="#D7D0C2"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M344 278 C379 260 407 267 432 287 C456 305 486 311 514 303" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
          </g>

          <g data-part="pickups">
            {pickupLayout.map((type, i) => {
              const y = pickupYs[i]
              const x = type === 'p90' ? 365 : 374
              const width = type === 'single' ? 88 : type === 'p90' ? 104 : 102
              const height = type === 'single' ? 22 : 31
              return (
                <g key={`${type}-${i}`} transform={`rotate(-6 ${x + width / 2} ${y + height / 2})`}>
                  <rect x={x} y={y} width={width} height={height} rx={type === 'single' ? 10 : 7} fill={type === 'p90' ? '#EEE7D6' : '#07070A'} stroke={type === 'p90' ? '#1E2025' : '#D5D8D8'} strokeWidth="3" />
                  {type === 'hum' && <line x1={x + width / 2} x2={x + width / 2} y1={y + 3} y2={y + height - 3} stroke="#2E3036" strokeWidth="2" />}
                  {[0, 1, 2, 3, 4, 5].map(p => (
                    <circle key={p} cx={x + 17 + p * ((width - 34) / 5)} cy={y + height / 2} r="2.2" fill={type === 'p90' ? colors.hardware : '#C9CED6'} opacity="0.9" />
                  ))}
                </g>
              )
            })}
          </g>

          <g data-part="bridge" transform="rotate(-6 415 392)">
            <rect x="360" y="382" width="120" height="24" rx="7" fill="url(#sStyleMetal)" stroke="#20232A" strokeWidth="3" />
            {[0, 1, 2, 3, 4, 5].map(i => (
              <rect key={i} x={370 + i * 17} y="377" width="11" height="33" rx="3" fill={colors.hardware} stroke="#25272d" strokeWidth="1.4" />
            ))}
            {bridgeLabel === 'vibrato-tail' && <path d="M487 395 C535 409 549 438 529 467" fill="none" stroke="url(#sStyleMetal)" strokeWidth="8" strokeLinecap="round" />}
            {bridgeLabel === 'locking-trem' && <rect x="351" y="412" width="137" height="18" rx="7" fill="url(#sStyleMetal)" stroke="#20232A" strokeWidth="3" />}
            {bridgeLabel === 'hardtail' && <rect x="375" y="414" width="92" height="16" rx="6" fill="url(#sStyleMetal)" stroke="#20232A" strokeWidth="3" />}
            {bridgeLabel === 'tuneomatic' && <rect x="349" y="421" width="137" height="17" rx="8" fill="url(#sStyleMetal)" stroke="#20232A" strokeWidth="3" />}
          </g>

          <g data-part="knobs" fill="url(#sStyleMetal)" stroke="#20232A" strokeWidth="3">
            <circle cx="492" cy="351" r="16" />
            <circle cx="513" cy="392" r="15" />
            <circle cx="467" cy="418" r="14" />
          </g>

          <g data-part="switch" transform="rotate(-28 511 321)">
            <rect x="493" y="314" width="42" height="12" rx="6" fill="#EEE7D6" stroke="#20232A" strokeWidth="2.5" />
            <line x1="514" x2="528" y1="320" y2="302" stroke="url(#sStyleMetal)" strokeWidth="4" strokeLinecap="round" />
            <circle cx="531" cy="299" r="5" fill={colors.hardware} stroke="#20232A" strokeWidth="2" />
          </g>

          <g data-part="strings" stroke="#DDE2EA" strokeLinecap="round" opacity="0.86">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <line key={i} x1={379 + i * 5} y1="60" x2={374 + i * 16} y2="441" strokeWidth={1.1 + i * 0.14} />
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
