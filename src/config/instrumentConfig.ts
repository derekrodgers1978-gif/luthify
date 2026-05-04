export type PartKey = 'finish' | 'hardware' | 'fretboard' | 'neckWood' | 'pickguard' | 'pickup' | 'strings'

export interface InstrumentCameraConfig {
  front: [number, number, number]
  side: [number, number, number]
  top: [number, number, number]
  reset: [number, number, number]
  target: [number, number, number]
  fov: number
  targetSize: number
  groundY: number
}

export interface InstrumentConfig {
  id: string
  label: string
  modelPath: string
  basePrice: number
  camera: InstrumentCameraConfig
  expectedMeshes: string[]
  partMap: Record<string, PartKey>
}

const DEFAULT_CAMERA: InstrumentCameraConfig = {
  front: [0, 0.22, 6.2],
  side: [6.2, 0.22, 0],
  top: [0, 6.8, 0.01],
  reset: [0.35, 0.25, 5.35],
  target: [0, 0, 0],
  fov: 37,
  targetSize: 4.25,
  groundY: -2.15,
}

const S_STYLE_EXPECTED_MESHES = [
  'Object_3',
  'Object_4',
  'Object_5',
  'Object_6',
  'Object_7',
  'Object_8',
  'Object_9',
  'Object_10',
  'Object_11',
  'Object_12',
  'Object_13',
  'Object_14',
  'Object_15',
  'Object_16',
  'Object_17',
  'Object_18',
  'Object_19',
  'Object_20',
  'Object_21',
  'Object_22',
  'Object_23',
  'Object_24',
  'Object_25',
  'Object_26',
  'Object_27',
  'Object_28',
  'Object_29',
  'Object_30',
  'Object_31',
  'Object_32',
]

const S_STYLE_PART_MAP: Record<string, PartKey> = {
  Object_3: 'finish',
  Object_4: 'hardware',
  Object_5: 'hardware',
  Object_6: 'hardware',
  Object_7: 'hardware',
  Object_8: 'hardware',
  Object_9: 'hardware',
  Object_10: 'hardware',
  Object_11: 'hardware',
  Object_12: 'hardware',
  Object_13: 'hardware',
  Object_14: 'hardware',
  Object_15: 'hardware',
  Object_16: 'hardware',
  Object_17: 'hardware',
  Object_18: 'hardware',
  Object_19: 'hardware',
  Object_20: 'hardware',
  Object_21: 'hardware',
  Object_22: 'hardware',
  Object_23: 'hardware',
  Object_24: 'hardware',
  Object_25: 'pickup',
  Object_26: 'pickup',
  Object_27: 'strings',
  Object_28: 'strings',
  Object_29: 'strings',
  Object_30: 'neckWood',
  Object_31: 'neckWood',
  Object_32: 'fretboard',
}

function makeInstrument(
  id: string,
  label: string,
  modelPath: string,
  basePrice: number,
  camera: Partial<InstrumentCameraConfig> = {},
  expectedMeshes = S_STYLE_EXPECTED_MESHES,
  partMap = S_STYLE_PART_MAP
): InstrumentConfig {
  return {
    id,
    label,
    modelPath,
    basePrice,
    camera: { ...DEFAULT_CAMERA, ...camera },
    expectedMeshes,
    partMap,
  }
}

export const INSTRUMENT_CONFIGS: Record<string, InstrumentConfig> = {
  'modern-s': makeInstrument('modern-s', 'S-Style Electric', '/models/s-style-electric.glb', 2800),
  'single-cut': makeInstrument('single-cut', 'Single Cut Electric', '/models/single-cut-electric.glb', 2800),
  'double-cut': makeInstrument('double-cut', 'Double Cut Electric', '/models/double-cut-electric.glb', 2980),
  'semi-hollow': makeInstrument('semi-hollow', 'Semi-Hollow Electric', '/models/semi-hollow-electric.glb', 3200, {
    reset: [0.5, 0.32, 6.6],
    targetSize: 4.25,
  }),
  offset: makeInstrument('offset', 'Offset Electric', '/models/offset-electric.glb', 2800),
  't-style': makeInstrument('t-style', 'V-Style Electric', '/models/v-style-electric.glb', 2800),
  'jazz-hollow': makeInstrument('jazz-hollow', 'Dreadnought Acoustic', '/models/dreadnought-acoustic.glb', 3320, {
    reset: [0.45, 0.35, 6.9],
  }),
  baritone: makeInstrument('baritone', 'Electric Bass', '/models/electric-bass.glb', 3060, {
    reset: [0.42, 0.34, 7.4],
    front: [0, 0.26, 7.4],
    side: [7.4, 0.26, 0],
    top: [0, 7.8, 0.01],
    targetSize: 4.6,
    groundY: -2.35,
  }),
  banjo: makeInstrument('banjo', 'Banjo', '/models/banjo.glb', 2920, {
    reset: [0.42, 0.34, 7],
    targetSize: 4.4,
  }),
  cello: makeInstrument('cello', 'Cello', '/models/cello.glb', 3480, {
    reset: [0.5, 0.4, 8.2],
    front: [0, 0.34, 8.2],
    side: [8.2, 0.34, 0],
    top: [0, 8.7, 0.01],
    targetSize: 4.8,
    groundY: -2.45,
  }),
  resonator: makeInstrument('resonator', 'Resonator', '/models/resonator.glb', 3120, {
    reset: [0.45, 0.34, 7],
  }),
  classical: makeInstrument('classical', 'Classical Guitar', '/models/classical-guitar.glb', 2960, {
    reset: [0.45, 0.34, 6.9],
  }),
}

export const DEFAULT_INSTRUMENT_KEY = 'modern-s'

export function getInstrumentConfig(id: string): InstrumentConfig {
  return INSTRUMENT_CONFIGS[id] ?? INSTRUMENT_CONFIGS[DEFAULT_INSTRUMENT_KEY]
}
