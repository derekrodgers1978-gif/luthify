export type InstrumentPart =
  | 'BODY'
  | 'PICKGUARD'
  | 'NECK'
  | 'FRETBOARD'
  | 'FRETS'
  | 'BRIDGE'
  | 'TUNERS'
  | 'KNOBS'
  | 'SWITCH'
  | 'PICKUPS'
  | 'STRINGS'

type ShapePartMap = Partial<Record<InstrumentPart, string[]>>
type InstrumentPartMap = Record<string, ShapePartMap>

export const instrumentConfig = {
  partMap: {
    'modern-s': {
      BODY: ['Object_3'],
      PICKGUARD: ['Object_14'],
      NECK: ['Object_31'],
      FRETBOARD: ['Object_32'],
      FRETS: ['Object_25'],
      BRIDGE: [
        'Object_4',
        'Object_5',
        'Object_6',
        'Object_7',
        'Object_10',
        'Object_11',
        'Object_12',
        'Object_13',
        'Object_15',
        'Object_16',
        'Object_18',
        'Object_24',
        'Object_26',
      ],
      TUNERS: ['Object_19', 'Object_20', 'Object_21', 'Object_22', 'Object_23'],
      KNOBS: ['Object_30'],
      SWITCH: ['Object_9'],
      PICKUPS: ['Object_8', 'Object_17'],
      STRINGS: ['Object_27', 'Object_28', 'Object_29'],
    },
  } satisfies InstrumentPartMap as InstrumentPartMap,
}

export function getInstrumentPart(shapeId: string, meshName: string): InstrumentPart | undefined {
  const partMap = instrumentConfig.partMap[shapeId]
  if (!partMap) return undefined

  for (const [part, meshNames] of Object.entries(partMap) as [InstrumentPart, string[]][]) {
    if (meshNames.includes(meshName)) return part
  }

  return undefined
}
