'use client'
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
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

function makeSStyleBodyShape() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.18, 0.96)
  shape.bezierCurveTo(-0.48, 1.16, -0.9, 1.02, -0.88, 0.62)
  shape.bezierCurveTo(-1.18, 0.48, -1.31, 0.14, -1.08, -0.12)
  shape.bezierCurveTo(-1.55, -0.46, -1.46, -1.36, -0.92, -1.69)
  shape.bezierCurveTo(-0.48, -1.96, 0.18, -1.85, 0.38, -1.48)
  shape.bezierCurveTo(0.86, -1.77, 1.45, -1.48, 1.52, -0.92)
  shape.bezierCurveTo(1.62, -0.19, 1.08, 0.24, 0.64, 0.17)
  shape.bezierCurveTo(0.82, 0.56, 0.54, 0.93, 0.16, 0.77)
  shape.bezierCurveTo(0.05, 0.86, -0.04, 0.92, -0.18, 0.96)
  return shape
}

function makePickguardShape() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.38, 0.61)
  shape.bezierCurveTo(-0.78, 0.52, -0.91, 0.1, -0.64, -0.13)
  shape.bezierCurveTo(-0.86, -0.54, -0.65, -1.08, -0.18, -1.16)
  shape.bezierCurveTo(0.24, -1.23, 0.68, -0.95, 0.82, -0.52)
  shape.bezierCurveTo(0.44, -0.34, 0.26, -0.02, 0.32, 0.35)
  shape.bezierCurveTo(0.07, 0.5, -0.14, 0.6, -0.38, 0.61)
  return shape
}

function InstancedParts({ name, matrices, castShadow, children }: { name: string; matrices: THREE.Matrix4[]; castShadow?: boolean; children: ReactNode }) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    matrices.forEach((matrix, index) => ref.current?.setMatrixAt(index, matrix))
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
  }, [matrices])

  return (
    <instancedMesh ref={ref} name={name} args={[undefined, undefined, matrices.length]} castShadow={castShadow}>
      {children}
    </instancedMesh>
  )
}

