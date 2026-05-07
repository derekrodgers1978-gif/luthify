'use client'

import { useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

type ViewMode = 'standard' | 'detail'
type ModularGuitarModule = 'BODY' | 'NECK' | 'FRETBOARD' | 'PICKGUARD' | 'HARDWARE' | 'PICKUPS'

const MODULE_SLOTS: ModularGuitarModule[] = [
  'BODY',
  'NECK',
  'FRETBOARD',
  'PICKGUARD',
  'HARDWARE',
  'PICKUPS',
]

function EmptyModularScene() {
  return (
    <>
      <ambientLight intensity={0.42} />
      <directionalLight position={[4.5, 7, 4]} intensity={1.35} castShadow shadow-mapSize={[2048, 2048]} />
      <spotLight position={[-4, 4, 4]} angle={0.45} penumbra={0.7} intensity={0.8} color="#E2C07A" castShadow />
      <pointLight position={[3, -1, 3]} color="#fff6df" intensity={0.42} />
      <Environment preset="studio" />
    </>
  )
}

function CameraControls({ view }: { view: ViewMode }) {
  const { camera } = useThree()

  useFrame(() => {
    const target = view === 'detail'
      ? new THREE.Vector3(0.12, 0.08, 4.6)
      : new THREE.Vector3(0.28, 0.32, 6.4)

    camera.position.lerp(target, 0.08)
    camera.lookAt(0, 0, 0)
  })

  return null
}

function ModularBuilderPlaceholder() {
  return (
    <div
      aria-live="polite"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 8,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
        padding: 24,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <p
          style={{
            margin: 0,
            fontFamily: "'Bodoni Moda',serif",
            fontSize: 'clamp(1.8rem, 3vw, 3.1rem)',
            lineHeight: 1,
            color: '#F5F1E8',
            textShadow: '0 12px 42px rgba(0,0,0,0.6)',
          }}
        >
          Modular guitar builder coming soon
        </p>
        <div
          style={{
            marginTop: 22,
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {MODULE_SLOTS.map(slot => (
            <span
              key={slot}
              style={{
                border: '1px solid rgba(201,164,92,0.24)',
                background: 'rgba(9,9,11,0.62)',
                color: '#C9A45C',
                borderRadius: 999,
                padding: '7px 11px',
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              {slot}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GuitarCanvas() {
  const [view, setView] = useState<ViewMode>('standard')
  const [webglLost, setWebglLost] = useState(false)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
        <EmptyModularScene />
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

      <ModularBuilderPlaceholder />

      {webglLost && (
        <div
          role="status"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 88,
            zIndex: 12,
            transform: 'translateX(-50%)',
            border: '1px solid rgba(201,164,92,0.28)',
            background: 'rgba(9,9,11,0.82)',
            color: '#F5F1E8',
            borderRadius: 999,
            padding: '8px 14px',
            fontSize: '0.72rem',
            letterSpacing: '0.04em',
            backdropFilter: 'blur(10px)',
          }}
        >
          3D preview paused. Restore WebGL to continue.
        </div>
      )}

      <div style={{ position: 'absolute', left: 20, top: 64, zIndex: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          ['standard', 'Reset'],
          ['detail', 'Zoom'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setView(id as ViewMode)} style={{ border: '1px solid rgba(201,164,92,0.24)', background: view === id ? 'rgba(201,164,92,0.14)' : 'rgba(9,9,11,0.68)', color: '#C9A45C', borderRadius: 999, padding: '7px 12px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
