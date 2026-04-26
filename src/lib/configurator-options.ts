import type { ConfigOption } from '@/types'

export const BASE_PRICE = 2800

export const BODY_SHAPES: ConfigOption[] = [
  { id: 'modern-s',   label: 'S-Style Electric',      modelPath: '/models/s-style-electric.glb',      priceAdj: 0 },
  { id: 'single-cut', label: 'Single Cut Electric',   modelPath: '/models/single-cut-electric.glb',   priceAdj: 0 },
  { id: 'double-cut', label: 'Double Cut Electric',   modelPath: '/models/double-cut-electric.glb',   priceAdj: 180 },
  { id: 'semi-hollow',label: 'Semi-Hollow Electric',  modelPath: '/models/semi-hollow-electric.glb',  priceAdj: 400 },
  { id: 'offset',     label: 'Offset Electric',       modelPath: '/models/offset-electric.glb',       priceAdj: 0 },
  { id: 't-style',    label: 'V-Style Electric',      modelPath: '/models/v-style-electric.glb',      priceAdj: 0 },
  { id: 'jazz-hollow',label: 'Dreadnought Acoustic',  modelPath: '/models/dreadnought-acoustic.glb',  priceAdj: 520 },
  { id: 'baritone',   label: 'Electric Bass',         modelPath: '/models/electric-bass.glb',         priceAdj: 260 },
  { id: 'banjo',      label: 'Banjo',                 modelPath: '/models/banjo.glb',                 priceAdj: 120 },
  { id: 'cello',      label: 'Cello',                 modelPath: '/models/cello.glb',                 priceAdj: 680 },
  { id: 'resonator',  label: 'Resonator',             modelPath: '/models/resonator.glb',             priceAdj: 320 },
  { id: 'classical',  label: 'Classical Guitar',      modelPath: '/models/classical-guitar.glb',      priceAdj: 160 },
]

export const FINISHES: ConfigOption[] = [
  { id: 'candy-apple-red', label: 'Candy Apple Red', hex: '#B51F2E', roughness: 0.1,  priceAdj: 0, finishGroup: 'solid' },
  { id: 'ocean-blue',      label: 'Ocean Blue',      hex: '#2E6EA6', roughness: 0.1,  priceAdj: 0, finishGroup: 'solid' },
  { id: 'olympic-white',   label: 'Olympic White',   hex: '#F1ECE0', roughness: 0.16, priceAdj: 0, finishGroup: 'solid' },
  { id: 'onyx-black',      label: 'Onyx Black',      hex: '#1a1a1a', roughness: 0.08, priceAdj: 0, finishGroup: 'solid' },
  { id: 'surf-mint',       label: 'Surf Mint',       hex: '#7EC8B4', roughness: 0.12, priceAdj: 0, finishGroup: 'solid' },
  { id: '2-tone-burst',    label: '2-Tone Burst',    hex: '#5A2609', roughness: 0.12, priceAdj: 0, finishGroup: 'burst' },
  { id: '3-tone-burst',    label: '3-Tone Burst',    hex: '#6B2200', roughness: 0.12, priceAdj: 0, finishGroup: 'burst' },
  { id: 'tobacco-burst',   label: 'Tobacco Burst',   hex: '#4A1B08', roughness: 0.14, priceAdj: 0, finishGroup: 'burst' },
  { id: 'cherry-burst',    label: 'Cherry Burst',    hex: '#8B1A1A', roughness: 0.12, priceAdj: 0, finishGroup: 'burst' },
  { id: 'honey-burst',     label: 'Honey Burst',     hex: '#B87423', roughness: 0.14, priceAdj: 0, finishGroup: 'burst' },
]

export const FINISH_GROUPS = [
  { id: 'solid',  label: 'Solid Colours' },
  { id: 'burst',  label: 'Burst Finishes' },
] as const

export function isBurstFinish(id?: string) {
  return FINISHES.find(f => f.id === id)?.finishGroup === 'burst'
}

export function isNaturalFinish(id?: string) {
  return FINISHES.find(f => f.id === id)?.finishGroup === 'natural'
}

export const TOPS: ConfigOption[] = [
  { id: 'solid',   label: 'Solid',        sub: 'No carve cap',           texture: undefined,                priceAdj: 0   },
  { id: 'flame',   label: 'Flame Maple',  sub: 'Figured hand-selected',  texture: '/textures/flame.jpg',    priceAdj: 380 },
  { id: 'quilted', label: 'Quilted Maple',sub: 'Figured hand-selected',  texture: '/textures/quilted.jpg',  priceAdj: 520 },
  { id: 'burl',    label: 'Burl Walnut',  sub: 'Figured hand-selected',  texture: '/textures/burl.jpg',     priceAdj: 680 },
  { id: 'spalted', label: 'Spalted Maple',sub: 'High-contrast grain',    texture: '/textures/spalted.jpg',  priceAdj: 740 },
]

