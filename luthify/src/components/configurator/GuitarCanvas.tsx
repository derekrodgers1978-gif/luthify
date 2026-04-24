'use client'
import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Float } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigStore } from '@/store/configStore'
import { FINISHES, FRETBOARDS } from '@/lib/configurator-options'

// ── Procedural guitar body (placeholder until GLTF model arrives) ─────────────
function GuitarBody() {
  const store = useConfigStore()
  const meshRef = useRef<THREE.Mesh>(null)
  const neckRef = useRef<THREE.Mesh>(null)
  const fbRef   = useRef<THREE.Mesh>(null)

  const finish  = FINISHES.find(f => f.id === store.finish)
  const fb      = FRETBOARDS.find(f => f.id === store.fretboard)

  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(finish?.hex ?? '#D4B896'),
    roughness: finish?.roughness ?? 0.2,
    metalness: 0.02,
    envMapIntensity: 1.4,
  }), [finish?.hex, finish?.roughness])

  const neckMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2C1503'),
    roughness: 0.5,
    metalness: 0,
  }), [])

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
    <group rotation={[0.1, 0.2, 0.05]}>
      {/* Body */}
      <mesh ref={meshRef} geometry={bodyShape} material={bodyMat} castShadow receiveShadow position={[0, 0, 0]} />

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
        <boxGeometry args={[0.72, 0.18, 0.06]} />
        <meshStandardMaterial color="#0a0500" roughness={0.8} />
      </mesh>
      <mesh position={[0.05, -0.3, 0.2]}>
        <boxGeometry args={[0.72, 0.18, 0.06]} />
        <meshStandardMaterial color="#0a0500" roughness={0.8} />
      </mesh>

      {/* Bridge */}
      <mesh position={[0.05, -0.7, 0.2]}>
        <boxGeometry args={[0.55, 0.08, 0.05]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Strings */}
      {[-0.12,-0.07,-0.02,0.02,0.07,0.12].map((x, i) => (
        <mesh key={i} position={[x, 1.2, 0.22]}>
          <cylinderGeometry args={[0.004, 0.004, 3.8, 4]} />
          <meshStandardMaterial color="#E2C07A" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* Knobs */}
      {[[0.85, -0.9], [1.0, -1.1], [0.85, -1.3]].map(([x,y], i) => (
        <mesh key={i} position={[x as number, y as number, 0.2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.09, 12]} />
          <meshStandardMaterial color="#C9A45C" metalness={0.7} roughness={0.3} />
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
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
        <GuitarBody />
      </Float>
    </>
  )
}

// ── Canvas wrapper ─────────────────────────────────────────────────────────────
export default function GuitarCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 5.5], fov: 42 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#09090B', width: '100%', height: '100%' }}
      shadows
    >
      <Scene />
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={9}
        enableDamping
        dampingFactor={0.06}
        autoRotate={false}
        maxPolarAngle={Math.PI * 0.75}
        minPolarAngle={Math.PI * 0.2}
      />
    </Canvas>
  )
}
