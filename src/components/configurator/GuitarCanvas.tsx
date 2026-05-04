'use client'

import { Component, Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Bounds, Center, ContactShadows, Environment, Html, OrbitControls, Preload, useGLTF, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigStore } from '@/store/configStore'
import {
  getFinishOption,
  getFretboardOption,
  getHardwareOption,
  getInstrumentDefinition,
  getNeckOption,
  getPickupOption,
} from '@/lib/instrumentConfig'
import {
  assertModelFile,
  getInstrumentModelPath,
  getModelErrorMessage,
  mapMeshesByPart,
  type InstrumentPart,
} from '@/lib/modelLoader'

const S_STYLE_MODEL = getInstrumentModelPath('s-style-electric')
useGLTF.preload(S_STYLE_MODEL)

type ViewerState = 'checking' | 'ready' | 'error'
type ModelErrorBoundaryState = { error: Error | null }

function hardwareColor(id: string) {
  if (id === 'gold' || id === 'aged-brass') return '#C9A45C'
  if (id === 'black') return '#111116'
  if (id === 'nickel') return '#D2D5D8'
  return '#C9CED6'
}

function neckColor(id: string) {
  if (id === 'maple') return '#C8A05A'
  if (id === 'roasted') return '#8B4A20'
  if (id === 'walnut') return '#4A2411'
  return '#5C2F17'
}

function pickupMaterialColor(id: string) {
  if (id === 'singlecoil') return '#f4eee2'
  if (id === 'hss') return '#e9e1d0'
  if (id === 'p90') return '#ebe2d5'
  return '#08080A'
}

function partMaterial(part: InstrumentPart, store: ReturnType<typeof useConfigStore.getState>) {
  const finish = getFinishOption(store.finish)
  const neck = getNeckOption(store.neck)
  const fretboard = getFretboardOption(store.fretboard)
  const hardware = getHardwareOption(store.hardware)
  const pickup = getPickupOption(store.pickups)

  if (part === 'BODY') {
    return new THREE.MeshStandardMaterial({
      color: finish.hex ?? '#D4B896',
      metalness: 0.04,
      roughness: Math.min(finish.roughness ?? 0.18, 0.28),
      envMapIntensity: 1.8,
    })
  }

  if (part === 'NECK') {
    return new THREE.MeshStandardMaterial({
      color: neckColor(neck.id),
      metalness: 0.02,
      roughness: 0.42,
      envMapIntensity: 1.35,
    })
  }

  if (part === 'FRETBOARD') {
    return new THREE.MeshStandardMaterial({
      color: fretboard.hex ?? '#1A0A00',
      metalness: 0,
      roughness: 0.58,
      envMapIntensity: 1.1,
    })
  }

  if (part === 'PICKGUARD') {
    return new THREE.MeshStandardMaterial({
      color: '#F2EEE2',
      metalness: 0.02,
      roughness: 0.34,
      envMapIntensity: 1.2,
    })
  }

  if (part === 'PICKUPS') {
    return new THREE.MeshStandardMaterial({
      color: pickupMaterialColor(pickup.id),
      metalness: pickup.id === 'active-hum' || pickup.id === 'dual-hum' ? 0.35 : 0.08,
      roughness: 0.3,
      envMapIntensity: 1.4,
    })
  }

  if (part === 'STRINGS' || part === 'FRETS' || part === 'BRIDGE' || part === 'KNOBS' || part === 'SWITCH' || part === 'TUNERS') {
    return new THREE.MeshStandardMaterial({
      color: hardwareColor(hardware.id),
      metalness: part === 'SWITCH' ? 0.5 : 0.92,
      roughness: part === 'STRINGS' ? 0.16 : 0.22,
      envMapIntensity: 1.9,
    })
  }

  return new THREE.MeshStandardMaterial({ color: '#C9CED6', metalness: 0.2, roughness: 0.4 })
}

function LoadingMessage() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div style={{ color: '#F5F1E8', fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Loading GLB {Math.round(progress)}%
      </div>
    </Html>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 50% 45%, #17151a 0%, #09090B 62%)' }}>
      <div style={{ border: '1px solid rgba(201,164,92,0.24)', borderRadius: 18, padding: '22px 26px', color: '#F5F1E8', background: 'rgba(9,9,11,0.74)', textAlign: 'center' }}>
        <div style={{ color: '#C9A45C', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>3D model unavailable</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{message}</div>
      </div>
    </div>
  )
}

type ModelErrorBoundaryProps = { children: React.ReactNode; onError: (error: Error) => void; resetKey: string }

class ModelErrorBoundary extends Component<ModelErrorBoundaryProps, ModelErrorBoundaryState> {
  state: ModelErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  componentDidUpdate(previousProps: ModelErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) return null
    return this.props.children
  }
}

function applyPartMaterials(scene: THREE.Object3D, store: ReturnType<typeof useConfigStore.getState>) {
  const { parts } = mapMeshesByPart(scene)

  for (const [part, meshes] of Object.entries(parts) as [InstrumentPart, THREE.Mesh[]][]) {
    const material = partMaterial(part, store)
    meshes.forEach(mesh => {
      mesh.castShadow = true
      mesh.receiveShadow = true
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(() => material.clone())
      } else {
        mesh.material = material.clone()
      }
    })
  }
}

