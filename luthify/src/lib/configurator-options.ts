import type { ConfigOption } from '@/types'

export const BASE_PRICE = 2800

export const BODY_SHAPES: ConfigOption[] = [
  { id: 'modern-s',   label: 'Modern S',   priceAdj: 0 },
  { id: 'single-cut', label: 'Single Cut', priceAdj: 0 },
  { id: 'offset',     label: 'Offset',     priceAdj: 0 },
  { id: 'semi-hollow',label: 'Semi-Hollow',priceAdj: 400 },
]

export const FINISHES: ConfigOption[] = [
  { id: 'sunburst',  label: 'Sunburst',    hex: '#6B2200', roughness: 0.1,  priceAdj: 0 },
  { id: 'mint',      label: 'Surf Mint',   hex: '#7EC8B4', roughness: 0.12, priceAdj: 0 },
  { id: 'ocean',     label: 'Ocean Blue',  hex: '#2E6EA6', roughness: 0.1,  priceAdj: 0 },
  { id: 'natural',   label: 'Natural Ash', hex: '#D4B896', roughness: 0.22, priceAdj: 0 },
  { id: 'black',     label: 'Onyx Black',  hex: '#1a1a1a', roughness: 0.08, priceAdj: 0 },
  { id: 'red',       label: 'Cherry Red',  hex: '#A51C30', roughness: 0.1,  priceAdj: 0 },
  { id: 'aged',      label: 'Aged Honey',  hex: '#C8954A', roughness: 0.3,  priceAdj: 0 },
  { id: 'forest',    label: 'Forest',      hex: '#2D5A3D', roughness: 0.15, priceAdj: 0 },
]

export const TOPS: ConfigOption[] = [
  { id: 'solid',   label: 'Solid',        sub: 'No carve cap',           texture: undefined,                priceAdj: 0   },
  { id: 'flame',   label: 'Flame Maple',  sub: 'Figured hand-selected',  texture: '/textures/flame.jpg',    priceAdj: 380 },
  { id: 'quilted', label: 'Quilted Maple',sub: 'Figured hand-selected',  texture: '/textures/quilted.jpg',  priceAdj: 520 },
  { id: 'burl',    label: 'Burl Walnut',  sub: 'Figured hand-selected',  texture: '/textures/burl.jpg',     priceAdj: 680 },
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
]

export const BRIDGES: ConfigOption[] = [
  { id: 'tuneomatic', label: 'Tune-o-matic', sub: 'Classic stop bar',  priceAdj: 0   },
  { id: 'bigsby',     label: 'Bigsby B7',    sub: 'Vintage vibrato',   priceAdj: 280 },
  { id: 'hardtail',   label: 'Hardtail',     sub: 'Fixed string-thru', priceAdj: 0   },
  { id: 'trem',       label: 'Floyd Rose',   sub: 'Locking tremolo',   priceAdj: 380 },
]

export const PICKUPS: ConfigOption[] = [
  { id: 'dual-hum', label: 'Dual Humbuckers', priceAdj: 0   },
  { id: 'hss',      label: 'HSS',              priceAdj: 0   },
  { id: 'p90',      label: 'P-90s',            priceAdj: 120 },
  { id: 'singlecoil',label: 'Single Coils',    priceAdj: 0   },
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
}

export function calcPrice(config: Partial<typeof DEFAULT_CONFIG>): number {
  const allOptions = [
    ...BODY_SHAPES, ...FINISHES, ...TOPS, ...NECK_WOODS,
    ...FRETBOARDS, ...HARDWARE_COLORS, ...BRIDGES, ...PICKUPS,
  ]
  const keys = Object.values(config)
  return BASE_PRICE + keys.reduce((sum, id) => {
    const opt = allOptions.find(o => o.id === id)
    return sum + (opt?.priceAdj ?? 0)
  }, 0)
}

export function getPriceBreakdown(config: Partial<typeof DEFAULT_CONFIG>) {
  const lines: { label: string; amount: number }[] = [
    { label: 'Base build', amount: BASE_PRICE },
  ]
  const map: [string, ConfigOption[]][] = [
    ['top',      TOPS],
    ['hardware', HARDWARE_COLORS],
    ['bridge',   BRIDGES],
    ['pickups',  PICKUPS],
    ['neck',     NECK_WOODS],
    ['fretboard',FRETBOARDS],
  ]
  for (const [key, options] of map) {
    const val = config[key as keyof typeof config]
    const opt = options.find(o => o.id === val)
    if (opt && opt.priceAdj > 0) {
      lines.push({ label: opt.label, amount: opt.priceAdj })
    }
  }
  return lines
}
