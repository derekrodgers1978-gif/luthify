// ── Color tokens ──────────────────────────────────────────────────────────────
export const colors = {
  bg:      '#09090B',
  bg2:     '#111114',
  bg3:     '#18181C',
  bg4:     '#1e1e23',
  border:  'rgba(255,255,255,0.07)',
  borderGold: 'rgba(201,164,92,0.2)',
  text:    '#F5F1E8',
  muted:   'rgba(245,241,232,0.55)',
  muted2:  'rgba(245,241,232,0.35)',
  gold:    '#C9A45C',
  gold2:   '#E2C07A',
  success: '#5fb87a',
} as const

// ── Configurator option types ─────────────────────────────────────────────────
export interface ConfigOption {
  id:       string
  label:    string
  sub?:     string
  priceAdj: number
  hex?:     string
  roughness?: number
  finishStyle?: 'solid' | 'burst'
  burstEdgeHex?: string
  texture?: string
  modelPath?: string
}

export interface ConfigState {
  shape:     string
  finish:    string
  finishId:  string
  top:       string
  neck:      string
  fretboard: string
  fretboardId: string
  hardware:  string
  hardwareId: string
  bridge:    string
  pickups:   string
  pickupId:  string
  livePrice: number
}

// ── Quote request ─────────────────────────────────────────────────────────────
export interface QuoteRequest {
  name:       string
  email:      string
  budget:     string
  notes?:     string
  config:     ConfigState
  builderIds?: string[]   // empty = broadcast to all
}

// ── Builder profile ───────────────────────────────────────────────────────────
export interface Builder {
  id:          string
  slug:        string
  shopName:    string
  location:    string
  country?:    string
  speciality:  string
  bio:         string
  yearsExperience?: number
  gallery?: string[]
  reviewQuote?: string
  rating:      number
  reviewCount: number
  avgBuildWeeks: number
  verified:    boolean
  featured:    boolean
  avatar:      string    // initials fallback
  listingCount: number
}
