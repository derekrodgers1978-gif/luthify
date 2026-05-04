import * as THREE from 'three'

export const EXPECTED_PARTS = [
  'BODY',
  'NECK',
  'FRETBOARD',
  'FRETS',
  'PICKGUARD',
  'BRIDGE',
  'PICKUPS',
  'KNOBS',
  'SWITCH',
  'TUNERS',
  'STRINGS',
] as const

export type InstrumentPart = (typeof EXPECTED_PARTS)[number]
export type PartMeshMap = Record<InstrumentPart, THREE.Mesh[]>

export class ModelFileNotFoundError extends Error {
  constructor(path: string) {
    super(`Model file not found: ${path}`)
    this.name = 'ModelFileNotFoundError'
  }
}

export class InvalidGlbFileError extends Error {
  constructor(path: string) {
    super(`Invalid GLB file: ${path}`)
    this.name = 'InvalidGlbFileError'
  }
}

export type ModelStatus = 'ready' | 'missing' | 'invalid'

const modelStatusCache = new Map<string, ModelStatus>()

export async function assertModelFile(path: string) {
  try {
    const response = await fetch(path, { method: 'HEAD' })
    if (response.status === 404) {
      modelStatusCache.set(path, 'missing')
      throw new ModelFileNotFoundError(path)
    }
    if (!response.ok) {
      modelStatusCache.set(path, 'invalid')
      throw new InvalidGlbFileError(path)
    }
    modelStatusCache.set(path, 'ready')
  } catch (error) {
    if (error instanceof ModelFileNotFoundError) throw error
    modelStatusCache.set(path, 'invalid')
    throw new InvalidGlbFileError(path)
  }
}

export function getModelStatus(path: string) {
  return modelStatusCache.get(path) ?? 'invalid'
}

export function isModelFileNotFound(error: unknown) {
  return error instanceof ModelFileNotFoundError || (error instanceof Error && error.name === 'ModelFileNotFoundError')
}

export function getModelErrorMessage(error: unknown) {
  if (isModelFileNotFound(error)) return 'Model file not found'
  return 'Invalid GLB file'
}

export function getInstrumentModelPath(instrument: string) {
  return `/models/${instrument}.glb`
}

export function normalizePartName(name: string): InstrumentPart | null {
  const token = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  return EXPECTED_PARTS.find(part => token === part || token.startsWith(`${part}_`) || token.endsWith(`_${part}`)) ?? null
}

export function createEmptyPartMap(): PartMeshMap {
  return EXPECTED_PARTS.reduce((map, part) => {
    map[part] = []
    return map
  }, {} as PartMeshMap)
}

export function mapMeshesByPart(scene: THREE.Object3D) {
  const parts = createEmptyPartMap()
  const meshNames: string[] = []

  scene.traverse(object => {
    if (!(object as THREE.Mesh).isMesh) return
    const mesh = object as THREE.Mesh
    meshNames.push(mesh.name)

    const directPart = normalizePartName(mesh.name)
    const ancestorPart = findAncestorPart(mesh)
    const part = directPart ?? ancestorPart
    if (part) parts[part].push(mesh)
  })

  const missingParts = EXPECTED_PARTS.filter(part => parts[part].length === 0)
  console.info('[Luthify] GLB mesh names found:', meshNames)
  console.info('[Luthify] Missing expected GLB parts:', missingParts)

  return { parts, meshNames, missingParts }
}

function findAncestorPart(mesh: THREE.Object3D) {
  let current = mesh.parent
  while (current) {
    const part = normalizePartName(current.name)
    if (part) return part
    current = current.parent
  }
  return null
}
