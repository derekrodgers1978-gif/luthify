'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, OrbitControls, Preload } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js'
import { useConfigStore } from '@/store/configStore'
import { loadInstrumentModel, ModelNotFoundError, InvalidGLBError } from '@/lib/modelLoader'
import type { LoadedInstrumentModel } from '@/lib/modelLoader'
import { applyMaterialsByPartMap } from '@/lib/materialSystem'
import { normalizeMeshName } from '@/lib/modelLoader'

type ViewId = 'front' | 'side' | 'top' | 'reset'

const DARK_BACKGROUND = 'radial-gradient(circle at 50% 45%, #17151a 0%, #09090B 62%)'

function cloneMaterial(material: THREE.Material | THREE.Material[]) {
  return Array.isArray(material)
    ? material.map(item => item.clone())
    : material.clone()
}

function PreparedInstrument({ loadedModel }: { loadedModel: LoadedInstrumentModel }) {
  const instrumentConfig = useConfigStore(s => s.instrumentConfig)
  const finishId = useConfigStore(s => s.finishId)
  const hardwareId = useConfigStore(s => s.hardwareId)
  const fretboardId = useConfigStore(s => s.fretboardId)
  const pickupId = useConfigStore(s => s.pickupId)
  const neckWoodId = useConfigStore(s => s.neck)

  const model = useMemo(() => {
    const scene = loadedModel.scene.clone(true)
    scene.traverse(object => {
      if (!(object as THREE.Mesh).isMesh) return
      const mesh = object as THREE.Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.material = cloneMaterial(mesh.material)
    })
    return scene
  }, [loadedModel.scene])

  const { meshMap, center, scale } = useMemo(() => {
    const map = new Map<string, THREE.Mesh>()
    model.traverse(object => {
      if (!(object as THREE.Mesh).isMesh) return
      const mesh = object as THREE.Mesh
      map.set(normalizeMeshName(mesh.name || mesh.geometry?.name || 'unnamed'), mesh)
    })
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const centerPoint = box.getCenter(new THREE.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z) || 1
    return {
      meshMap: map,
      center: centerPoint,
      scale: instrumentConfig.camera.targetSize / maxDimension,
    }
  }, [instrumentConfig.camera.targetSize, model])

  useEffect(() => {
    applyMaterialsByPartMap(meshMap, instrumentConfig, {
      finishId,
      hardwareId,
      fretboardId,
      pickupId,
      neckWoodId,
    })
  }, [finishId, fretboardId, hardwareId, instrumentConfig, meshMap, neckWoodId, pickupId])

  return <primitive object={model} position={[-center.x * scale, -center.y * scale, -center.z * scale]} scale={scale} />
}

function CameraRig({ view, controlsRef }: { view: ViewId; controlsRef: RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree()
  const instrumentConfig = useConfigStore(s => s.instrumentConfig)
  const target = useMemo(() => new THREE.Vector3(...instrumentConfig.camera.target), [instrumentConfig])
  const desiredPosition = useMemo(() => new THREE.Vector3(...instrumentConfig.camera[view]), [instrumentConfig, view])

  useFrame(() => {
    camera.position.lerp(desiredPosition, 0.085)
    const controls = controlsRef.current
    if (controls) {
      controls.target.lerp(target, 0.085)
      controls.update()
    } else {
      camera.lookAt(target)
    }
  })

  return null
}

function Scene({ loadedModel, view }: { loadedModel: LoadedInstrumentModel | null; view: ViewId }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const instrumentConfig = useConfigStore(s => s.instrumentConfig)

  return (
    <>
      <CameraRig view={view} controlsRef={controlsRef} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[4.5, 7, 4]} intensity={1.35} castShadow shadow-mapSize={[2048, 2048]} />
      <spotLight position={[-4, 4, 4]} angle={0.45} penumbra={0.7} intensity={0.8} color="#E2C07A" castShadow />
      <pointLight position={[3, -1, 3]} color="#fff6df" intensity={0.42} />
      <Environment preset="studio" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, instrumentConfig.camera.groundY, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <shadowMaterial opacity={0.32} color="#000000" />
      </mesh>
      {loadedModel && <PreparedInstrument loadedModel={loadedModel} />}
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        target={instrumentConfig.camera.target}
        minDistance={3.2}
        maxDistance={10}
        enableDamping
        dampingFactor={0.08}
        autoRotate={false}
        maxPolarAngle={Math.PI * 0.75}
        minPolarAngle={Math.PI * 0.08}
      />
      <Preload all />
    </>
  )
}

function LoadingOverlay() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(201,164,92,0.3)', borderTopColor: '#C9A45C', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontSize: '0.8rem', color: 'rgba(245,241,232,0.52)' }}>Loading model...</p>
      </div>
    </div>
  )
}

