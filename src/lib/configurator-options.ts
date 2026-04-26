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
  { id: 'mint',      label: 'Surf Mint',       hex: '#7EC8B4', roughness: 0.12, priceAdj: 0, finishGroup: 'solid' },
  { id: 'ocean',     label: 'Ocean Blue',      hex: '#2E6EA6', roughness: 0.1,  priceAdj: 0, finishGroup: 'solid' },
  { id: 'olympic',   label: 'Olympic White',   hex: '#F2EEE2', roughness: 0.13, priceAdj: 0, finishGroup: 'solid' },
  { id: 'black',     label: 'Black',           hex: '#1a1a1a', roughness: 0.08, priceAdj: 0, finishGroup: 'solid' },
  { id: 'candy-red', label: 'Candy Apple Red', hex: '#A71921', roughness: 0.09, priceAdj: 0, finishGroup: 'solid' },
  { id: '2-tone-sunburst', label: '2-Tone Sunburst', hex: '#5B2508', roughness: 0.1, priceAdj: 0, finishGroup: 'burst', burstStops: ['#E3A13A', '#A64A14', '#120805'] },
  { id: '3-tone-sunburst', label: '3-Tone Sunburst', hex: '#7C2411', roughness: 0.1, priceAdj: 0, finishGroup: 'burst', burstStops: ['#F0B84F', '#B85419', '#17100A'] },
  { id: 'tobacco-burst', label: 'Tobacco Burst', hex: '#4D230D', roughness: 0.12, priceAdj: 0, finishGroup: 'burst', burstStops: ['#C9913A', '#714018', '#130A05'] },
  { id: 'cherry-burst', label: 'Cherry Burst', hex: '#8E1B1C', roughness: 0.1, priceAdj: 0, finishGroup: 'burst', burstStops: ['#F4B45B', '#B72D2D', '#2A0708'] },
  { id: 'honey-burst', label: 'Honey Burst', hex: '#B86E17', roughness: 0.11, priceAdj: 0, finishGroup: 'burst', burstStops: ['#F4C45B', '#CB7A1C', '#5A2507'] },
  { id: 'natural',   label: 'Natural Ash', hex: '#D4B896', roughness: 0.22, priceAdj: 0, finishGroup: 'natural' },
  { id: 'aged',      label: 'Aged Honey',  hex: '#C8954A', roughness: 0.3,  priceAdj: 0, finishGroup: 'natural' },
]

export const S_STYLE_FINISHES = FINISHES.filter(f => f.finishGroup === 'solid' || f.finishGroup === 'burst')

export const FINISH_GROUPS = [
  { id: 'solid',  label: 'Solid Colours' },
  { id: 'burst',  label: 'Burst Finishes' },
  { id: 'natural', label: 'Natural / Wood Finishes' },
] as const

export const S_STYLE_FINISH_GROUPS = FINISH_GROUPS.filter(group => group.id !== 'natural')

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

export const PICKGUARDS: ConfigOption[] = [
  { id: 'parchment', label: 'Parchment', hex: '#F2EEE2', priceAdj: 0 },
  { id: 'mint',      label: 'Mint',      hex: '#DDE8D8', priceAdj: 0 },
  { id: 'black',     label: 'Black',     hex: '#111116', priceAdj: 0 },
  { id: 'tortoise',  label: 'Tortoise',  hex: '#6B2A18', priceAdj: 70 },
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
  finish:    'mint',
  top:       'quilted',
  neck:      'maple',
  fretboard: 'rosewood',
  pickguard: 'parchment',
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
  ['pickguard', 'Pickguard', PICKGUARDS],
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
