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
  { id: 'mint',             label: 'Surf Mint',       hex: '#7EC8B4', roughness: 0.12, priceAdj: 0, finishGroup: 'solid' },
  { id: 'ocean',            label: 'Ocean Blue',      hex: '#2E6EA6', roughness: 0.1,  priceAdj: 0, finishGroup: 'solid' },
  { id: 'olympic-white',    label: 'Olympic White',   hex: '#F2EFE3', roughness: 0.11, priceAdj: 0, finishGroup: 'solid' },
  { id: 'black',            label: 'Black',           hex: '#111111', roughness: 0.08, priceAdj: 0, finishGroup: 'solid' },
  { id: 'candy-apple-red',  label: 'Candy Apple Red', hex: '#B5121B', roughness: 0.09, priceAdj: 0, finishGroup: 'solid' },
  { id: 'sunburst',         label: 'Sunburst',        hex: '#8A360D', roughness: 0.1,  priceAdj: 0, finishGroup: 'burst', burstColors: ['#F3B23C', '#A84613', '#160704'] },
  { id: 'two-tone-burst',   label: '2-Tone Burst',    hex: '#6B2A0A', roughness: 0.1,  priceAdj: 0, finishGroup: 'burst', burstColors: ['#E6A43C', '#E6A43C', '#120604'] },
  { id: 'tobacco-burst',    label: 'Tobacco Burst',   hex: '#5F2C10', roughness: 0.12, priceAdj: 0, finishGroup: 'burst', burstColors: ['#C98B3D', '#5A2A12', '#0B0503'] },
  { id: 'cherry-burst',     label: 'Cherry Burst',    hex: '#A51C30', roughness: 0.1,  priceAdj: 0, finishGroup: 'burst', burstColors: ['#F0B34D', '#C02A2A', '#300006'] },
  { id: 'natural',          label: 'Natural Ash',     hex: '#D4B896', roughness: 0.22, priceAdj: 0, finishGroup: 'natural' },
]

export const FINISH_GROUPS = [
  { id: 'solid',  label: 'Solid Colours' },
  { id: 'burst',  label: 'Burst Finishes' },
  { id: 'natural', label: 'Natural / Wood Finishes' },
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

export const PICKGUARDS: ConfigOption[] = [
  { id: 'parchment', label: 'Parchment', hex: '#E7E0CC', priceAdj: 0 },
  { id: 'white',     label: 'White',     hex: '#F5F2E8', priceAdj: 0 },
  { id: 'black',     label: 'Black',     hex: '#111114', priceAdj: 0 },
  { id: 'mint',      label: 'Mint',      hex: '#C9D8C8', priceAdj: 30 },
  { id: 'tortoise',  label: 'Tortoise',  hex: '#5B2618', priceAdj: 70 },
]

export const TUNERS: ConfigOption[] = [
  { id: 'nickel',  label: 'Nickel',  hex: '#C9CED6', priceAdj: 0 },
  { id: 'chrome',  label: 'Chrome',  hex: '#DDE2EA', priceAdj: 0 },
  { id: 'gold',    label: 'Gold',    hex: '#C9A45C', priceAdj: 90 },
  { id: 'black',   label: 'Black',   hex: '#111116', priceAdj: 70 },
]

export const KNOBS: ConfigOption[] = [
  { id: 'aged-white', label: 'Aged White', hex: '#E9DEC4', priceAdj: 0 },
  { id: 'white',      label: 'White',      hex: '#F5F2E8', priceAdj: 0 },
  { id: 'black',      label: 'Black',      hex: '#111114', priceAdj: 0 },
  { id: 'parchment',  label: 'Parchment',  hex: '#D8C9A9', priceAdj: 20 },
]

export const SWITCH_TIPS: ConfigOption[] = [
  { id: 'aged-white', label: 'Aged White', hex: '#E9DEC4', priceAdj: 0 },
  { id: 'white',      label: 'White',      hex: '#F5F2E8', priceAdj: 0 },
  { id: 'black',      label: 'Black',      hex: '#111114', priceAdj: 0 },
  { id: 'cream',      label: 'Cream',      hex: '#F0E1B9', priceAdj: 20 },
]

export const BRIDGES: ConfigOption[] = [
  { id: 'tuneomatic', label: 'Fixed Stop Tail', sub: 'Classic stop bar',  priceAdj: 0   },
  { id: 'bigsby',     label: 'Vintage Vibrato', sub: 'Expressive vibrato', priceAdj: 280 },
  { id: 'hardtail',   label: 'Hardtail',     sub: 'Fixed string-thru', priceAdj: 0   },
  { id: 'trem',       label: 'Locking Tremolo', sub: 'High-stability tremolo', priceAdj: 380 },
]

export const PICKUP_COVERS: ConfigOption[] = [
  { id: 'aged-white', label: 'Aged White', hex: '#E9DEC4', priceAdj: 0 },
  { id: 'white',      label: 'White',      hex: '#F5F2E8', priceAdj: 0 },
  { id: 'black',      label: 'Black',      hex: '#111114', priceAdj: 0 },
  { id: 'cream',      label: 'Cream',      hex: '#F0E1B9', priceAdj: 20 },
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
  finish:    'natural',
  top:       'quilted',
  neck:      'maple',
  fretboard: 'rosewood',
  hardware:  'nickel',
  bridge:    'tuneomatic',
  pickups:   'dual-hum',
  pickguard: 'parchment',
  tuners:    'nickel',
  knobs:     'aged-white',
  switchTip: 'aged-white',
  pickupCovers: 'aged-white',
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
  ['pickguard', 'Pickguard', PICKGUARDS],
  ['tuners',    'Tuners', TUNERS],
  ['knobs',     'Knobs', KNOBS],
  ['switchTip', 'Switch Tip', SWITCH_TIPS],
  ['pickupCovers', 'Pickup Covers', PICKUP_COVERS],
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