export const NECK_WOODS: ConfigOption[] = [
  { id: 'maple',    label: 'Hard Maple',    priceAdj: 0   },
  { id: 'mahogany', label: 'Mahogany',       priceAdj: 0   },
  { id: 'roasted',  label: 'Roasted Maple',  priceAdj: 120 },
  { id: 'walnut',   label: 'Walnut',         priceAdj: 150 },
]

export const FRETBOARDS: ConfigOption[] = [
  { id: 'rosewood', label: 'Indian Rosewood', hex: '#1A0A00', priceAdj: 0  },
  { id: 'ebony',    label: 'Ebony',           hex: '#0a0a0a', priceAdj: 80 },
  { id: 'maple',    label: 'Maple',           hex: '#C8A05A', priceAdj: 0  },
  { id: 'pau',      label: 'Pau Ferro',       hex: '#3A1800', priceAdj: 40 },
]

export const HARDWARE_COLORS: ConfigOption[] = [
  { id: 'nickel', label: 'Nickel', priceAdj: 0   },
  { id: 'gold',   label: 'Gold',   priceAdj: 120 },
  { id: 'chrome', label: 'Chrome', priceAdj: 0   },
  { id: 'black',  label: 'Black',  priceAdj: 80  },
  { id: 'aged-brass', label: 'Aged Brass', priceAdj: 160 },
]

export const BRIDGES: ConfigOption[] = [
  { id: 'tuneomatic', label: 'Fixed Stop Tail', sub: 'Classic stop bar',  priceAdj: 0   },
  { id: 'bigsby',     label: 'Vintage Vibrato', sub: 'Expressive vibrato', priceAdj: 280 },
  { id: 'hardtail',   label: 'Hardtail',     sub: 'Fixed string-thru', priceAdj: 0   },
  { id: 'trem',       label: 'Locking Tremolo', sub: 'High-stability tremolo', priceAdj: 380 },
]

export const PICKUPS: ConfigOption[] = [
  { id: 'dual-hum', label: 'Dual Humbuckers', priceAdj: 0   },
  { id: 'hss',      label: 'HSS',              priceAdj: 0   },
  { id: 'p90',      label: 'P-90s',            priceAdj: 120 },
  { id: 'singlecoil',label: 'Single Coils',    priceAdj: 0   },
  { id: 'active-hum', label: 'Active Humbuckers', priceAdj: 220 },
]

export const DEFAULT_CONFIG = {
  shape:     'modern-s',
  finish:    'surf-mint',
  top:       'quilted',
  neck:      'maple',
  fretboard: 'rosewood',
  hardware:  'nickel',
  bridge:    'tuneomatic',
  pickups:   'dual-hum',
}

export type ConfigKey = keyof typeof DEFAULT_CONFIG

export const CONFIG_OPTION_GROUPS: [ConfigKey, string, ConfigOption[]][] = [
  ['shape',     'Body Shape', BODY_SHAPES],
  ['finish',    'Body Finish', FINISHES],
  ['top',       'Top', TOPS],
  ['neck',      'Neck Wood', NECK_WOODS],
  ['fretboard', 'Fretboard', FRETBOARDS],
  ['hardware',  'Hardware', HARDWARE_COLORS],
  ['bridge',    'Bridge', BRIDGES],
  ['pickups',   'Pickups', PICKUPS],
]

export function getOptionLabel(key: ConfigKey, id: string): string {
  const group = CONFIG_OPTION_GROUPS.find(([groupKey]) => groupKey === key)
  return group?.[2].find(o => o.id === id)?.label ?? id
}

export function calcPrice(config: Partial<typeof DEFAULT_CONFIG>): number {
  return BASE_PRICE + CONFIG_OPTION_GROUPS.reduce((sum, [key, , options]) => {
    const id = config[key]
    const opt = options.find(o => o.id === id)
    return sum + (opt?.priceAdj ?? 0)
  }, 0)
}

export function getPriceBreakdown(config: Partial<typeof DEFAULT_CONFIG>) {
  const lines: { label: string; amount: number }[] = [
    { label: 'Base build', amount: BASE_PRICE },
  ]
  for (const [key, , options] of CONFIG_OPTION_GROUPS) {
    const val = config[key]
    const opt = options.find(o => o.id === val)
    if (opt && opt.priceAdj > 0) {
      lines.push({ label: opt.label, amount: opt.priceAdj })
    }
  }
  return lines
}
