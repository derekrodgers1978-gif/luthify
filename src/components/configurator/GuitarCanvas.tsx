'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bounds, Center, ContactShadows, Environment, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigStore } from '@/store/configStore'
import {
  BODY_SHAPES, FINISHES, FRETBOARDS, HARDWARE_COLORS, NECK_WOODS,
  BINDINGS, BRIDGES, KNOBS, PICKGUARDS, PICKUPS, TUNERS,
  isBurstFinish, isNaturalFinish,
} from '@/lib/configurator-options'

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
type FinishOption = { id: string; hex?: string; roughness?: number; finishGroup?: 'solid' | 'burst' | 'natural' }
type ModularShape = 'modern-s' | 'single-cut'
type ColorOption = { id: string; hex?: string }

const MODEL_PATHS = BODY_SHAPES.map(shape => shape.modelPath).filter(Boolean) as string[]
MODEL_PATHS.forEach(path => useGLTF.preload(path))

function materialRole(mesh: THREE.Mesh, materialName: string): MaterialRole {
  const names: string[] = [mesh.name, materialName]
  let parent = mesh.parent
  while (parent) {
    names.push(parent.name)
    parent = parent.parent
  }
  const key = names.join(' ').toLowerCase()
  if (/(pickguard|scratchplate|guard)/.test(key)) return 'protected'
  if (/(binding|inlay|dot|nut|logo|label|plastic|plate)/.test(key)) return 'protected'
  if (/(fretboard|fingerboard|finger board|fret|board)/.test(key)) return 'fretboard'
  if (/(neck|headstock|head stock|headstock|peghead)/.test(key)) return 'neck'
  if (/(pickup|pick up|humbucker|single coil|p90|p-90)/.test(key)) return 'pickup'
  if (/(bridge|tailpiece|tail piece|tremolo|vibrato|saddle)/.test(key)) return 'bridge'
  if (/(hardware|metal|chrome|tuner|tuning|knob|control|pot|string|ferrule|strap|jack|pickguard|scratchplate|guard)/.test(key)) return 'hardware'
  if (/(body|top|paint|finish|soundboard|sound board|back|side)/.test(key)) return 'body'
  return 'other'
}

function isModularShape(shapeId: string): shapeId is ModularShape {
  return shapeId === 'modern-s' || shapeId === 'single-cut'
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

function optionColor(option?: ColorOption, fallback = '#F2EEE2') {
  return option?.hex ?? fallback
}

function pickupColor(id: string) {
  if (id === 'p90') return '#E8D5A8'
  if (id === 'active-hum') return '#101014'
  return '#08080A'
}

function makeBodyShape(shapeId: ModularShape) {
  const shape = new THREE.Shape()
  if (shapeId === 'single-cut') {
    shape.moveTo(-0.92, -1.02)
    shape.bezierCurveTo(-1.36, -0.82, -1.26, -0.22, -0.74, -0.06)
    shape.bezierCurveTo(-1.02, 0.44, -0.58, 0.88, -0.08, 0.78)
    shape.bezierCurveTo(0.18, 0.98, 0.62, 0.86, 0.78, 0.48)
    shape.bezierCurveTo(0.88, 0.2, 0.66, 0.08, 0.34, 0.14)
    shape.bezierCurveTo(0.96, -0.22, 0.84, -0.96, 0.12, -1.06)
    shape.bezierCurveTo(-0.26, -1.16, -0.62, -1.16, -0.92, -1.02)
    return shape
  }
  shape.moveTo(-0.9, -1.0)
  shape.bezierCurveTo(-1.34, -0.7, -1.06, -0.16, -0.52, -0.22)
  shape.bezierCurveTo(-1.12, 0.2, -0.82, 0.88, -0.16, 0.74)
  shape.bezierCurveTo(0.06, 1.08, 0.6, 0.92, 0.54, 0.46)
  shape.bezierCurveTo(1.06, 0.28, 1.02, -0.38, 0.46, -0.42)
  shape.bezierCurveTo(0.68, -0.94, 0.12, -1.18, -0.18, -0.82)
  shape.bezierCurveTo(-0.42, -1.18, -0.76, -1.18, -0.9, -1.0)
  return shape
}

function makePickguardShape() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.44, 0.44)
  shape.bezierCurveTo(-0.18, 0.66, 0.34, 0.48, 0.3, 0.08)
  shape.lineTo(0.18, -0.56)
  shape.bezierCurveTo(-0.14, -0.78, -0.56, -0.58, -0.48, -0.22)
  shape.bezierCurveTo(-0.34, -0.04, -0.48, 0.2, -0.44, 0.44)
  return shape
}

