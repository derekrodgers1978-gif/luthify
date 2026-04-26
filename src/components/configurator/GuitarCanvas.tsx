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

const MODEL_PATHS = BODY_SHAPES.filter(shape => shape.id !== 'modern-s').map(shape => shape.modelPath).filter(Boolean) as string[]
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

function createModernSBodyGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(0.3, 0.52)
  shape.bezierCurveTo(0.57, 0.76, 0.84, 0.94, 1.08, 0.83)
  shape.bezierCurveTo(1.33, 0.72, 1.21, 0.31, 0.86, 0.05)
  shape.bezierCurveTo(1.23, -0.2, 1.41, -0.58, 1.27, -1.04)
  shape.bezierCurveTo(1.08, -1.72, 0.5, -2.25, -0.15, -2.28)
  shape.bezierCurveTo(-0.86, -2.31, -1.43, -1.83, -1.48, -1.18)
  shape.bezierCurveTo(-1.52, -0.61, -1.26, -0.24, -0.89, -0.05)
  shape.bezierCurveTo(-1.15, 0.25, -1.25, 0.72, -1.02, 0.97)
  shape.bezierCurveTo(-0.75, 1.26, -0.39, 0.93, -0.23, 0.53)
  shape.bezierCurveTo(-0.08, 0.4, 0.15, 0.4, 0.3, 0.52)
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.045, bevelSegments: 12 })
}

function createModernSPickguardGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.68, 0.53)
  shape.bezierCurveTo(-0.45, 0.84, -0.08, 0.62, 0.12, 0.36)
  shape.bezierCurveTo(0.55, 0.28, 0.86, 0.02, 0.84, -0.36)
  shape.bezierCurveTo(0.81, -0.78, 0.43, -1.0, 0.1, -0.92)
  shape.bezierCurveTo(-0.22, -0.84, -0.47, -0.51, -0.67, -0.13)
  shape.bezierCurveTo(-0.9, 0.1, -0.92, 0.35, -0.68, 0.53)
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01, bevelSegments: 5 })
}

function createModernSFretboardGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.17, -0.15)
  shape.lineTo(0.17, -0.15)
  shape.lineTo(0.12, 2.35)
  shape.quadraticCurveTo(0, 2.43, -0.12, 2.35)
  shape.lineTo(-0.17, -0.15)
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 4 })
}

function createModernSNeckGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.23, -0.22)
  shape.lineTo(0.23, -0.22)
  shape.lineTo(0.17, 2.54)
  shape.quadraticCurveTo(0, 2.64, -0.17, 2.54)
  shape.lineTo(-0.23, -0.22)
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.018, bevelSegments: 8 })
}

function createModernSHeadstockGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.19, 2.36)
  shape.bezierCurveTo(-0.45, 2.55, -0.51, 3.12, -0.29, 3.45)
  shape.bezierCurveTo(-0.11, 3.72, 0.36, 3.57, 0.34, 3.18)
  shape.bezierCurveTo(0.32, 2.84, 0.22, 2.58, 0.17, 2.36)
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.015, bevelSegments: 7 })
}

function createModernSNutGeometry() {
  return new THREE.BoxGeometry(0.42, 0.035, 0.065)
}

function createModernSBridgePlateGeometry(kind: string) {
  const width = kind === 'tuneomatic' ? 0.64 : kind === 'bigsby' ? 0.74 : 0.68
  const height = kind === 'bigsby' ? 0.22 : 0.18
  return new THREE.BoxGeometry(width, height, 0.09)
}

function createRoundedPartGeometry(width: number, height: number, depth: number, radius: number) {
  const x = width / 2
  const y = height / 2
  const r = Math.min(radius, x, y)
  const shape = new THREE.Shape()
  shape.moveTo(-x + r, -y)
  shape.lineTo(x - r, -y)
  shape.quadraticCurveTo(x, -y, x, -y + r)
  shape.lineTo(x, y - r)
  shape.quadraticCurveTo(x, y, x - r, y)
  shape.lineTo(-x + r, y)
  shape.quadraticCurveTo(-x, y, -x, y - r)
  shape.lineTo(-x, -y + r)
  shape.quadraticCurveTo(-x, -y, -x + r, -y)
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: Math.min(depth * 0.28, 0.012), bevelSize: 0.01, bevelSegments: 4 })
}

function createModernSHeadstockFaceGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.15, 2.42)
  shape.bezierCurveTo(-0.36, 2.6, -0.41, 3.06, -0.24, 3.33)
  shape.bezierCurveTo(-0.09, 3.56, 0.27, 3.45, 0.26, 3.14)
  shape.bezierCurveTo(0.25, 2.86, 0.16, 2.61, 0.12, 2.42)
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

