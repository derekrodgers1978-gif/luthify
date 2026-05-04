import { BODY_SHAPES, FINISHES, FRETBOARDS, HARDWARE_COLORS, NECK_WOODS, PICKUPS } from '@/lib/configurator-options'

export const EXPECTED_INSTRUMENT_PARTS = [
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

export type InstrumentPart = (typeof EXPECTED_INSTRUMENT_PARTS)[number]

export interface InstrumentDefinition {
  id: string
  label: string
  modelPath: string
  expectedParts: readonly InstrumentPart[]
  camera: {
    position: [number, number, number]
    fov: number
    target: [number, number, number]
  }
  targetSize: number
}

export const INSTRUMENTS: Record<string, InstrumentDefinition> = Object.fromEntries(
  BODY_SHAPES.map(shape => [
    shape.id,
    {
      id: shape.id,
      label: shape.label,
      modelPath: shape.modelPath ?? `/models/${shape.id}.glb`,
      expectedParts: EXPECTED_INSTRUMENT_PARTS,
      camera: {
        position: [0.25, 0.18, 5.2],
        fov: 34,
        target: [0, 0.08, 0],
      },
      targetSize: shape.id === 'cello' ? 4.8 : shape.id === 'baritone' ? 4.6 : 4.25,
    },
  ])
)

export function getInstrumentDefinition(id: string) {
  return INSTRUMENTS[id] ?? INSTRUMENTS['modern-s']
}

export function getFinishOption(id: string) {
  return FINISHES.find(option => option.id === id) ?? FINISHES[0]
}

export function getNeckOption(id: string) {
  return NECK_WOODS.find(option => option.id === id) ?? NECK_WOODS[0]
}

export function getFretboardOption(id: string) {
  return FRETBOARDS.find(option => option.id === id) ?? FRETBOARDS[0]
}

export function getHardwareOption(id: string) {
  return HARDWARE_COLORS.find(option => option.id === id) ?? HARDWARE_COLORS[0]
}

export function getPickupOption(id: string) {
  return PICKUPS.find(option => option.id === id) ?? PICKUPS[0]
}