function shouldHideBakedPart(role: MaterialRole, shapeId: string) {
  return isModularShape(shapeId) && ['hardware', 'pickup', 'bridge', 'protected'].includes(role)
}

function configureBasePreviewMaterial(mat: THREE.MeshStandardMaterial, shapeId: string, role: MaterialRole) {
  if (!isModularShape(shapeId)) return
  mat.map = null
  mat.transparent = true
  mat.opacity = role === 'body' || role === 'neck' || role === 'fretboard' ? 0.2 : 0.12
  mat.color = new THREE.Color(role === 'body' ? '#3f3832' : '#4a463f')
  mat.metalness = 0.03
  mat.roughness = 0.68
}

function hideBakedPart(mesh: THREE.Mesh) {
  mesh.visible = false
  mesh.castShadow = false
  mesh.receiveShadow = false
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
  const finishMode = isBurstFinish(finish?.id) ? 1 : isNaturalFinish(finish?.id) ? 2 : 0

  mat.color = new THREE.Color('#ffffff')
  mat.map = null
  mat.metalness = 0.04
  mat.roughness = isNaturalFinish(finish?.id) ? Math.max(colors.finishRoughness, 0.28) : Math.min(colors.finishRoughness, 0.24)
  mat.onBeforeCompile = shader => {
    shader.uniforms.uFinishColor = { value: new THREE.Color(colors.finish) }
    shader.uniforms.uBindingColor = { value: new THREE.Color('#F2EEE2') }
    shader.uniforms.uBodyCenter = { value: new THREE.Vector2(center.x, center.y) }
    shader.uniforms.uBodyHalfSize = { value: halfSize }
    shader.uniforms.uFinishMode = { value: finishMode }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFinishPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFinishPosition = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uFinishColor;\nuniform vec3 uBindingColor;\nuniform vec2 uBodyCenter;\nuniform vec2 uBodyHalfSize;\nuniform int uFinishMode;\nvarying vec3 vFinishPosition;'
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
vec2 finishUv = (vFinishPosition.xy - uBodyCenter) / uBodyHalfSize;
float finishRadius = length(finishUv);
float woodGrain = sin((vFinishPosition.x * 18.0) + sin(vFinishPosition.y * 14.0) * 0.7) * 0.5 + 0.5;
vec3 burstColor = mix(vec3(0.95, 0.58, 0.16), uFinishColor, smoothstep(0.18, 0.56, finishRadius));
burstColor = mix(burstColor, vec3(0.07, 0.025, 0.008), smoothstep(0.62, 0.92, finishRadius));
vec3 naturalColor = mix(uFinishColor * 0.72, uFinishColor * 1.18, smoothstep(0.2, 0.92, woodGrain));
vec3 paintColor = uFinishMode == 1 ? burstColor : uFinishMode == 2 ? naturalColor : uFinishColor;
float binding = smoothstep(0.82, 0.91, finishRadius);
diffuseColor.rgb = mix(paintColor, uBindingColor, binding * 0.92);`
      )
  }
  mat.customProgramCacheKey = () => `single-cut-finish-${finish?.id ?? 'default'}-${finishMode}-${colors.finish}`
}

function enhanceMaterial(role: MaterialRole, material: THREE.Material, colors: ReturnType<typeof makeColors>, mesh: THREE.Mesh, modelMaxDimension: number, shapeId: string, finish?: FinishOption) {
  const mat = material as THREE.MeshStandardMaterial
  if (!mat.isMeshStandardMaterial) return
  mat.envMapIntensity = 1.55
  if (isModularShape(shapeId)) {
    configureBasePreviewMaterial(mat, shapeId, role)
  } else if (shapeId === 'single-cut' && isSingleCutPaintSurface(mesh, modelMaxDimension)) {
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

function BodyFinishMesh({ shapeId, colors, finish, binding }: { shapeId: ModularShape; colors: ReturnType<typeof makeColors>; finish?: FinishOption; binding?: ColorOption }) {
  const bodyShape = useMemo(() => makeBodyShape(shapeId), [shapeId])
  const extrude = useMemo(() => ({ depth: 0.12, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2 }), [])
  const bodyColor = isNaturalFinish(finish?.id) ? colors.finish : isBurstFinish(finish?.id) ? '#7A2C0A' : colors.finish
  const bindingColor = optionColor(binding, '#F2EEE2')
  const showBinding = shapeId === 'single-cut' && binding?.id !== 'none'

  return (
    <group position={[-0.08, -0.48, 0.17]} rotation={[0, 0, shapeId === 'single-cut' ? -0.08 : 0.05]} scale={shapeId === 'single-cut' ? [1.2, 1.08, 1] : [1.16, 1.02, 1]}>
      {showBinding && (
        <mesh position={[0, 0, -0.035]} scale={[1.08, 1.08, 1]} castShadow receiveShadow>
          <extrudeGeometry args={[bodyShape, extrude]} />
          <meshStandardMaterial color={bindingColor} roughness={0.38} metalness={0.02} />
        </mesh>
      )}
      <mesh castShadow receiveShadow>
        <extrudeGeometry args={[bodyShape, extrude]} />
        <meshStandardMaterial color={bodyColor} roughness={colors.finishRoughness} metalness={0.03} />
      </mesh>
      {shapeId === 'single-cut' && (
        <mesh position={[0.6, 0.26, 0.16]} scale={[0.52, 0.42, 0.08]} castShadow receiveShadow>
          <sphereGeometry args={[1, 28, 14]} />
          <meshStandardMaterial color="#09090B" roughness={0.72} metalness={0.02} />
        </mesh>
      )}
      {shapeId === 'modern-s' && (
        <mesh position={[0.46, 0.38, 0.16]} scale={[0.35, 0.28, 0.08]} castShadow receiveShadow>
          <sphereGeometry args={[1, 28, 14]} />
          <meshStandardMaterial color="#09090B" roughness={0.72} metalness={0.02} />
        </mesh>
      )}
      {isBurstFinish(finish?.id) && (
        <mesh position={[-0.06, -0.08, 0.145]} scale={[0.62, 0.62, 1]} castShadow receiveShadow>
          <extrudeGeometry args={[bodyShape, { ...extrude, depth: 0.035 }]} />
          <meshStandardMaterial color="#F0A23A" roughness={0.2} metalness={0.02} transparent opacity={0.58} />
        </mesh>
      )}
      {isNaturalFinish(finish?.id) && (
        <mesh position={[-0.12, -0.1, 0.16]} rotation={[0, 0, -0.18]}>
          <boxGeometry args={[1.55, 0.035, 0.012]} />
          <meshStandardMaterial color="#F1D09A" roughness={0.48} metalness={0} transparent opacity={0.36} />
        </mesh>
      )}
    </group>
  )
}

function NeckAssembly({ colors }: { colors: ReturnType<typeof makeColors> }) {
  return (
    <group position={[0.03, 0.52, 0.18]} rotation={[0, 0, -0.03]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.32, 2.7, 0.12]} />
        <meshStandardMaterial color={colors.neck} roughness={0.42} metalness={0.02} />
      </mesh>
      <mesh position={[0, -0.03, 0.074]} castShadow receiveShadow>
        <boxGeometry args={[0.22, 2.52, 0.04]} />
        <meshStandardMaterial color={colors.board} roughness={0.58} metalness={0} />
      </mesh>
      {[-0.96, -0.66, -0.36, -0.06, 0.24, 0.54, 0.84].map(y => (
        <mesh key={y} position={[0, y, 0.102]}>
          <boxGeometry args={[0.25, 0.01, 0.012]} />
          <meshStandardMaterial color="#C9CED6" roughness={0.18} metalness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, 1.52, 0.01]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.48, 0.13]} />
        <meshStandardMaterial color={colors.neck} roughness={0.42} metalness={0.02} />
      </mesh>
    </group>
  )
}

function PickguardMesh({ shapeId, color }: { shapeId: ModularShape; color: string }) {
  const pickguardShape = useMemo(() => makePickguardShape(), [])
  if (shapeId === 'single-cut') return null
  return (
    <mesh position={[-0.25, -0.38, 0.34]} rotation={[0, 0, -0.2]} scale={[0.84, 0.9, 1]} castShadow receiveShadow>
      <shapeGeometry args={[pickguardShape]} />
      <meshStandardMaterial color={color} roughness={0.34} metalness={0.02} side={THREE.DoubleSide} />
    </mesh>
  )
}

function PickupsMesh({ shapeId, color, pickupId }: { shapeId: ModularShape; color: string; pickupId: string }) {
  const humbucker = pickupId === 'dual-hum' || pickupId === 'active-hum'
  const count = shapeId === 'modern-s' && pickupId === 'singlecoil' ? 3 : 2
  const width = humbucker ? 0.5 : 0.38
  const positions = count === 3 ? [-0.78, -0.5, -0.22] : [-0.68, -0.28]
  return (
    <group>
      {positions.map((y, index) => (
        <mesh key={`${y}-${index}`} position={[-0.08, y, 0.42]} rotation={[0, 0, shapeId === 'modern-s' ? -0.12 : 0.02]} castShadow receiveShadow>
          <boxGeometry args={[width, 0.16, 0.09]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={pickupId === 'active-hum' ? 0.5 : 0.18} />
        </mesh>
      ))}
    </group>
  )
}

function BridgeMesh({ shapeId, color, bridgeId }: { shapeId: ModularShape; color: string; bridgeId: string }) {
  const hasTailpiece = shapeId === 'single-cut' || bridgeId === 'tuneomatic' || bridgeId === 'bigsby'
  return (
    <group position={[-0.08, -0.98, 0.43]} rotation={[0, 0, shapeId === 'modern-s' ? -0.08 : 0.02]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.74, 0.13, 0.09]} />
        <meshStandardMaterial color={color} roughness={0.18} metalness={0.9} />
      </mesh>
      {hasTailpiece && (
        <mesh position={[0, -0.27, -0.005]} castShadow receiveShadow>
          <boxGeometry args={[0.82, 0.12, 0.08]} />
          <meshStandardMaterial color={color} roughness={0.2} metalness={0.88} />
        </mesh>
      )}
      {bridgeId === 'bigsby' && (
        <mesh position={[0, -0.5, -0.01]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <torusGeometry args={[0.28, 0.025, 12, 48]} />
          <meshStandardMaterial color={color} roughness={0.18} metalness={0.9} />
        </mesh>
      )}
    </group>
  )
}

function KnobsMesh({ shapeId, color }: { shapeId: ModularShape; color: string }) {
  const positions = shapeId === 'single-cut'
    ? [[0.58, -0.74, 0.45], [0.72, -0.36, 0.45], [0.32, -1.0, 0.45], [0.82, -1.03, 0.45]]
    : [[0.55, -0.75, 0.45], [0.66, -1.04, 0.45], [0.34, -1.16, 0.45]]
  return (
    <group>
      {positions.map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.085, 0.09, 0.06, 28]} />
          <meshStandardMaterial color={color} roughness={0.28} metalness={color === '#C9CED6' ? 0.75 : 0.08} />
        </mesh>
      ))}
    </group>
  )
}

function TunersMesh({ color, tunerId }: { color: string; tunerId: string }) {
  const stagger = tunerId === 'staggered'
  return (
    <group position={[0.04, 2.08, 0.29]}>
      {[-0.24, 0.24].flatMap((x, side) => [0, 1, 2].map(i => {
        const y = 0.22 - i * 0.18
        const key = `${side}-${i}`
        return (
          <mesh key={key} position={[x, y, stagger ? 0.02 * i : 0]} castShadow receiveShadow>
            <boxGeometry args={[0.16, 0.08, 0.055]} />
            <meshStandardMaterial color={color} roughness={0.2} metalness={0.86} />
          </mesh>
        )
      }))}
    </group>
  )
}

function StringsMesh() {
  return (
    <group>
      {[-0.1, -0.06, -0.02, 0.02, 0.06, 0.1].map((x, index) => (
        <mesh key={index} position={[x, 0.16, 0.5]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.006, 3.16, 0.006]} />
          <meshStandardMaterial color="#DDE2EA" roughness={0.2} metalness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function ModularInstrumentParts({ shapeId, colors }: { shapeId: ModularShape; colors: ReturnType<typeof makeColors> }) {
  const store = useConfigStore()
  const finish = FINISHES.find(f => f.id === store.finish)
  const pickguard = PICKGUARDS.find(p => p.id === store.pickguard)
  const pickups = PICKUPS.find(p => p.id === store.pickups)
  const bridge = BRIDGES.find(b => b.id === store.bridge)
  const knobs = KNOBS.find(k => k.id === store.knobs)
  const tuners = TUNERS.find(t => t.id === store.tuners)
  const binding = BINDINGS.find(b => b.id === store.binding)
  const hardwareColor = colors.hardware

  return (
    <group position={[0, 0, 0.04]} rotation={[0, 0, shapeId === 'single-cut' ? -0.08 : 0.04]}>
      <BodyFinishMesh shapeId={shapeId} colors={colors} finish={finish} binding={binding} />
      <NeckAssembly colors={colors} />
      <PickguardMesh shapeId={shapeId} color={optionColor(pickguard)} />
      <PickupsMesh shapeId={shapeId} color={pickupColor(pickups?.id ?? store.pickups)} pickupId={pickups?.id ?? store.pickups} />
      <BridgeMesh shapeId={shapeId} color={hardwareColor} bridgeId={bridge?.id ?? store.bridge} />
      <KnobsMesh shapeId={shapeId} color={optionColor(knobs, '#E8D5A8')} />
      <TunersMesh color={hardwareColor} tunerId={tuners?.id ?? store.tuners} />
      <StringsMesh />
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
      const roles = materials.map(mat => materialRole(mesh, mat.name))
      if (roles.some(role => shouldHideBakedPart(role, shape.id))) {
        hideBakedPart(mesh)
        return
      }
      materials.forEach((mat, index) => enhanceMaterial(roles[index], mat, colors, mesh, maxDimension, shape.id, finish))
    })
  }, [colors, finish, maxDimension, model, shape.id])

  const baseRotation = MODEL_ROTATION[shape.id] ?? [0, 0, 0]
  const yRotation = baseRotation[1] + (view === 'detail' ? -0.12 : 0.08)

  return (
    <Center>
      <group rotation={[baseRotation[0], yRotation, baseRotation[2]]}>
        <primitive object={model} position={[-center.x * scale, -center.y * scale, -center.z * scale]} scale={scale} />
        {isModularShape(shape.id) && <ModularInstrumentParts shapeId={shape.id} colors={colors} />}
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
  const bodyFill = isBurstFinish(finish?.id) ? 'url(#singleCutBurst)' : isNaturalFinish(finish?.id) ? 'url(#singleCutNatural)' : colors.finish

  return (
    <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 45%, #17151a 0%, #09090B 62%)', display: 'grid', placeItems: 'center' }}>
      <svg viewBox="0 0 760 520" role="img" aria-label="Single Cut Electric finish preview" style={{ width: 'min(86%, 860px)', height: 'min(82%, 560px)', filter: 'drop-shadow(0 28px 60px rgba(0,0,0,0.46))' }}>
        <defs>
          <radialGradient id="singleCutBurst" cx="46%" cy="54%" r="62%">
            <stop offset="0%" stopColor="#F2A33B" />
            <stop offset="45%" stopColor={colors.finish} />
            <stop offset="86%" stopColor="#140703" />
          </radialGradient>
          <linearGradient id="singleCutNatural" x1="0" x2="1" y1="0.2" y2="0.8">
            <stop offset="0%" stopColor={colors.finish} />
            <stop offset="34%" stopColor="#F1D09A" />
            <stop offset="58%" stopColor={colors.finish} />
            <stop offset="100%" stopColor="#8C5A2B" />
          </linearGradient>
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

function ModularSvgPreview() {
  const store = useConfigStore()
  const shape = store.shape
  if (!isModularShape(shape)) return null

  const finish = FINISHES.find(f => f.id === store.finish)
  const neck = NECK_WOODS.find(n => n.id === store.neck)
  const board = FRETBOARDS.find(f => f.id === store.fretboard)
  const hw = HARDWARE_COLORS.find(h => h.id === store.hardware)
  const pickguard = PICKGUARDS.find(p => p.id === store.pickguard)
  const knobs = KNOBS.find(k => k.id === store.knobs)
  const binding = BINDINGS.find(b => b.id === store.binding)
  const colors = makeColors(finish, neck, board, hw)
  const bodyFill = isBurstFinish(finish?.id) ? 'url(#modularBurst)' : isNaturalFinish(finish?.id) ? 'url(#modularNatural)' : colors.finish
  const hardware = colors.hardware
  const knobColor = optionColor(knobs, '#E8D5A8')
  const pickupFill = pickupColor(store.pickups)
  const isSingleCut = shape === 'single-cut'
  const bodyPath = isSingleCut
    ? 'M232 411 C181 386 174 316 218 276 C241 256 280 249 318 270 C328 211 380 181 430 206 C486 235 506 301 464 348 C436 379 394 382 356 355 C341 403 282 435 232 411 Z'
    : 'M222 394 C184 370 182 316 224 292 C184 258 200 206 252 211 C272 154 345 158 363 220 C406 184 465 212 458 272 C451 323 409 344 366 323 C382 378 327 418 276 390 C258 401 237 404 222 394 Z'
  const pickguardPath = isSingleCut
    ? 'M316 273 C346 255 389 270 397 304 C371 298 348 309 333 336 C310 322 298 291 316 273 Z'
    : 'M280 246 C321 218 376 238 379 286 C371 317 347 341 316 343 C289 332 271 303 271 276 C271 260 273 251 280 246 Z'
  const pickupYs = store.pickups === 'singlecoil' && !isSingleCut ? [270, 305, 340] : [288, 337]
  const pickupWidth = store.pickups === 'p90' ? 72 : store.pickups === 'singlecoil' ? 58 : 84
  const pickupHeight = store.pickups === 'singlecoil' ? 17 : 25
  const bridgeY = isSingleCut ? 389 : 368
  const tailpieceY = isSingleCut ? 418 : 394
  const stringEndY = store.bridge === 'bigsby' ? (isSingleCut ? 448 : 421) : tailpieceY + 4

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 50% 45%, rgba(28,24,28,0.4), rgba(9,9,11,0.96) 68%)' }}>
      <svg viewBox="0 0 760 560" role="img" aria-label={`${isSingleCut ? 'Single Cut' : 'S-Style'} modular instrument preview`} style={{ width: 'min(90%, 900px)', height: 'min(90%, 650px)', filter: 'drop-shadow(0 34px 64px rgba(0,0,0,0.56))' }}>
        <defs>
          <radialGradient id="modularBurst" cx="48%" cy="52%" r="66%">
            <stop offset="0%" stopColor="#F0A23A" />
            <stop offset="42%" stopColor={colors.finish} />
            <stop offset="88%" stopColor="#160604" />
          </radialGradient>
          <linearGradient id="modularNatural" x1="0" x2="1" y1="0.2" y2="0.9">
            <stop offset="0%" stopColor={colors.finish} />
            <stop offset="34%" stopColor="#F1D09A" />
            <stop offset="70%" stopColor={colors.finish} />
            <stop offset="100%" stopColor="#8C5A2B" />
          </linearGradient>
          <linearGradient id="bodyGloss" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
          </linearGradient>
          <linearGradient id="neckGloss" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#F0D08B" stopOpacity="0.34" />
            <stop offset="46%" stopColor={colors.neck} />
            <stop offset="100%" stopColor="#2B1308" stopOpacity="0.42" />
          </linearGradient>
          <linearGradient id="hardwareGloss" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="45%" stopColor={hardware} />
            <stop offset="100%" stopColor="#111216" stopOpacity="0.42" />
          </linearGradient>
          <filter id="softPartShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#000000" floodOpacity="0.34" />
          </filter>
        </defs>
        <g transform="translate(66 0) rotate(-10 350 292)" filter="url(#softPartShadow)">
          <ellipse cx="360" cy="429" rx="132" ry="18" fill="#000000" opacity="0.3" />
          <path d="M326 72 L392 72 L376 410 L344 410 Z" fill="url(#neckGloss)" stroke="#1A0D07" strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M343 85 L376 85 L370 398 L351 398 Z" fill={colors.board} stroke="#080402" strokeWidth="2.6" strokeLinejoin="round" />
          <path d={isSingleCut ? 'M316 42 C328 10 374 0 410 22 L395 77 L319 76 Z' : 'M315 43 C342 7 398 8 424 40 L397 78 L319 76 Z'} fill="url(#neckGloss)" stroke="#1A0D07" strokeWidth="5.5" strokeLinejoin="round" />
          {[126, 162, 198, 234, 270, 306, 342, 378].map((y, i) => (
            <line key={y} x1={344 + i * 0.5} x2={376 - i * 0.5} y1={y} y2={y} stroke="#D8DEE8" strokeWidth="1.8" opacity="0.9" />
          ))}
          {[-1, 1].map(side => [0, 1, 2].map(i => (
            <g key={`${side}-${i}`}>
              <circle cx={side > 0 ? 405 : 313} cy={58 + i * 24} r="4.5" fill="url(#hardwareGloss)" stroke="#1E2025" strokeWidth="1.8" />
              <rect x={side > 0 ? 412 : 283} y={52 + i * 24} width="25" height="12" rx="4" fill="url(#hardwareGloss)" stroke="#1E2025" strokeWidth="1.8" />
            </g>
          )))}

          {isSingleCut && binding?.id !== 'none' && <path d={bodyPath} fill={optionColor(binding, '#F2EEE2')} stroke="#1E2025" strokeWidth="5" transform="translate(-5 -4) scale(1.03)" />}
          <path d={bodyPath} fill={bodyFill} stroke="#17181C" strokeWidth="8" strokeLinejoin="round" />
          <path d={bodyPath} fill="url(#bodyGloss)" opacity="0.4" transform="translate(34 28) scale(0.9)" />
          <path d={bodyPath} fill="none" stroke="rgba(255,255,255,0.26)" strokeWidth="2" strokeLinejoin="round" transform="translate(4 5) scale(0.985)" />
          <path d={pickguardPath} fill={optionColor(pickguard)} stroke="#17181C" strokeWidth="4" opacity={isSingleCut ? 0.82 : 1} />
          {pickupYs.map(y => (
            <g key={y}>
              <rect x={344 - pickupWidth / 2} y={y} width={pickupWidth} height={pickupHeight} rx="7" fill={pickupFill} stroke="#DDE2EA" strokeWidth="2" />
              <line x1={356 - pickupWidth / 2} x2={332 + pickupWidth / 2} y1={y + pickupHeight / 2} y2={y + pickupHeight / 2} stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
            </g>
          ))}
          <g fill={hardware} stroke="#1E2025" strokeWidth="2.6">
            <rect x="292" y={bridgeY} width="124" height="15" rx="7" fill="url(#hardwareGloss)" />
            {(isSingleCut || store.bridge === 'bigsby' || store.bridge === 'tuneomatic') && <rect x="278" y={tailpieceY} width="154" height="15" rx="7" fill="url(#hardwareGloss)" />}
            {store.bridge === 'bigsby' && <ellipse cx="356" cy={isSingleCut ? 448 : 430} rx="44" ry="15" fill="none" stroke={hardware} strokeWidth="7.5" />}
          </g>
          {(isSingleCut ? [[446, 326], [470, 302], [414, 380], [470, 376]] : [[444, 325], [461, 372], [417, 393]]).map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="12.5" fill={knobColor} stroke="#1E2025" strokeWidth="3.4" />
          ))}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <line key={i} x1={345 + i * 5.2} x2={294 + i * 20.8} y1="50" y2={stringEndY} stroke="#DDE2EA" strokeWidth="1.05" opacity="0.72" />
          ))}
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
  const useModularPreview = isModularShape(shape)
  const showSingleCutFallback = webglLost && shape === 'single-cut'

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {useModularPreview ? (
        <ModularSvgPreview />
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
