import * as THREE from 'three'

export const MODULAR_GUITAR_MODEL_PATH = '/models/strat_fixed_separate_parts_sunburst.glb'

export const MODULAR_MESH_KEYS = [
  'BODY',
  'NECK',
  'FRETBOARD',
  'PICKGUARD',
  'PICKUPS',
  'HARDWARE',
] as const

export type ModularMeshKey = typeof MODULAR_MESH_KEYS[number]
export type MeshMap = Partial<Record<ModularMeshKey, THREE.Mesh>>

export interface MeshAudit {
  missing: ModularMeshKey[]
}

const MESH_NAME_ALIASES: Record<string, ModularMeshKey> = {
  BODY: 'BODY',
  NECK: 'NECK',
  FRETBOARD: 'FRETBOARD',
  FRET_BOARD: 'FRETBOARD',
  PICKGUARD: 'PICKGUARD',
  PICK_GUARD: 'PICKGUARD',
  PICKUP: 'PICKUPS',
  PICKUPS: 'PICKUPS',
  HARDWARE: 'HARDWARE',
}

export function normalizeMeshName(name: string) {
  let normalized = name.trim().toUpperCase().replace(/[\s-]+/g, '_')

  let previous = ''
  while (previous !== normalized) {
    previous = normalized
    normalized = normalized
      .replace(/\.\d+$/g, '')
      .replace(/[_\s-]?\d+$/g, '')
      .replace(/[_\s-]?MESH$/g, '')
  }

  return normalized.replace(/__+/g, '_').replace(/^_+|_+$/g, '')
}

function cloneMeshMaterials(mesh: THREE.Mesh) {
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map(material => material.clone())
    return
  }

  mesh.material = mesh.material.clone()
}

export function buildMeshMap(root: THREE.Object3D) {
  const found: MeshMap = {}

  root.traverse(obj => {
    if (!(obj as THREE.Mesh).isMesh) return

    const mesh = obj as THREE.Mesh
    mesh.castShadow = true
    mesh.receiveShadow = true
    cloneMeshMaterials(mesh)

    const normalizedName = normalizeMeshName(mesh.name)
    const key = MESH_NAME_ALIASES[normalizedName]
    if (key && !found[key]) {
      found[key] = mesh
    }
  })

  if (!found.BODY) {
    throw new Error('Modular guitar GLB is missing required BODY mesh')
  }

  const meshMap: MeshMap = {}
  MODULAR_MESH_KEYS.forEach(key => {
    if (found[key]) {
      meshMap[key] = found[key]
    }
  })

  const meshAudit: MeshAudit = {
    missing: MODULAR_MESH_KEYS.filter(key => key !== 'BODY' && !meshMap[key]),
  }

  console.log('meshMap:', Object.keys(meshMap))

  return { meshMap, meshAudit }
}

export function createModularGuitarModel(sourceScene: THREE.Object3D, targetSize: number) {
  const model = sourceScene.clone(true)
  const { meshMap, meshAudit } = buildMeshMap(model)
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDimension = Math.max(size.x, size.y, size.z) || 1

  return {
    model,
    center,
    scale: targetSize / maxDimension,
    meshMap,
    meshAudit,
  }
}
