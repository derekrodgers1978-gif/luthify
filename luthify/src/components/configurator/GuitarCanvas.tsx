'use client'
import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei'
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
  const shapeScale = store.shape === 'jazz-hollow'
    ? [1.12, 1.08, 1] as const
    : store.shape === 't-style'
      ? [0.92, 1.03, 1] as const
    : store.shape === 'double-cut'
      ? [1.05, 0.96, 1] as const
      : store.shape === 'semi-hollow'
    ? [1.08, 1, 1] as const
    : store.shape === 'offset'
      ? [0.96, 1.08, 1] as const
      : store.shape === 'single-cut'
        ? [1.03, 0.98, 1] as const
        : [1, 1, 1] as const

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
    opacity: top?.id === 'solid' ? 0.16 : 0.48,
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

  // Body — procedural silhouettes keep the preview responsive without a GLTF asset.
  const bodyShape = useMemo(() => {
    const shape = new THREE.Shape()
    if (store.shape === 'double-cut') {
      shape.moveTo(0, -1.38)
      shape.bezierCurveTo(0.92, -1.38, 1.38, -0.78, 1.34, -0.08)
      shape.bezierCurveTo(1.3, 0.58, 0.88, 1.26, 0.28, 1.36)
      shape.bezierCurveTo(0.08, 1.4, 0.02, 1.06, 0.28, 0.82)
      shape.bezierCurveTo(0.58, 0.54, 0.32, 0.12, 0, 0.12)
      shape.bezierCurveTo(-0.32, 0.12, -0.58, 0.54, -0.28, 0.82)
      shape.bezierCurveTo(-0.02, 1.06, -0.08, 1.4, -0.28, 1.36)
      shape.bezierCurveTo(-0.88, 1.26, -1.3, 0.58, -1.34, -0.08)
      shape.bezierCurveTo(-1.38, -0.78, -0.92, -1.38, 0, -1.38)
    } else if (store.shape === 't-style') {
      shape.moveTo(-0.08, -1.42)
      shape.bezierCurveTo(0.86, -1.44, 1.35, -0.85, 1.28, -0.2)
      shape.bezierCurveTo(1.18, 0.6, 1.48, 1.1, 0.72, 1.34)
      shape.bezierCurveTo(0.12, 1.52, -0.08, 1.04, 0.08, 0.7)
      shape.bezierCurveTo(0.22, 0.36, -0.02, 0.04, -0.34, 0.14)
      shape.bezierCurveTo(-0.7, 0.26, -0.5, 1.0, -0.9, 1.22)
      shape.bezierCurveTo(-1.52, 1.54, -1.58, 0.54, -1.34, -0.24)
      shape.bezierCurveTo(-1.08, -1.02, -0.76, -1.38, -0.08, -1.42)
    } else if (store.shape === 'jazz-hollow') {
      shape.moveTo(0, -1.52)
      shape.bezierCurveTo(1.05, -1.56, 1.62, -0.78, 1.56, 0.04)
      shape.bezierCurveTo(1.48, 1.0, 0.86, 1.56, 0.18, 1.5)
      shape.bezierCurveTo(-0.1, 1.48, -0.08, 1.04, 0.16, 0.76)
      shape.bezierCurveTo(0.4, 0.44, 0.16, 0.02, -0.16, -0.08)
      shape.bezierCurveTo(-0.54, -0.18, -0.76, 0.32, -0.56, 0.86)
      shape.bezierCurveTo(-0.36, 1.4, -0.82, 1.52, -1.14, 1.16)
      shape.bezierCurveTo(-1.62, 0.6, -1.62, -0.42, -1.24, -1.08)
      shape.bezierCurveTo(-0.92, -1.44, -0.48, -1.5, 0, -1.52)
    } else if (store.shape === 'single-cut') {
      shape.moveTo(0, -1.45)
      shape.bezierCurveTo(0.9, -1.45, 1.45, -0.95, 1.48, -0.15)
      shape.bezierCurveTo(1.5, 0.75, 1.0, 1.35, 0.35, 1.42)
      shape.bezierCurveTo(0.05, 1.45, 0.02, 1.05, 0.32, 0.82)
      shape.bezierCurveTo(0.62, 0.58, 0.42, 0.18, 0.06, 0.0)
      shape.bezierCurveTo(-0.22, -0.14, -0.42, 0.28, -0.36, 0.72)
      shape.bezierCurveTo(-0.28, 1.25, -0.56, 1.45, -0.9, 1.25)
      shape.bezierCurveTo(-1.42, 0.92, -1.55, 0.24, -1.4, -0.42)
      shape.bezierCurveTo(-1.22, -1.08, -0.78, -1.45, 0, -1.45)
    } else if (store.shape === 'offset') {
      shape.moveTo(-0.1, -1.45)
      shape.bezierCurveTo(0.92, -1.58, 1.55, -0.86, 1.34, -0.12)
      shape.bezierCurveTo(1.15, 0.58, 1.55, 1.15, 0.75, 1.42)
      shape.bezierCurveTo(0.18, 1.62, -0.06, 1.18, 0.1, 0.78)
      shape.bezierCurveTo(0.28, 0.32, -0.04, -0.08, -0.38, 0.12)
      shape.bezierCurveTo(-0.78, 0.34, -0.42, 1.0, -0.8, 1.28)
      shape.bezierCurveTo(-1.42, 1.72, -1.72, 0.66, -1.48, -0.18)
      shape.bezierCurveTo(-1.25, -0.96, -0.92, -1.36, -0.1, -1.45)
    } else if (store.shape === 'semi-hollow') {
      shape.moveTo(0, -1.42)
      shape.bezierCurveTo(1.0, -1.42, 1.55, -0.78, 1.5, 0.04)
      shape.bezierCurveTo(1.45, 0.85, 0.95, 1.36, 0.34, 1.4)
      shape.bezierCurveTo(0.02, 1.42, -0.1, 1.05, 0.1, 0.74)
      shape.bezierCurveTo(0.32, 0.38, 0.18, -0.06, -0.12, -0.18)
      shape.bezierCurveTo(-0.48, -0.34, -0.7, 0.2, -0.58, 0.74)
      shape.bezierCurveTo(-0.46, 1.28, -0.78, 1.44, -1.12, 1.12)
      shape.bezierCurveTo(-1.58, 0.68, -1.64, -0.22, -1.32, -0.86)
      shape.bezierCurveTo(-1.08, -1.28, -0.6, -1.42, 0, -1.42)
    } else {
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
    }
    return new THREE.ExtrudeGeometry(shape, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4 })
  }, [store.shape])

  return (
    <group rotation={[-0.08, 0.24, -0.03]} position={[0, -0.72, 0]}>
      {/* Body */}
      <mesh ref={meshRef} geometry={bodyShape} material={bodyMat} castShadow receiveShadow position={[0, 0, 0]} scale={shapeScale} />

      <mesh geometry={bodyShape} material={topMat} position={[0, 0, 0.16]} scale={[shapeScale[0] * 0.93, shapeScale[1] * 0.93, 0.08]} />

      {top?.id !== 'solid' && (
        <group position={[0, 0, 0.245]} scale={[shapeScale[0] * 0.82, shapeScale[1] * 0.82, 1]}>
          {[-0.42, -0.18, 0.08, 0.34].map((x, i) => (
            <mesh key={i} position={[x, 0.02 * (i % 2), 0]} rotation={[0, 0, 0.18 * (i - 1.5)]}>
              <boxGeometry args={[0.025, 2.08, 0.01]} />
              <meshStandardMaterial color={top?.id === 'burl' ? '#3D1C0D' : '#7B3F18'} transparent opacity={top?.id === 'quilted' ? 0.22 : 0.32} />
            </mesh>
          ))}
        </group>
      )}

      {(store.shape === 'semi-hollow' || store.shape === 'jazz-hollow') && (
        <mesh position={[0.44, 0.1, 0.24]} rotation={[0, 0, 0.2]}>
          <torusGeometry args={[0.18, 0.018, 8, 24]} />
          <meshStandardMaterial color="#08080A" roughness={0.8} />
        </mesh>
      )}

      {(store.shape === 'semi-hollow' || store.shape === 'jazz-hollow') && (
        <mesh position={[-0.72, 0.32, 0.22]} rotation={[0, 0, -0.16]}>
          <torusGeometry args={[0.22, 0.028, 10, 32]} />
          <meshStandardMaterial color="#080809" roughness={0.9} />
        </mesh>
      )}

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
      {(store.pickups === 'singlecoil' ? [0.48, 0.16, -0.18] : [0.4, -0.3]).map((y, i) => (
        <mesh key={i} position={[0.05, y, 0.2]}>
          <boxGeometry args={[store.pickups === 'singlecoil' ? 0.58 : 0.72, store.pickups === 'p90' ? 0.28 : 0.18, 0.06]} />
          <meshStandardMaterial color={store.pickups === 'active-hum' ? '#050505' : store.pickups === 'singlecoil' ? '#EEE8D8' : '#0a0500'} roughness={0.75} />
        </mesh>
      ))}
      {store.pickups === 'hss' && (
        <mesh position={[0.05, -0.66, 0.2]}>
          <boxGeometry args={[0.72, 0.18, 0.06]} />
          <meshStandardMaterial color="#0a0500" roughness={0.8} />
        </mesh>
      )}

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
      <ambientLight intensity={0.42} />
      <directionalLight position={[4.5, 7, 4]} intensity={1.35} castShadow shadow-mapSize={[2048, 2048]} />
      <spotLight position={[-4, 4, 4]} angle={0.45} penumbra={0.7} intensity={0.8} color="#E2C07A" castShadow />
      <pointLight position={[3, -1, 3]} color="#fff6df" intensity={0.42} />
      <Environment preset="studio" />
      <ContactShadows position={[0, -2.2, -0.06]} opacity={0.34} scale={6.5} blur={2.8} far={4} color="#000000" />
      <GuitarBody />
    </>
  )
}

