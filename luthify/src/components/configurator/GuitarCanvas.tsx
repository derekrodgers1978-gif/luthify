'use client'
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigStore } from '@/store/configStore'
import { FINISHES, FRETBOARDS, HARDWARE_COLORS, NECK_WOODS, TOPS } from '@/lib/configurator-options'

// ── Procedural guitar body (placeholder until GLTF model arrives) ─────────────
function GuitarBody() {
  const store = useConfigStore()
  const meshRef = useRef<THREE.Mesh>(null)
  const neckRef = useRef<THREE.Mesh>(null)
  const fbRef   = useRef<THREE.Mesh>(null)

  const finish  = FINISHES.find(f => f.id === store.finish)
  const fb      = FRETBOARDS.find(f => f.id === store.fretboard)
  const top     = TOPS.find(t => t.id === store.top)
  const neck    = NECK_WOODS.find(n => n.id === store.neck)
  const hw      = HARDWARE_COLORS.find(h => h.id === store.hardware)
  const hardwareColor = hw?.id === 'gold' ? '#C9A45C' : hw?.id === 'black' ? '#121216' : hw?.id === 'chrome' ? '#C9CED6' : '#A8A39A'

  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(finish?.hex ?? '#D4B896'),
    roughness: finish?.roughness ?? 0.2,
    metalness: 0.02,
    envMapIntensity: 1.4,
  }), [finish?.hex, finish?.roughness])

  const neckMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(neck?.id === 'maple' ? '#C8A05A' : neck?.id === 'roasted' ? '#8B4A20' : neck?.id === 'walnut' ? '#4A2411' : '#5C2F17'),
    roughness: 0.5,
    metalness: 0,
  }), [neck?.id])

  const topMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(top?.id === 'solid' ? (finish?.hex ?? '#D4B896') : top?.id === 'flame' ? '#C68B4A' : top?.id === 'burl' ? '#8B4D26' : '#D0A15F'),
    roughness: 0.28,
    metalness: 0.01,
    transparent: true,
    opacity: top?.id === 'solid' ? 0.18 : 0.42,
  }), [finish?.hex, top?.id])

  const hardwareMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(hardwareColor),
    metalness: 0.82,
    roughness: 0.26,
  }), [hardwareColor])

  const fbMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(fb?.hex ?? '#1A0A00'),
    roughness: 0.6,
    metalness: 0,
  }), [fb?.hex])

  // Smooth color transition
  useFrame(() => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      const target = new THREE.Color(finish?.hex ?? '#D4B896')
      mat.color.lerp(target, 0.06)
    }
  })

  // Body — LP-inspired single cutaway silhouette using lathe geometry
  const bodyShape = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, -1.4)
    shape.bezierCurveTo(0.9, -1.4,  1.5, -0.8,  1.5,  0)
    shape.bezierCurveTo(1.5,  0.7,  1.1,  1.2,  0.6,  1.4)
    shape.bezierCurveTo(0.3,  1.5,  0.1,  1.3,  0.1,  1.0)
    shape.bezierCurveTo(0.1,  0.6,  0.4,  0.4,  0.4,  0.1)
    shape.bezierCurveTo(0.4, -0.2,  0.2, -0.4,  0,   -0.4)
    shape.bezierCurveTo(-0.2,-0.4, -0.4,-0.2,  -0.4,  0.1)
    shape.bezierCurveTo(-0.4, 0.4, -0.1,  0.6, -0.1,  1.0)
    shape.bezierCurveTo(-0.1, 1.3, -0.3,  1.5, -0.6,  1.4)
    shape.bezierCurveTo(-1.1, 1.2, -1.5,  0.7, -1.5,  0)
    shape.bezierCurveTo(-1.5,-0.8, -0.9, -1.4,  0,   -1.4)
    return new THREE.ExtrudeGeometry(shape, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4 })
  }, [])

  return (
    <group rotation={[0.02, 0.12, 0.02]} position={[0, -0.65, 0]}>
      {/* Body */}
      <mesh ref={meshRef} geometry={bodyShape} material={bodyMat} castShadow receiveShadow position={[0, 0, 0]} />

      <mesh geometry={bodyShape} material={topMat} position={[0, 0, 0.16]} scale={[0.93, 0.93, 0.08]} />

      {/* Neck */}
      <mesh ref={neckRef} material={neckMat} castShadow position={[0.08, 2.2, 0.05]}>
        <boxGeometry args={[0.22, 2.0, 0.18]} />
      </mesh>

      {/* Fretboard */}
      <mesh ref={fbRef} material={fbMat} position={[0.08, 2.2, 0.16]}>
        <boxGeometry args={[0.2, 1.98, 0.04]} />
      </mesh>

      {/* Headstock */}
      <mesh material={neckMat} position={[0.08, 3.32, 0.05]}>
        <boxGeometry args={[0.26, 0.55, 0.16]} />
      </mesh>

      {/* Pickups */}
      <mesh position={[0.05, 0.4, 0.2]}>
        <boxGeometry args={[store.pickups === 'singlecoil' ? 0.62 : 0.72, store.pickups === 'p90' ? 0.26 : 0.18, 0.06]} />
        <meshStandardMaterial color="#0a0500" roughness={0.8} />
      </mesh>
      <mesh position={[0.05, -0.3, 0.2]}>
        <boxGeometry args={[store.pickups === 'hss' ? 0.62 : 0.72, store.pickups === 'p90' ? 0.26 : 0.18, 0.06]} />
        <meshStandardMaterial color="#0a0500" roughness={0.8} />
      </mesh>

      {/* Bridge */}
      <mesh position={[0.05, -0.7, 0.2]} material={hardwareMat}>
        <boxGeometry args={[store.bridge === 'bigsby' ? 0.75 : 0.55, store.bridge === 'trem' ? 0.16 : 0.08, 0.05]} />
      </mesh>

      {/* Strings */}
      {[-0.12,-0.07,-0.02,0.02,0.07,0.12].map((x, i) => (
        <mesh key={i} position={[x, 1.2, 0.22]} material={hardwareMat}>
          <cylinderGeometry args={[0.004, 0.004, 3.8, 4]} />
        </mesh>
      ))}

      {/* Knobs */}
      {[[0.85, -0.9], [1.0, -1.1], [0.85, -1.3]].map(([x,y], i) => (
        <mesh key={i} position={[x as number, y as number, 0.2]} material={hardwareMat}>
          <cylinderGeometry args={[0.07, 0.07, 0.09, 12]} />
        </mesh>
      ))}
    </group>
  )
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 3]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-3, 2, 2]} color="#C9A45C" intensity={0.8} />
      <pointLight position={[2, -2, 3]} color="#fff" intensity={0.3} />
      <Environment preset="studio" />
      <GuitarBody />
    </>
  )
}

// ── Canvas wrapper ─────────────────────────────────────────────────────────────
export default function GuitarCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0.15, 6], fov: 40 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#09090B', width: '100%', height: '100%' }}
      shadows
    >
      <Scene />
      <OrbitControls
        enablePan={false}
        target={[0, 0, 0]}
        minDistance={3.2}
        maxDistance={7.5}
        enableDamping
        dampingFactor={0.06}
        autoRotate={false}
        maxPolarAngle={Math.PI * 0.75}
        minPolarAngle={Math.PI * 0.2}
      />
    </Canvas>
  )
}