function GlbInstrument({ view }: { view: 'standard' | 'detail' }) {
  const store = useConfigStore()
  const instrument = getInstrumentDefinition(store.shape)
  const modelPath = store.shape === 'modern-s' ? S_STYLE_MODEL : instrument.modelPath
  const { scene } = useGLTF(modelPath)

  const { model, center, scale } = useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z) || 1
    return { model: clone, center, scale: instrument.targetSize / maxDimension }
  }, [instrument.targetSize, scene])

  useEffect(() => {
    applyPartMaterials(model, store)
  }, [model, store.finish, store.fretboard, store.hardware, store.neck, store.pickups])

  return (
    <Center>
      <group rotation={[0, view === 'detail' ? -0.12 : 0.08, 0]}>
        <primitive object={model} position={[-center.x * scale, -center.y * scale, -center.z * scale]} scale={scale} />
      </group>
    </Center>
  )
}

function CameraRig({ view }: { view: 'standard' | 'detail' }) {
  const { camera } = useThree()
  const shape = useConfigStore(state => state.shape)
  const instrument = getInstrumentDefinition(shape)

  useEffect(() => {
    camera.position.set(...instrument.camera.position)
    if (view === 'detail') camera.position.multiplyScalar(0.68)
    camera.lookAt(...instrument.camera.target)
    camera.updateProjectionMatrix()
  }, [camera, instrument, view])

  return null
}

function Scene({ view }: { view: 'standard' | 'detail' }) {
  return (
    <>
      <ambientLight intensity={0.38} />
      <directionalLight position={[4.5, 7, 4]} intensity={1.25} castShadow shadow-mapSize={[2048, 2048]} />
      <spotLight position={[-4, 4, 4]} angle={0.42} penumbra={0.7} intensity={0.75} color="#E2C07A" castShadow />
      <Environment preset="studio" />
      <ContactShadows position={[0, -2.28, -0.06]} opacity={0.34} scale={7.4} blur={3.2} far={4} color="#000000" />
      <CameraRig view={view} />
      <Suspense fallback={<LoadingMessage />}>
        <Bounds fit clip observe margin={1.2}>
          <GlbInstrument view={view} />
        </Bounds>
        <Preload all />
      </Suspense>
    </>
  )
}

export default function GuitarCanvas() {
  const [view, setView] = useState<'standard' | 'detail'>('standard')
  const [viewerState, setViewerState] = useState<ViewerState>('checking')
  const [errorMessage, setErrorMessage] = useState('Model file not found')
  const shape = useConfigStore(state => state.shape)
  const instrument = getInstrumentDefinition(shape)
  const modelPath = shape === 'modern-s' ? S_STYLE_MODEL : instrument.modelPath

  useEffect(() => {
    let cancelled = false
    setViewerState('checking')
    assertModelFile(modelPath)
      .then(() => {
        if (!cancelled) setViewerState('ready')
      })
      .catch(error => {
        if (!cancelled) {
          setErrorMessage(getModelErrorMessage(error))
          setViewerState('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [modelPath])

  if (viewerState === 'error') return <ErrorMessage message={errorMessage} />

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {viewerState === 'checking' ? (
        <ErrorMessage message="Loading GLB model" />
      ) : (
        <ModelErrorBoundary key={modelPath} resetKey={modelPath} onError={error => {
          setErrorMessage(getModelErrorMessage(error))
          setViewerState('error')
        }}>
          <Canvas
            camera={{ position: [0.25, 0.18, 5.2], fov: 34 }}
            gl={{ antialias: true, alpha: false }}
            style={{ background: 'radial-gradient(circle at 50% 45%, #17151a 0%, #09090B 62%)', width: '100%', height: '100%' }}
            shadows
          >
            <Scene view={view} />
            <OrbitControls
              enablePan={false}
              target={[0, 0.08, 0]}
              minDistance={2.8}
              maxDistance={9}
              enableDamping
              dampingFactor={0.08}
              autoRotate={false}
              maxPolarAngle={Math.PI * 0.78}
              minPolarAngle={Math.PI * 0.18}
            />
          </Canvas>
        </ModelErrorBoundary>
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