function SStyleInstrument({ view }: { view: 'standard' | 'detail' }) {
  const store = useConfigStore()
  const finish = FINISHES.find(f => f.id === store.finish)
  const neck = NECK_WOODS.find(n => n.id === store.neck)
  const board = FRETBOARDS.find(f => f.id === store.fretboard)
  const hw = HARDWARE_COLORS.find(h => h.id === store.hardware)
  const colors = makeColors(finish, neck, board, hw)
  const bodyGeometry = useMemo(() => new THREE.ExtrudeGeometry(makeSStyleBodyShape(), {
    depth: 0.26,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.055,
    bevelThickness: 0.055,
    curveSegments: 18,
  }).center(), [])
  const pickguardGeometry = useMemo(() => new THREE.ShapeGeometry(makePickguardShape(), 24), [])
  const topOpacity = store.top === 'solid' ? 0 : store.top === 'flame' ? 0.18 : store.top === 'quilted' ? 0.14 : 0.22
  const groupRotation: [number, number, number] = [0.02, view === 'detail' ? -0.18 : 0.12, -0.08]
  const pickupLayout = store.pickups === 'hss'
    ? ['single', 'single', 'hum']
    : store.pickups === 'singlecoil'
      ? ['single', 'single', 'single']
      : ['hum', 'hum']
  const fretMatrices = useMemo(() => Array.from({ length: 18 }, (_, i) => new THREE.Matrix4().makeTranslation(0, 0.05 + i * 0.145, 0.125)), [])
  const figureMatrices = useMemo(() => Array.from({ length: 9 }, (_, i) => new THREE.Matrix4().compose(
    new THREE.Vector3(0, -0.78 + i * 0.16, 0.163),
    new THREE.Quaternion(),
    new THREE.Vector3(1.1 - i * 0.035, 0.09, 1)
  )), [])
  const saddleMatrices = useMemo(() => Array.from({ length: 6 }, (_, i) => new THREE.Matrix4().makeTranslation(-0.31 + i * 0.124, 0.02, 0.07)), [])
  const knobMatrices = useMemo(() => Array.from({ length: 3 }, (_, i) => new THREE.Matrix4().compose(
    new THREE.Vector3(-0.1 * i, i * 0.27, 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
    new THREE.Vector3(1, 1, 1)
  )), [])
  const tunerPostMatrices = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const side = i < 3 ? -1 : 1
    const y = -0.23 + (i % 3) * 0.22
    return new THREE.Matrix4().makeTranslation(side * 0.42, y, 0)
  }), [])
  const tunerButtonMatrices = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const side = i < 3 ? -1 : 1
    const y = -0.23 + (i % 3) * 0.22
    return new THREE.Matrix4().makeTranslation(side * 0.55, y, 0)
  }), [])
  const stringMatrices = useMemo(() => Array.from({ length: 6 }, (_, i) => new THREE.Matrix4().makeTranslation(-0.15 + i * 0.06, 0, 0)), [])

  return (
    <Center>
      <group rotation={groupRotation} scale={1.02} position={[0, -0.12, 0]}>
        <mesh name="neck" position={[0, 1.47, -0.05]} castShadow receiveShadow>
          <boxGeometry args={[0.54, 2.96, 0.16]} />
          <meshStandardMaterial color={colors.neck} roughness={0.42} metalness={0.02} envMapIntensity={1.2} />
        </mesh>
        <mesh name="neck headstock" position={[0.18, 3.14, -0.05]} rotation={[0, 0, -0.16]} castShadow receiveShadow>
          <boxGeometry args={[0.82, 0.74, 0.18]} />
          <meshStandardMaterial color={colors.neck} roughness={0.44} metalness={0.02} envMapIntensity={1.15} />
        </mesh>
        <mesh name="fretboard" position={[0, 1.35, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[0.36, 2.82, 0.08]} />
          <meshStandardMaterial color={colors.board} roughness={0.56} metalness={0.01} envMapIntensity={0.9} />
        </mesh>
        <InstancedParts name="frets" matrices={fretMatrices}>
          <boxGeometry args={[0.39, 0.012, 0.018]} />
          <meshStandardMaterial color="#D8DCE2" roughness={0.18} metalness={0.88} />
        </InstancedParts>
        <mesh name="body" geometry={bodyGeometry} position={[0, -0.72, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={colors.finish} roughness={Math.min(colors.finishRoughness, 0.24)} metalness={0.04} envMapIntensity={1.65} />
        </mesh>
        {finish?.id === 'sunburst' && (
          <mesh name="body burst center" geometry={bodyGeometry} position={[0, -0.72, 0.155]} scale={[0.72, 0.72, 0.04]}>
            <meshStandardMaterial color="#E6A445" roughness={0.16} metalness={0.02} transparent opacity={0.62} depthWrite={false} />
          </mesh>
        )}
        {topOpacity > 0 && (
          <InstancedParts name="body figure" matrices={figureMatrices}>
            <torusGeometry args={[0.72, 0.006, 6, 48]} />
            <meshStandardMaterial color={store.top === 'burl' ? '#3A2114' : '#F6DEAA'} transparent opacity={topOpacity} roughness={0.6} depthWrite={false} />
          </InstancedParts>
        )}
        <mesh name="pickguard" geometry={pickguardGeometry} position={[-0.08, -0.72, 0.182]} castShadow>
          <meshStandardMaterial color="#F2EEE2" roughness={0.34} metalness={0.02} envMapIntensity={0.85} />
        </mesh>
        <group name="pickups" position={[0, -0.46, 0.245]}>
          {pickupLayout.map((type, i) => {
            const y = pickupLayout.length === 3 ? 0.2 - i * 0.34 : 0.12 - i * 0.58
            return type === 'single' ? (
              <mesh key={`${type}-${i}`} name="single coil pickup" position={[0, y, 0]} castShadow>
                <boxGeometry args={[0.74, 0.14, 0.08]} />
                <meshStandardMaterial color="#ECE7D8" roughness={0.24} metalness={0.04} />
              </mesh>
            ) : (
              <group key={`${type}-${i}`} name="humbucker pickup" position={[0, y, 0]}>
                {[-0.1, 0.1].map(offset => (
                  <mesh key={offset} position={[0, offset, 0]} castShadow>
                    <boxGeometry args={[0.78, 0.13, 0.09]} />
                    <meshStandardMaterial color={store.pickups === 'active-hum' ? '#07080A' : '#17171A'} roughness={0.28} metalness={0.34} />
                  </mesh>
                ))}
              </group>
            )
          })}
        </group>
        <group name="bridge" position={[0, -1.18, 0.28]}>
          <mesh name="bridge plate" castShadow>
            <boxGeometry args={[0.88, store.bridge === 'trem' ? 0.28 : 0.18, 0.08]} />
            <meshStandardMaterial color={colors.hardware} roughness={0.2} metalness={0.9} envMapIntensity={1.7} />
          </mesh>
          <InstancedParts name="bridge saddles" matrices={saddleMatrices}>
            <boxGeometry args={[0.075, 0.16, 0.07]} />
            <meshStandardMaterial color="#E1E5EA" roughness={0.18} metalness={0.9} />
          </InstancedParts>
          {store.bridge === 'bigsby' && (
            <mesh name="bridge vibrato tailpiece" position={[0, -0.46, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 0.9, 32]} />
              <meshStandardMaterial color={colors.hardware} roughness={0.22} metalness={0.9} />
            </mesh>
          )}
        </group>
        <group name="knobs" position={[0.76, -1.2, 0.29]}>
          <InstancedParts name="control knobs" matrices={knobMatrices}>
            <cylinderGeometry args={[0.09, 0.09, 0.055, 24]} />
            <meshStandardMaterial color={colors.hardware} roughness={0.28} metalness={0.8} envMapIntensity={1.5} />
          </InstancedParts>
        </group>
        <mesh name="switch tip" position={[0.58, -0.18, 0.31]} rotation={[0.46, 0.12, -0.48]} castShadow>
          <capsuleGeometry args={[0.035, 0.18, 6, 12]} />
          <meshStandardMaterial color="#F4EFE0" roughness={0.32} metalness={0.02} />
        </mesh>
        <group name="tuners" position={[0.18, 3.18, 0.08]}>
          <InstancedParts name="tuner posts" matrices={tunerPostMatrices}>
            <cylinderGeometry args={[0.045, 0.045, 0.12, 16]} />
            <meshStandardMaterial color={colors.hardware} roughness={0.2} metalness={0.88} />
          </InstancedParts>
          <InstancedParts name="tuner buttons" matrices={tunerButtonMatrices}>
            <boxGeometry args={[0.17, 0.075, 0.04]} />
            <meshStandardMaterial color={colors.hardware} roughness={0.22} metalness={0.86} />
          </InstancedParts>
        </group>
        <group name="strings" position={[0, 0.64, 0.36]}>
          <InstancedParts name="strings" matrices={stringMatrices}>
            <cylinderGeometry args={[0.0045, 0.0045, 4.78, 8]} />
            <meshStandardMaterial color="#EEF2F5" roughness={0.22} metalness={0.92} />
          </InstancedParts>
        </group>
      </group>
    </Center>
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
  const castSceneShadows = shape !== 'modern-s'

  return (
    <>
      <ambientLight intensity={0.42} />
      <directionalLight position={[4.5, 7, 4]} intensity={1.35} castShadow={castSceneShadows} shadow-mapSize={[2048, 2048]} />
      <spotLight position={[-4, 4, 4]} angle={0.45} penumbra={0.7} intensity={0.8} color="#E2C07A" castShadow={castSceneShadows} />
      <pointLight position={[3, -1, 3]} color="#fff6df" intensity={0.42} />
      {shape !== 'modern-s' && <Environment preset="studio" />}
      {shape !== 'modern-s' && <ContactShadows position={[0, -2.35, -0.06]} opacity={0.32} scale={7.2} blur={3.1} far={4} color="#000000" />}
      <Suspense fallback={<ModelLoading />}>
        <Bounds fit clip observe margin={1.28}>
          {shape === 'modern-s' ? <SStyleInstrument view={view} /> : <GlbInstrument view={view} />}
        </Bounds>
      </Suspense>
    </>
  )
}

function CameraControls({ view }: { view: 'standard' | 'detail' | 'reset' }) {
  const { camera } = useThree()
  const shape = useConfigStore(s => s.shape)
  useEffect(() => {
    const distance = CAMERA_DISTANCE[shape] ?? CAMERA_DISTANCE.default
    const target = view === 'detail'
      ? new THREE.Vector3(0.12, 0.08, Math.max(4.6, distance * 0.72))
      : view === 'reset'
        ? new THREE.Vector3(0.28, 0.32, distance)
        : new THREE.Vector3(0.28, 0.32, distance)
    camera.position.copy(target)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, shape, view])
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
          frameloop="demand"
          gl={{ antialias: true, alpha: false }}
          style={{ background: 'radial-gradient(circle at 50% 45%, #17151a 0%, #09090B 62%)', width: '100%', height: '100%' }}
          shadows={shape !== 'modern-s'}
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