function ErrorOverlay() {
  const instrumentConfig = useConfigStore(s => s.instrumentConfig)
  const errorCode = useConfigStore(s => s.errorCode)
  if (!errorCode) return null
  const title = errorCode === 'NOT_FOUND' ? 'Model file not found' : errorCode === 'INVALID_GLB' ? 'Invalid GLB file' : 'Unable to load model'

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 9, display: 'grid', placeItems: 'center', background: DARK_BACKGROUND }}>
      <div style={{ maxWidth: 420, padding: '24px 28px', borderRadius: 18, background: 'rgba(9,9,11,0.86)', border: '1px solid rgba(201,164,92,0.22)', boxShadow: '0 18px 56px rgba(0,0,0,0.38)', textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C9A45C', fontWeight: 700, marginBottom: 8 }}>3D Model</div>
        <h3 style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1.45rem', marginBottom: 10 }}>{title}</h3>
        <p style={{ color: 'rgba(245,241,232,0.58)', fontSize: '0.82rem', lineHeight: 1.55, wordBreak: 'break-word' }}>{instrumentConfig.modelPath}</p>
      </div>
    </div>
  )
}

function ViewButtons({ view, setView }: { view: ViewId; setView: (view: ViewId) => void }) {
  const buttons: [ViewId, string][] = [['front', 'Front'], ['side', 'Side'], ['top', 'Top'], ['reset', 'Reset']]
  return (
    <div style={{ position: 'absolute', left: 20, top: 64, zIndex: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {buttons.map(([id, label]) => (
        <button
          key={id}
          onClick={() => setView(id)}
          style={{ border: '1px solid rgba(201,164,92,0.24)', background: view === id ? 'rgba(201,164,92,0.14)' : 'rgba(9,9,11,0.68)', color: '#C9A45C', borderRadius: 999, padding: '7px 12px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function MeshDebugPanel() {
  const audit = useConfigStore(s => s.meshAudit)
  const expected = useConfigStore(s => s.instrumentConfig.expectedMeshes)
  const [open, setOpen] = useState(false)
  const expectedSet = useMemo(() => new Set(expected.map(normalizeMeshName)), [expected])
  if (!audit) return null

  const rows = [
    ...audit.all.map(name => ({ name, status: expectedSet.has(normalizeMeshName(name)) ? 'expected' : 'detected' })),
    ...audit.missing.map(name => ({ name, status: 'missing' })),
  ]

  return (
    <div style={{ position: 'absolute', right: 20, bottom: 78, zIndex: 12, width: open ? 270 : 'auto', maxHeight: 280, overflow: 'hidden', background: 'rgba(9,9,11,0.82)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, backdropFilter: 'blur(12px)' }}>
      <button onClick={() => setOpen(value => !value)} style={{ width: '100%', padding: '9px 12px', border: 0, background: 'transparent', color: '#C9A45C', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}>
        Mesh Debug ({audit.all.length})
      </button>
      {open && (
        <div style={{ maxHeight: 230, overflowY: 'auto', padding: '0 12px 12px' }}>
          {rows.map((row, index) => (
            <div key={`${row.status}-${row.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0', borderTop: index === 0 ? '1px solid rgba(255,255,255,0.06)' : 0 }}>
              <span style={{ color: 'rgba(245,241,232,0.68)', fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
              <span style={{ color: row.status === 'missing' ? '#ff6b6b' : row.status === 'expected' ? '#5fb87a' : 'rgba(245,241,232,0.32)', fontSize: '0.62rem', textTransform: 'uppercase' }}>{row.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GuitarCanvas() {
  const [view, setView] = useState<ViewId>('reset')
  const [loadedModel, setLoadedModel] = useState<LoadedInstrumentModel | null>(null)
  const instrumentConfig = useConfigStore(s => s.instrumentConfig)
  const modelStatus = useConfigStore(s => s.modelStatus)
  const setModelStatus = useConfigStore(s => s.setModelStatus)
  const setError = useConfigStore(s => s.setError)
  const setMeshAudit = useConfigStore(s => s.setMeshAudit)

  useEffect(() => {
    let cancelled = false
    setLoadedModel(null)
    setMeshAudit(null)
    setError(null)
    setModelStatus('loading')

    loadInstrumentModel(instrumentConfig)
      .then(model => {
        if (cancelled) return
        setLoadedModel(model)
        setMeshAudit(model.meshAudit)
        setModelStatus('ready')
      })
      .catch(error => {
        if (cancelled) return
        setLoadedModel(null)
        setMeshAudit(null)
        if (error instanceof ModelNotFoundError) {
          setError('NOT_FOUND')
        } else if (error instanceof InvalidGLBError) {
          setError('INVALID_GLB')
        } else {
          setError('UNKNOWN')
        }
      })

    return () => {
      cancelled = true
    }
  }, [instrumentConfig, setError, setMeshAudit, setModelStatus])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: DARK_BACKGROUND }}>
      <Canvas
        camera={{ position: instrumentConfig.camera.reset, fov: instrumentConfig.camera.fov }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: DARK_BACKGROUND, width: '100%', height: '100%' }}
        shadows
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1
        }}
      >
        <Scene loadedModel={modelStatus === 'ready' ? loadedModel : null} view={view} />
      </Canvas>
      {modelStatus === 'loading' && <LoadingOverlay />}
      {modelStatus === 'error' && <ErrorOverlay />}
      <ViewButtons view={view} setView={setView} />
      <MeshDebugPanel />
    </div>
  )
}