function StringSegment({ start, end, color }: { start: [number, number, number]; end: [number, number, number]; color: string }) {
  const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [end, start])
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points])
  const line = useMemo(() => new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.78 })), [color, geometry])
  return <primitive object={line} />
}

function RoundedPart({ width, height, depth, radius, children, ...props }: {
  width: number
  height: number
  depth: number
  radius: number
  children: React.ReactNode
} & React.ComponentProps<'mesh'>) {
  const geometry = useMemo(() => createRoundedPartGeometry(width, height, depth, radius), [depth, height, radius, width])
  return (
    <mesh geometry={geometry} {...props}>
      {children}
    </mesh>
  )
}

function ModernSPickups({ type }: { type: string }) {
  const positions = type === 'singlecoil'
    ? [-0.43, -0.76, -1.09]
    : type === 'hss'
      ? [-0.43, -0.76, -1.09]
      : [-0.5, -1.05]
  return (
    <>
      {positions.map((y, index) => {
        const isHumbucker = type !== 'singlecoil' && (type !== 'hss' || index === positions.length - 1)
        const width = isHumbucker ? 0.66 : 0.52
        const height = isHumbucker ? 0.2 : 0.14
        return (
          <group key={`${type}-${y}`} position={[0.05, y, 0.18]} rotation={[0, 0, -0.08]}>
            <RoundedPart width={width} height={height} depth={0.055} radius={0.035} castShadow receiveShadow>
              <meshStandardMaterial color={type === 'p90' ? '#F2EEE2' : '#07070A'} metalness={0.22} roughness={0.36} />
            </RoundedPart>
            {isHumbucker && (
              <RoundedPart width={width * 0.9} height={height * 0.35} depth={0.018} radius={0.02} position={[0, 0, 0.035]}>
                <meshStandardMaterial color="#17171B" metalness={0.45} roughness={0.24} />
              </RoundedPart>
            )}
            {!isHumbucker && [-0.19, -0.11, -0.03, 0.05, 0.13, 0.21].map(x => (
              <mesh key={x} position={[x, 0, 0.04]}>
                <cylinderGeometry args={[0.018, 0.018, 0.018, 16]} />
                <meshStandardMaterial color="#C9CED6" metalness={0.85} roughness={0.18} />
              </mesh>
            ))}
          </group>
        )
      })}
    </>
  )
}

function ModernSBridge({ type, hardwareColor }: { type: string; hardwareColor: string }) {
  const isBigsby = type === 'bigsby'
  const isTrem = type === 'trem'
  const bridgeGeometry = useMemo(() => createModernSBridgePlateGeometry(type), [type])
  return (
    <group position={[0.02, -1.48, 0.21]} rotation={[0, 0, -0.04]}>
      <mesh geometry={bridgeGeometry} castShadow receiveShadow>
        <meshStandardMaterial color={hardwareColor} metalness={0.92} roughness={0.18} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <mesh key={i} position={[-0.25 + i * 0.1, 0.02, 0.07]}>
          <boxGeometry args={[0.055, 0.12, 0.045]} />
          <meshStandardMaterial color="#E4E8EF" metalness={0.9} roughness={0.16} />
        </mesh>
      ))}
      {(isTrem || isBigsby) && (
        <mesh position={[0.42, isBigsby ? -0.13 : -0.02, 0.08]} rotation={[0.1, 0.25, -0.92]}>
          <cylinderGeometry args={[0.018, 0.018, isBigsby ? 0.78 : 0.58, 18]} />
          <meshStandardMaterial color={hardwareColor} metalness={0.92} roughness={0.16} />
        </mesh>
      )}
      {isBigsby && (
        <mesh position={[0, -0.38, 0.05]}>
          <torusGeometry args={[0.25, 0.035, 12, 56]} />
          <meshStandardMaterial color={hardwareColor} metalness={0.92} roughness={0.18} />
        </mesh>
      )}
    </group>
  )
}

