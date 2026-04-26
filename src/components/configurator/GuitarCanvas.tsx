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
type FinishOption = { id: string; hex?: string; roughness?: number; finishStyle?: 'solid' | 'burst'; burstEdgeHex?: string }
type StratPartRole = 'body' | 'neck' | 'fretboard' | 'hardware' | 'other'

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

function parseObjectIndex(name: string) {
  const match = /Object_(\d+)/i.exec(name)
  return match ? Number(match[1]) : -1
}

function stratPartRole(mesh: THREE.Mesh, materialName: string): StratPartRole {
  const objectIndex = parseObjectIndex(mesh.name)
  const key = `${mesh.name} ${materialName}`.toLowerCase()
  if (key.includes('bodymaterial')) return 'body'
  if (key.includes('stringmaterial') || key.includes('metalpartsmaterial')) return 'hardware'
  if (key.includes('neckmaterial')) {
    if (objectIndex === 32) return 'fretboard'
    return 'neck'
  }
  return 'other'
}

function applyModernSBodyFinish(mat: THREE.MeshStandardMaterial, finish: FinishOption | undefined) {
  mat.color = new THREE.Color(finish?.hex ?? '#D4B896')
  mat.metalness = 0.12
  mat.roughness = Math.min(finish?.roughness ?? 0.18, 0.24)
  if (finish?.finishStyle !== 'burst') {
    mat.customProgramCacheKey = () => `modern-s-solid-${finish?.id ?? 'default'}`
    return
  }
  mat.onBeforeCompile = shader => {
    shader.uniforms.uBurstCenter = { value: new THREE.Color(finish.hex ?? '#A35E28') }
    shader.uniforms.uBurstEdge = { value: new THREE.Color(finish.burstEdgeHex ?? '#150706') }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vBurstUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvBurstUv = uv;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uBurstCenter;\nuniform vec3 uBurstEdge;\nvarying vec2 vBurstUv;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float d = distance(vBurstUv, vec2(0.52, 0.5));
vec3 burstMix = mix(uBurstCenter, uBurstEdge, smoothstep(0.28, 0.82, d));
diffuseColor.rgb *= burstMix;`
      )
  }
  mat.customProgramCacheKey = () => `modern-s-burst-${finish?.id ?? 'default'}-${finish?.hex ?? ''}-${finish?.burstEdgeHex ?? ''}`
}

function enhanceModernSMaterial(mesh: THREE.Mesh, material: THREE.Material, colors: ReturnType<typeof makeColors>, finish?: FinishOption) {
  const mat = material as THREE.MeshStandardMaterial
  if (!mat.isMeshStandardMaterial) return
  const role = stratPartRole(mesh, mat.name)
  mat.envMapIntensity = 1.8
  if (role === 'body') {
    applyModernSBodyFinish(mat, finish)
  } else if (role === 'neck') {
    mat.color = new THREE.Color(colors.neck)
    mat.metalness = 0.03
    mat.roughness = 0.45
  } else if (role === 'fretboard') {
    mat.color = new THREE.Color(colors.board)
    mat.metalness = 0
    mat.roughness = 0.62
  } else if (role === 'hardware') {
    mat.color = new THREE.Color(colors.hardware)
    mat.metalness = 0.95
    mat.roughness = 0.2
  }
  mat.needsUpdate = true
}

function StratLayeredModel({ colors, finish }: { colors: ReturnType<typeof makeColors>; finish?: FinishOption }) {
  const pickups = useConfigStore(s => s.pickups)
  const bridge = useConfigStore(s => s.bridge)

  const bodyGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.42, -0.1)
    shape.bezierCurveTo(-0.5, -0.26, -0.47, -0.44, -0.34, -0.5)
    shape.bezierCurveTo(-0.18, -0.57, -0.03, -0.5, 0.08, -0.4)
    shape.bezierCurveTo(0.16, -0.34, 0.21, -0.36, 0.22, -0.44)
    shape.bezierCurveTo(0.25, -0.58, 0.36, -0.62, 0.44, -0.55)
    shape.bezierCurveTo(0.54, -0.46, 0.5, -0.3, 0.42, -0.2)
    shape.bezierCurveTo(0.35, -0.1, 0.33, -0.03, 0.4, 0.05)
    shape.bezierCurveTo(0.52, 0.16, 0.55, 0.36, 0.42, 0.47)
    shape.bezierCurveTo(0.31, 0.56, 0.1, 0.52, -0.01, 0.45)
    shape.bezierCurveTo(-0.07, 0.42, -0.14, 0.43, -0.19, 0.49)
    shape.bezierCurveTo(-0.3, 0.59, -0.5, 0.54, -0.57, 0.4)
    shape.bezierCurveTo(-0.64, 0.26, -0.57, 0.06, -0.45, -0.01)
    shape.bezierCurveTo(-0.39, -0.04, -0.38, -0.06, -0.42, -0.1)

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSize: 0.01,
      bevelThickness: 0.015,
      bevelSegments: 3,
      curveSegments: 20,
    })
    geometry.rotateX(-Math.PI / 2)
    geometry.translate(0, -0.045, 0)
    return geometry
  }, [])

  const pickguardGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.32, -0.02)
    shape.bezierCurveTo(-0.2, -0.23, 0.09, -0.22, 0.2, -0.08)
    shape.bezierCurveTo(0.28, 0, 0.31, 0.09, 0.24, 0.19)
    shape.bezierCurveTo(0.13, 0.33, -0.1, 0.3, -0.23, 0.18)
    shape.bezierCurveTo(-0.34, 0.1, -0.37, 0.04, -0.32, -0.02)
    const geometry = new THREE.ShapeGeometry(shape)
    geometry.rotateX(-Math.PI / 2)
    geometry.translate(0, 0.021, 0)
    return geometry
  }, [])

  const bodyColor = finish?.hex ?? colors.finish
  const pickupPositions: [number, number, number][] = [
    [-0.03, 0.03, -0.16],
    [-0.03, 0.03, -0.04],
    [-0.03, 0.03, 0.08],
  ]

  const renderPickupAt = (index: number, type: 'single' | 'humbucker' | 'p90') => {
    const [x, y, z] = pickupPositions[index]
    const width = type === 'single' ? 0.095 : type === 'p90' ? 0.11 : 0.12
    const depth = type === 'single' ? 0.034 : 0.048
    const color = type === 'single' ? '#f5f0e6' : '#111116'
    return (
      <mesh key={`${type}-${index}`} position={[x, y, z]}>
        <boxGeometry args={[width, 0.018, depth]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.3} />
      </mesh>
    )
  }

  const pickupLayout =
    pickups === 'hss'
      ? ['humbucker', 'single', 'single']
      : pickups === 'singlecoil'
        ? ['single', 'single', 'single']
        : pickups === 'dual-hum' || pickups === 'active-hum'
          ? ['humbucker', 'single', 'humbucker']
          : pickups === 'p90'
            ? ['p90', 'p90', 'p90']
            : ['single', 'single', 'single']

  const bridgeNode =
    bridge === 'trem' ? (
      <group>
        <mesh position={[-0.03, 0.024, -0.275]}>
          <boxGeometry args={[0.16, 0.016, 0.065]} />
          <meshStandardMaterial color={colors.hardware} metalness={0.95} roughness={0.2} />
        </mesh>
        <mesh position={[-0.09, 0.01, -0.315]} rotation={[0.7, 0, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.1, 12]} />
          <meshStandardMaterial color={colors.hardware} metalness={0.95} roughness={0.2} />
        </mesh>
      </group>
    ) : bridge === 'hardtail' ? (
      <mesh position={[-0.03, 0.024, -0.275]}>
        <boxGeometry args={[0.145, 0.018, 0.05]} />
        <meshStandardMaterial color={colors.hardware} metalness={0.95} roughness={0.24} />
      </mesh>
    ) : bridge === 'tuneomatic' ? (
      <group>
        <mesh position={[-0.03, 0.028, -0.25]}>
          <boxGeometry args={[0.12, 0.014, 0.022]} />
          <meshStandardMaterial color={colors.hardware} metalness={0.95} roughness={0.24} />
        </mesh>
        <mesh position={[-0.03, 0.028, -0.295]}>
          <boxGeometry args={[0.092, 0.013, 0.018]} />
          <meshStandardMaterial color={colors.hardware} metalness={0.95} roughness={0.24} />
        </mesh>
      </group>
    ) : (
      <group>
        <mesh position={[-0.03, 0.02, -0.29]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.12, 18]} />
          <meshStandardMaterial color={colors.hardware} metalness={0.95} roughness={0.24} />
        </mesh>
        <mesh position={[-0.03, 0.028, -0.24]}>
          <boxGeometry args={[0.1, 0.012, 0.02]} />
          <meshStandardMaterial color={colors.hardware} metalness={0.95} roughness={0.24} />
        </mesh>
      </group>
    )

  return (
    <group rotation={[0, Math.PI / 2 + 0.08, 0]}>
      <mesh geometry={bodyGeometry} castShadow receiveShadow>
        <meshStandardMaterial color={bodyColor} metalness={0.08} roughness={Math.min(finish?.roughness ?? 0.2, 0.26)} />
      </mesh>
      <mesh geometry={pickguardGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#f2eee2" metalness={0.02} roughness={0.35} />
      </mesh>

      <mesh position={[0, 0.005, 0.64]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 0.06, 0.9]} />
        <meshStandardMaterial color={colors.neck} roughness={0.44} metalness={0.03} />
      </mesh>
      <mesh position={[0, 0.04, 0.64]} castShadow receiveShadow>
        <boxGeometry args={[0.062, 0.014, 0.88]} />
        <meshStandardMaterial color={colors.board} roughness={0.6} metalness={0} />
      </mesh>
      <mesh position={[0, 0.01, 1.16]} castShadow receiveShadow>
        <boxGeometry args={[0.14, 0.055, 0.24]} />
        <meshStandardMaterial color={colors.neck} roughness={0.42} metalness={0.02} />
      </mesh>

      {pickupLayout.map((kind, i) => renderPickupAt(i, kind as 'single' | 'humbucker' | 'p90'))}
      {bridgeNode}

      <group>
        {[-0.18, -0.135, -0.09].map(z => (
          <mesh key={z} position={[0.23, 0.026, z]}>
            <cylinderGeometry args={[0.022, 0.022, 0.02, 18]} />
            <meshStandardMaterial color="#101015" roughness={0.35} metalness={0.4} />
          </mesh>
        ))}
      </group>

      <mesh position={[0.205, 0.03, -0.02]} rotation={[0.5, 0.3, 0.1]}>
        <boxGeometry args={[0.08, 0.008, 0.025]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.25} metalness={0.12} />
      </mesh>

      <group>
        {[-0.05, -0.03, -0.01, 0.01, 0.03, 0.05].map((x, i) => (
          <group key={x}>
            <mesh position={[x, 0.055, 1.19]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.045, 14]} />
              <meshStandardMaterial color={colors.hardware} metalness={0.95} roughness={0.2} />
            </mesh>
            <mesh position={[x, 0.067, 1.22]}>
              <boxGeometry args={[0.016, 0.012, 0.02]} />
              <meshStandardMaterial color={colors.hardware} metalness={0.95} roughness={0.2} />
            </mesh>
            <mesh position={[x, 0.051, 0.48 - i * 0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0015, 0.0015, 1.52, 8]} />
              <meshStandardMaterial color="#cfd6df" metalness={0.9} roughness={0.18} />
            </mesh>
          </group>
        ))}
      </group>
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
      materials.forEach(mat => {
        if (shape.id === 'modern-s') {
          enhanceModernSMaterial(mesh, mat, colors, finish)
          return
        }
        enhanceMaterial(materialRole(mesh.name, mat.name), mat, colors, mesh, maxDimension, shape.id, finish)
      })
    })
  }, [colors, finish, maxDimension, model, shape.id])

  const baseRotation = MODEL_ROTATION[shape.id] ?? [0, 0, 0]
  const yRotation = baseRotation[1] + (view === 'detail' ? -0.12 : 0.08)

  if (shape.id === 'modern-s') {
    return (
      <Center>
        <group scale={2.35}>
          <StratLayeredModel colors={colors} finish={finish} />
        </group>
      </Center>
    )
  }

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