function CameraControls({ view }: { view: 'standard' | 'detail' | 'reset' }) {
  const { camera } = useThree()
  useFrame(() => {
    const target = view === 'detail'
      ? new THREE.Vector3(0.2, 0.05, 3.55)
      : view === 'reset'
        ? new THREE.Vector3(0.35, 0.25, 5.35)
        : new THREE.Vector3(0.35, 0.25, 5.35)
    camera.position.lerp(target, 0.08)
    camera.lookAt(0, 0, 0)
  })
  return null
}

// ── Canvas wrapper ─────────────────────────────────────────────────────────────
export default function GuitarCanvas() {
  const [view, setView] = useState<'standard' | 'detail' | 'reset'>('standard')
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0.35, 0.25, 5.35], fov: 37 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'radial-gradient(circle at 50% 45%, #17151a 0%, #09090B 62%)', width: '100%', height: '100%' }}
        shadows
      >
        <CameraControls view={view} />
        <Scene />
        <OrbitControls
          enablePan={false}
          target={[0, 0, 0]}
          minDistance={3.4}
          maxDistance={6.8}
          enableDamping
          dampingFactor={0.08}
          autoRotate={false}
          maxPolarAngle={Math.PI * 0.75}
          minPolarAngle={Math.PI * 0.2}
        />
      </Canvas>
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