function ModernSInstrument({ view }: { view: 'standard' | 'detail' }) {
  const store = useConfigStore()
  const finish = FINISHES.find(f => f.id === store.finish)
  const neck = NECK_WOODS.find(n => n.id === store.neck)
  const board = FRETBOARDS.find(f => f.id === store.fretboard)
  const hw = HARDWARE_COLORS.find(h => h.id === store.hardware)
  const colors = useMemo(() => makeColors(finish, neck, board, hw), [board, finish, hw, neck])
  const bodyGeometry = useMemo(createModernSBodyGeometry, [])
  const pickguardGeometry = useMemo(createModernSPickguardGeometry, [])
  const neckGeometry = useMemo(createModernSNeckGeometry, [])
  const fretboardGeometry = useMemo(createModernSFretboardGeometry, [])
  const headstockGeometry = useMemo(createModernSHeadstockGeometry, [])
  const headstockFaceGeometry = useMemo(createModernSHeadstockFaceGeometry, [])
  const nutGeometry = useMemo(createModernSNutGeometry, [])
  const burstGeometry = useMemo(() => createRoundedPartGeometry(1.8, 2.2, 0.025, 0.8), [])
  const bodyColor = finish?.id === 'sunburst' ? '#8A2F08' : colors.finish
  const rotation: [number, number, number] = [0.05, view === 'detail' ? -0.2 : 0.16, -0.28]
  const stringColor = colors.hardware === '#111116' ? '#2D2D34' : '#E7EBF2'
  const stringXs = [-0.15, -0.09, -0.03, 0.03, 0.09, 0.15]

  return (
    <Center>
      <group rotation={rotation} scale={1.22} position={[0.06, -0.08, 0]}>
        <mesh name="body" geometry={bodyGeometry} position={[0, 0, -0.11]} castShadow receiveShadow>
          <meshStandardMaterial color={bodyColor} metalness={0.04} roughness={Math.min(colors.finishRoughness, 0.24)} envMapIntensity={1.7} />
        </mesh>
        {finish?.id === 'sunburst' && (
          <mesh name="body-burst-center" geometry={burstGeometry} position={[0, -0.74, 0.13]}>
            <meshStandardMaterial color="#D98B32" transparent opacity={0.5} roughness={0.18} />
          </mesh>
        )}
        <mesh name="body-gloss" geometry={bodyGeometry} position={[0, 0, 0.125]}>
          <meshStandardMaterial color="#FFFFFF" transparent opacity={0.08} metalness={0} roughness={0.08} depthWrite={false} />
        </mesh>
        <mesh name="neck" geometry={neckGeometry} position={[0, 0.22, -0.03]} castShadow receiveShadow>
          <meshStandardMaterial color={colors.neck} metalness={0.02} roughness={0.42} />
        </mesh>
        <mesh name="headstock" geometry={headstockGeometry} position={[0, 0.22, -0.035]} castShadow receiveShadow>
          <meshStandardMaterial color={colors.neck} metalness={0.02} roughness={0.42} />
        </mesh>
        <mesh name="fretboard" geometry={fretboardGeometry} position={[0, 0.2, 0.08]} castShadow receiveShadow>
          <meshStandardMaterial color={colors.board} metalness={0} roughness={0.58} />
        </mesh>
        <mesh name="headstock-face" geometry={headstockFaceGeometry} position={[0, 0.22, 0.09]}>
          <meshStandardMaterial color={colors.neck} metalness={0.02} roughness={0.38} />
        </mesh>
        <mesh name="nut" geometry={nutGeometry} position={[0, 2.56, 0.15]}>
          <meshStandardMaterial color="#F2EEE2" metalness={0.02} roughness={0.24} />
        </mesh>
        {Array.from({ length: 18 }).map((_, i) => (
          <mesh key={i} name="fret" position={[0, 0.28 + i * 0.12, 0.145]}>
            <boxGeometry args={[0.33 - i * 0.007, 0.012, 0.018]} />
            <meshStandardMaterial color="#DDE2EA" metalness={0.85} roughness={0.2} />
          </mesh>
        ))}
        {[0.72, 1.08, 1.44, 1.8, 2.16].map(y => (
          <mesh key={y} name="inlay" position={[0, y, 0.155]}>
            <cylinderGeometry args={[0.026, 0.026, 0.01, 18]} />
            <meshStandardMaterial color="#EAE0C8" roughness={0.22} />
          </mesh>
        ))}
        <mesh name="pickguard" geometry={pickguardGeometry} position={[-0.02, -0.42, 0.155]} castShadow receiveShadow>
          <meshStandardMaterial color="#F2EEE2" metalness={0.02} roughness={0.3} />
        </mesh>
        <ModernSPickups type={store.pickups} />
        <ModernSBridge type={store.bridge} hardwareColor={colors.hardware} />
        <group name="knobs" position={[0.67, -1.33, 0.24]}>
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[i * -0.21, i * 0.2, 0]}>
              <cylinderGeometry args={[0.085, 0.085, 0.055, 32]} />
              <meshStandardMaterial color={colors.hardware} metalness={0.82} roughness={0.2} />
            </mesh>
          ))}
        </group>
        <group name="switch" position={[0.72, -0.66, 0.23]} rotation={[0, 0, -0.58]}>
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.035, 20]} />
            <meshStandardMaterial color={colors.hardware} metalness={0.85} roughness={0.18} />
          </mesh>
          <mesh position={[0, 0.08, 0.03]}>
            <cylinderGeometry args={[0.012, 0.012, 0.18, 12]} />
            <meshStandardMaterial color="#EDE7D5" roughness={0.26} />
          </mesh>
        </group>
        <group name="tuners">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <group key={i} position={[i < 3 ? -0.24 : 0.24, 2.86 + (i % 3) * 0.2, 0.13]}>
              <mesh>
                <cylinderGeometry args={[0.035, 0.035, 0.08, 18]} />
                <meshStandardMaterial color={colors.hardware} metalness={0.92} roughness={0.18} />
              </mesh>
              <mesh position={[i < 3 ? -0.1 : 0.1, 0, 0]}>
                <boxGeometry args={[0.13, 0.055, 0.035]} />
                <meshStandardMaterial color={colors.hardware} metalness={0.92} roughness={0.18} />
              </mesh>
            </group>
          ))}
        </group>
        <group name="strings">
          {stringXs.map((x, i) => (
            <StringSegment key={x} start={[x, 2.62, 0.19]} end={[-0.25 + i * 0.1, -1.5, 0.3]} color={stringColor} />
          ))}
        </group>
      </group>
    </Center>
  )
}

