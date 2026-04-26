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
  { id: 'burst-2tone',   label: '2-Tone Sunburst', hex: '#B75A0D', centerHex: '#F5A12E', edgeHex: '#150703', kind: 'burst', roughness: 0.1, priceAdj: 0 },
  { id: 'burst-3tone',   label: '3-Tone Sunburst', hex: '#A83D15', centerHex: '#F6B84A', midHex: '#B33116', edgeHex: '#120503', kind: 'burst', roughness: 0.1, priceAdj: 0 },
  { id: 'burst-tobacco', label: 'Tobacco Burst',   hex: '#7D3D14', centerHex: '#C98A38', midHex: '#70401F', edgeHex: '#100705', kind: 'burst', roughness: 0.12, priceAdj: 0 },
  { id: 'burst-cherry',  label: 'Cherry Burst',    hex: '#B51E28', centerHex: '#F1A349', midHex: '#C8212B', edgeHex: '#260405', kind: 'burst', roughness: 0.1, priceAdj: 0 },
  { id: 'burst-honey',   label: 'Honey Burst',     hex: '#D58722', centerHex: '#F4C265', midHex: '#CF7C1F', edgeHex: '#5C2A08', kind: 'burst', roughness: 0.1, priceAdj: 0 },
  { id: 'burst-black',   label: 'Black Burst',     hex: '#26211C', centerHex: '#A7773C', midHex: '#37251A', edgeHex: '#020203', kind: 'burst', roughness: 0.09, priceAdj: 0 },
  { id: 'burst-blue',    label: 'Blue Burst',      hex: '#115D8F', centerHex: '#50A8D0', midHex: '#135D92', edgeHex: '#020B15', kind: 'burst', roughness: 0.1, priceAdj: 0 },
  { id: 'burst-green',   label: 'Green Burst',     hex: '#1F6D45', centerHex: '#82B66C', midHex: '#23724A', edgeHex: '#031009', kind: 'burst', roughness: 0.1, priceAdj: 0 },
  { id: 'mint',          label: 'Surf Mint',       hex: '#7EC8B4', kind: 'solid', roughness: 0.12, priceAdj: 0 },
  { id: 'ocean',         label: 'Ocean Blue',      hex: '#0D78A8', kind: 'solid', roughness: 0.1, priceAdj: 0 },
  { id: 'olympic-white', label: 'Olympic White',   hex: '#EFE9D7', kind: 'solid', roughness: 0.14, priceAdj: 0 },
  { id: 'black',         label: 'Onyx Black',      hex: '#111114', kind: 'solid', roughness: 0.08, priceAdj: 0 },
  { id: 'candy-red',     label: 'Candy Apple Red', hex: '#A80F1D', kind: 'solid', roughness: 0.08, priceAdj: 0 },
  { id: 'natural',       label: 'Natural Ash',     hex: '#D4B896', kind: 'solid', roughness: 0.22, priceAdj: 0 },
]

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
  { id: 'vintage-tremolo', label: 'Vintage Tremolo', sub: 'Six-screw tremolo', priceAdj: 0 },
  { id: 'locking-tremolo', label: 'Locking Tremolo', sub: 'Fine-tuner tremolo', priceAdj: 380 },
  { id: 'hardtail',        label: 'Hardtail',         sub: 'Fixed string-thru', priceAdj: 0 },
]

export const PICKUPS: ConfigOption[] = [
  { id: 'sss', label: 'SSS', priceAdj: 0 },
  { id: 'hss', label: 'HSS', priceAdj: 0 },
  { id: 'hh',  label: 'HH',  priceAdj: 0 },
  { id: 'p90', label: 'P90', priceAdj: 120 },
]

export const PICKGUARDS: ConfigOption[] = [
  { id: 'parchment', label: 'Parchment', hex: '#EEE8D6', priceAdj: 0 },
  { id: 'mint',      label: 'Mint Green', hex: '#C9D8C4', priceAdj: 0 },
  { id: 'black',     label: 'Black',      hex: '#111114', priceAdj: 0 },
  { id: 'tortoise',  label: 'Tortoise',   hex: '#5C2519', priceAdj: 80 },
]

export const KNOBS: ConfigOption[] = [
  { id: 'aged-white', label: 'Aged White', hex: '#E8DEBF', priceAdj: 0 },
  { id: 'white',      label: 'White',      hex: '#F6F2E8', priceAdj: 0 },
  { id: 'black',      label: 'Black',      hex: '#111114', priceAdj: 0 },
]

export const SWITCH_TIPS: ConfigOption[] = [
  { id: 'aged-white', label: 'Aged White', hex: '#E8DEBF', priceAdj: 0 },
  { id: 'white',      label: 'White',      hex: '#F6F2E8', priceAdj: 0 },
  { id: 'black',      label: 'Black',      hex: '#111114', priceAdj: 0 },
]

export const TUNERS: ConfigOption[] = [
  { id: 'vintage', label: 'Vintage Kluson', priceAdj: 0 },
  { id: 'locking', label: 'Locking Tuners', priceAdj: 120 },
  { id: 'staggered', label: 'Staggered Locking', priceAdj: 160 },
]

export const STRINGS: ConfigOption[] = [
  { id: 'nickel-10', label: 'Nickel 10-46', priceAdj: 0 },
  { id: 'nickel-09', label: 'Nickel 9-42', priceAdj: 0 },
  { id: 'stainless-10', label: 'Stainless 10-46', priceAdj: 30 },
]

export const DEFAULT_CONFIG = {
  shape:     'modern-s',
  finish:    'burst-3tone',
  top:       'quilted',
  neck:      'maple',
  fretboard: 'rosewood',
  hardware:  'nickel',
  bridge:    'vintage-tremolo',
  pickups:   'sss',
  pickguard: 'parchment',
  knobs:     'aged-white',
  switchTip: 'aged-white',
  tuners:    'vintage',
  strings:   'nickel-10',
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
  ['knobs',     'Knobs', KNOBS],
  ['switchTip', 'Switch Tip', SWITCH_TIPS],
  ['tuners',    'Tuners', TUNERS],
  ['strings',   'Strings', STRINGS],
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
