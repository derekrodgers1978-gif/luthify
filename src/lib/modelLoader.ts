import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { InstrumentConfig } from '@/config/instrumentConfig'

export class ModelNotFoundError extends Error {
  constructor(public readonly path: string) {
    super(`Model file not found: ${path}`)
    this.name = 'ModelNotFoundError'
  }
}

export class InvalidGLBError extends Error {
  constructor(public readonly path: string, cause?: unknown) {
    super(`Invalid GLB file: ${path}`)
    this.name = 'InvalidGLBError'
    this.cause = cause
  }
}

export interface LoadedInstrumentModel {
  gltf: GLTF
  scene: THREE.Group
  meshMap: Map<string, THREE.Mesh>
  meshAudit: { found: string[]; missing: string[]; all: string[] }
}

export function normalizeMeshName(name: string) {
  return name
    .replace(/_mesh$/i, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
}

function loadWithLoader(path: string) {
  const loader = new GLTFLoader()
  return new Promise<GLTF>((resolve, reject) => {
    loader.load(
      path,
      resolve,
      undefined,
      error => reject(error),
    )
  })
}

export async function loadInstrumentModel(instrumentConfig: InstrumentConfig): Promise<LoadedInstrumentModel> {
  const response = await fetch(instrumentConfig.modelPath, { method: 'HEAD' })
  if (!response.ok) {
    if (response.status === 404) throw new ModelNotFoundError(instrumentConfig.modelPath)
    throw new InvalidGLBError(instrumentConfig.modelPath, new Error(`HTTP ${response.status}`))
  }

  let gltf: GLTF
  try {
    gltf = await loadWithLoader(instrumentConfig.modelPath)
  } catch (error) {
    throw new InvalidGLBError(instrumentConfig.modelPath, error)
  }

  const scene = gltf.scene.clone(true)
  const meshMap = new Map<string, THREE.Mesh>()
  const all: string[] = []

  scene.traverse(object => {
    if (!(object as THREE.Mesh).isMesh) return
    const mesh = object as THREE.Mesh
    const sourceName = mesh.name || mesh.geometry?.name || 'unnamed'
    const normalized = normalizeMeshName(sourceName)
    all.push(sourceName)
    console.info('[Luthify ModelLoader] Found mesh:', sourceName)
    meshMap.set(normalized, mesh)
  })

  const found = instrumentConfig.expectedMeshes.filter(name => meshMap.has(normalizeMeshName(name)))
  const missing = instrumentConfig.expectedMeshes.filter(name => !meshMap.has(normalizeMeshName(name)))

  missing.forEach(name => {
    console.warn(`[Luthify ModelLoader] Expected mesh missing: ${name}`)
  })

  return {
    gltf,
    scene,
    meshMap,
    meshAudit: { found, missing, all },
  }
}