function ModernSSvgPreview({ view }: { view: 'standard' | 'detail' | 'reset' }) {
  const store = useConfigStore()
  const finish = FINISHES.find(f => f.id === store.finish)
  const neck = NECK_WOODS.find(n => n.id === store.neck)
  const board = FRETBOARDS.find(f => f.id === store.fretboard)
  const hw = HARDWARE_COLORS.find(h => h.id === store.hardware)
  const colors = makeColors(finish, neck, board, hw)
  const bodyFill = finish?.id === 'sunburst' ? 'url(#modernSBurst)' : colors.finish
  const stringColor = hw?.id === 'black' ? '#3a3a42' : '#E7EBF2'
  const pickupYs = store.pickups === 'singlecoil' || store.pickups === 'hss' ? [224, 258, 292] : [232, 286]
  const humbucker = (index: number) => store.pickups !== 'singlecoil' && (store.pickups !== 'hss' || index === pickupYs.length - 1)
  const bridgeLabel = store.bridge === 'bigsby' ? 'M' : store.bridge === 'trem' ? 'T' : store.bridge === 'hardtail' ? 'H' : ''

  return (
    <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 45%, #17151a 0%, #09090B 62%)', display: 'grid', placeItems: 'center' }}>
      <svg viewBox="0 0 760 620" role="img" aria-label="S-Style Electric finish preview" style={{ width: view === 'detail' ? 'min(96%, 980px)' : 'min(90%, 900px)', height: view === 'detail' ? 'min(92%, 650px)' : 'min(86%, 620px)', filter: 'drop-shadow(0 30px 70px rgba(0,0,0,0.5))', transition: 'width 0.25s, height 0.25s' }}>
        <defs>
          <radialGradient id="modernSBurst" cx="47%" cy="58%" r="66%">
            <stop offset="0%" stopColor="#D98B32" />
            <stop offset="48%" stopColor={colors.finish} />
            <stop offset="92%" stopColor="#150704" />
          </radialGradient>
          <linearGradient id="modernSGloss" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
            <stop offset="46%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
          </linearGradient>
        </defs>
        <g transform="translate(190 40) rotate(-10 205 285)">
          <g id="neck">
            <path d="M180 42 L224 42 L239 391 L165 391 Z" fill={colors.neck} stroke="#1b0e08" strokeWidth="5" strokeLinejoin="round" />
            <path id="headstock" d="M175 36 C138 50 126 119 146 165 C165 207 230 192 232 139 C234 97 218 62 219 37 Z" fill={colors.neck} stroke="#1b0e08" strokeWidth="5" strokeLinejoin="round" />
          </g>
          <path id="fretboard" d="M185 54 L219 54 L228 383 L176 383 Z" fill={colors.board} stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
          <rect id="nut" x="178" y="48" width="48" height="9" rx="3" fill="#F2EEE2" />
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={i} x1={184 + i * 0.28} x2={220 - i * 0.28} y1={76 + i * 17} y2={76 + i * 17} stroke="#DDE2EA" strokeWidth="2" opacity="0.85" />
          ))}
          {[145, 197, 249, 301].map(y => <circle key={y} cx="202" cy={y} r="4" fill="#EAE0C8" opacity="0.9" />)}
          <path id="body" d="M215 356 C256 311 328 296 379 332 C426 365 419 428 367 445 C431 483 424 565 366 598 C303 633 235 594 222 532 C188 590 103 596 63 538 C27 486 53 431 104 414 C43 388 41 307 96 274 C145 244 193 286 215 356 Z" fill={bodyFill} stroke="#E8DCC6" strokeWidth="8" strokeLinejoin="round" />
          <path id="body-gloss" d="M224 368 C262 329 318 319 359 347 C396 373 386 415 337 427 C386 462 383 528 336 554 C288 580 242 548 231 496 C199 541 129 552 93 511 C65 479 82 442 128 430 C77 404 81 337 126 311 C166 288 200 326 224 368 Z" fill="url(#modernSGloss)" opacity="0.58" />
          <path id="pickguard" d="M166 365 C191 323 242 331 261 372 C318 382 349 426 327 474 C306 518 256 522 230 485 C186 506 134 488 123 446 C114 411 135 386 166 365 Z" fill="#F2EEE2" stroke="#D9CBA4" strokeWidth="5" strokeLinejoin="round" />
          <g id="pickups" transform="rotate(-8 224 260)">
            {pickupYs.map((y, i) => (
              <g key={y}>
                <rect x={humbucker(i) ? 176 : 185} y={y} width={humbucker(i) ? 76 : 58} height={humbucker(i) ? 23 : 16} rx="5" fill={store.pickups === 'p90' ? '#F2EEE2' : '#07070A'} stroke="#26262b" strokeWidth="3" />
                {humbucker(i) ? <rect x="187" y={y + 8} width="54" height="7" rx="3" fill="#18181c" /> : [194, 203, 212, 221, 230, 239].map(x => <circle key={x} cx={x} cy={y + 8} r="2.8" fill="#C9CED6" />)}
              </g>
            ))}
          </g>
          <g id="bridge" transform="rotate(-3 214 392)">
            <rect x="171" y="392" width={store.bridge === 'bigsby' ? 92 : 80} height="25" rx="6" fill={colors.hardware} stroke="#1E2025" strokeWidth="4" />
            {[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={180 + i * 11} y="397" width="7" height="16" rx="2" fill="#E4E8EF" />)}
            {bridgeLabel && <text x="251" y="411" fill="#09090B" fontSize="14" fontWeight="700">{bridgeLabel}</text>}
            {store.bridge === 'bigsby' && <ellipse cx="212" cy="455" rx="34" ry="12" fill="none" stroke={colors.hardware} strokeWidth="8" />}
            {(store.bridge === 'bigsby' || store.bridge === 'trem') && <line x1="251" x2="302" y1="402" y2="365" stroke={colors.hardware} strokeWidth="6" strokeLinecap="round" />}
          </g>
          <g id="knobs" fill={colors.hardware} stroke="#1E2025" strokeWidth="3">
            <circle cx="314" cy="483" r="15" />
            <circle cx="287" cy="518" r="15" />
            <circle cx="247" cy="539" r="15" />
          </g>
          <g id="switch" transform="rotate(-32 317 405)">
            <circle cx="317" cy="405" r="8" fill={colors.hardware} stroke="#1E2025" strokeWidth="3" />
            <line x1="317" x2="317" y1="397" y2="375" stroke="#EDE7D5" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g id="tuners" fill={colors.hardware} stroke="#1E2025" strokeWidth="2">
            {[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={i < 3 ? 124 : 221} y={76 + (i % 3) * 25} width="26" height="12" rx="4" />)}
          </g>
          <g id="strings" stroke={stringColor} strokeWidth="1.25" opacity="0.82">
            {[-15, -9, -3, 3, 9, 15].map((x, i) => <line key={x} x1={202 + x} x2={181 + i * 11} y1="52" y2="405" />)}
          </g>
        </g>
      </svg>
    </div>
  )
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
        <Bounds fit clip observe margin={1.28}>
          {shape === 'modern-s' ? <ModernSInstrument view={view} /> : <GlbInstrument view={view} />}
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
        <ModernSSvgPreview view={view} />
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
