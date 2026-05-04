import * as THREE from 'three'
import { FINISHES, FRETBOARDS, HARDWARE_COLORS, NECK_WOODS, PICKUPS } from '@/lib/configurator-options'
import type { InstrumentConfig, PartKey } from '@/config/instrumentConfig'
import { normalizeMeshName } from '@/lib/modelLoader'

export interface MaterialSelections {
  finishId: string
  hardwareId: string
  fretboardId: string
  pickupId: string
  neckWoodId?: string
}

export type MeshMaterialProps = Pick<THREE.MeshStandardMaterial, 'color' | 'metalness' | 'roughness' | 'envMapIntensity'>

interface PartMaterialProps {
  color: string
  metalness: number
  roughness: number
  envMapIntensity: number
}

const DEFAULT_PARTS: Record<PartKey, PartMaterialProps> = {
  finish: { color: '#D4B896', metalness: 0.06, roughness: 0.18, envMapIntensity: 1.8 },
  hardware: { color: '#C9CED6', metalness: 0.95, roughness: 0.2, envMapIntensity: 1.9 },
  fretboard: { color: '#1A0A00', metalness: 0, roughness: 0.58, envMapIntensity: 1.35 },
  neckWood: { color: '#C8A05A', metalness: 0.02, roughness: 0.44, envMapIntensity: 1.45 },
  pickguard: { color: '#F2EEE2', metalness: 0.02, roughness: 0.34, envMapIntensity: 1.5 },
  pickup: { color: '#101014', metalness: 0.28, roughness: 0.32, envMapIntensity: 1.6 },
  strings: { color: '#DDE2EA', metalness: 0.9, roughness: 0.18, envMapIntensity: 1.8 },
}

function hardwareColor(id: string) {
  if (id === 'gold' || id === 'aged-brass') return '#C9A45C'
  if (id === 'black') return '#111116'
  return '#C9CED6'
}

function neckColor(id?: string) {
  if (id === 'mahogany') return '#5C2F17'
  if (id === 'roasted') return '#8B4A20'
  if (id === 'walnut') return '#4A2411'
  return '#C8A05A'
}

function pickupColor(id: string) {
  if (id === 'singlecoil' || id === 'hss') return '#F5F0E6'
  return '#101014'
}

export function buildPartMaterials(selections: MaterialSelections): Record<PartKey, PartMaterialProps> {
  const finish = FINISHES.find(option => option.id === selections.finishId)
  const fretboard = FRETBOARDS.find(option => option.id === selections.fretboardId)
  const hardware = HARDWARE_COLORS.find(option => option.id === selections.hardwareId)
  const neck = NECK_WOODS.find(option => option.id === selections.neckWoodId)
  const pickup = PICKUPS.find(option => option.id === selections.pickupId)

  return {
    ...DEFAULT_PARTS,
    finish: {
      color: finish?.hex ?? DEFAULT_PARTS.finish.color,
      metalness: finish?.finishStyle === 'burst' ? 0.12 : 0.06,
      roughness: Math.min(finish?.roughness ?? DEFAULT_PARTS.finish.roughness, 0.28),
      envMapIntensity: 1.9,
    },
    hardware: {
      ...DEFAULT_PARTS.hardware,
      color: hardwareColor(hardware?.id ?? selections.hardwareId),
    },
    fretboard: {
      ...DEFAULT_PARTS.fretboard,
      color: fretboard?.hex ?? DEFAULT_PARTS.fretboard.color,
    },
    neckWood: {
      ...DEFAULT_PARTS.neckWood,
      color: neckColor(neck?.id ?? selections.neckWoodId),
    },
    pickup: {
      ...DEFAULT_PARTS.pickup,
      color: pickupColor(pickup?.id ?? selections.pickupId),
      metalness: pickup?.id === 'active-hum' ? 0.42 : DEFAULT_PARTS.pickup.metalness,
    },
  }
}

function applyProps(material: THREE.Material, props: PartMaterialProps) {
  const standard = material as THREE.MeshStandardMaterial
  if (!standard.isMeshStandardMaterial) return
  standard.color = new THREE.Color(props.color)
  standard.metalness = props.metalness
  standard.roughness = props.roughness
  standard.envMapIntensity = props.envMapIntensity
  standard.needsUpdate = true
}

export function applyMaterialsByPartMap(
  meshMap: Map<string, THREE.Mesh>,
  instrumentConfig: InstrumentConfig,
  selections: MaterialSelections
) {
  const partMaterials = buildPartMaterials(selections)

  Object.entries(instrumentConfig.partMap).forEach(([meshName, partKey]) => {
    const mesh = meshMap.get(normalizeMeshName(meshName))
    if (!mesh) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach(material => applyProps(material, partMaterials[partKey]))
  })
}
