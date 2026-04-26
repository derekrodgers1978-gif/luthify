import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_CONFIG, calcPrice, getPriceBreakdown, BASE_PRICE
} from '@/lib/configurator-options'
import type { ConfigState } from '@/types'

export interface SavedBuild {
  id:        string
  name:      string
  config:    typeof DEFAULT_CONFIG
  price:     number
  createdAt: string
}

export interface QuoteSubmission {
  id: string
  name: string
  email: string
  budget: string
  notes?: string
  mode: 'broadcast' | 'specific'
  builderIds: string[]
  config: ConfigState
  price: number
  createdAt: string
}

interface ConfigStore {
  // Current config
  shape:     string
  finish:    string
  top:       string
  neck:      string
  fretboard: string
  hardware:  string
  bridge:    string
  pickups:   string
  pickguard: string
  knobs:     string
  switchTip: string
  tuners:    string
  strings:   string
  livePrice: number

  // Saved builds
  savedBuilds: SavedBuild[]
  accountBuilds: SavedBuild[]
  quoteSubmissions: QuoteSubmission[]

  // Actions
  setOption:   (key: keyof typeof DEFAULT_CONFIG, value: string) => void
  saveBuild:   (name: string) => string
  saveBuildToAccount: (name: string) => string
  saveQuoteSubmission: (submission: Omit<QuoteSubmission, 'id' | 'createdAt' | 'config' | 'price'>) => string
  loadBuild:   (id: string) => void
  deleteBuild: (id: string) => void
  resetConfig: () => void
  currentConfig: () => ConfigState

  // Derived
  breakdown: () => { label: string; amount: number }[]
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_CONFIG,
      livePrice:   calcPrice(DEFAULT_CONFIG),
      savedBuilds: [],
      accountBuilds: [],
      quoteSubmissions: [],

      setOption: (key, value) => {
        const config = { ...get().currentConfig(), [key]: value }
        set({ ...config, livePrice: calcPrice(config) })
      },

      currentConfig: () => {
        const state = get()
        return {
          shape: state.shape, finish: state.finish, top: state.top,
          neck: state.neck, fretboard: state.fretboard,
          hardware: state.hardware, bridge: state.bridge, pickups: state.pickups,
          pickguard: state.pickguard, knobs: state.knobs, switchTip: state.switchTip,
          tuners: state.tuners, strings: state.strings,
          livePrice: state.livePrice,
        }
      },

      saveQuoteSubmission: (submission) => {
        const state = get()
        const id = `quote_${Date.now()}`
        const quote: QuoteSubmission = {
          ...submission,
          id,
          config: state.currentConfig(),
          price: state.livePrice,
          createdAt: new Date().toISOString(),
        }
        set(s => ({ quoteSubmissions: [quote, ...s.quoteSubmissions].slice(0, 20) }))
        return id
      },

      saveBuild: (name) => {
        const state = get()
        const id = `build_${Date.now()}`
        const build: SavedBuild = {
          id, name,
          config: {
            shape: state.shape, finish: state.finish, top: state.top,
            neck: state.neck, fretboard: state.fretboard,
            hardware: state.hardware, bridge: state.bridge, pickups: state.pickups,
            pickguard: state.pickguard, knobs: state.knobs, switchTip: state.switchTip,
            tuners: state.tuners, strings: state.strings,
          },
          price: state.livePrice,
          createdAt: new Date().toISOString(),
        }
        set(s => ({ savedBuilds: [build, ...s.savedBuilds] }))
        return id
      },

      saveBuildToAccount: (name) => {
        const state = get()
        const id = `account_build_${Date.now()}`
        const build: SavedBuild = {
          id, name,
          config: {
            shape: state.shape, finish: state.finish, top: state.top,
            neck: state.neck, fretboard: state.fretboard,
            hardware: state.hardware, bridge: state.bridge, pickups: state.pickups,
            pickguard: state.pickguard, knobs: state.knobs, switchTip: state.switchTip,
            tuners: state.tuners, strings: state.strings,
          },
          price: state.livePrice,
          createdAt: new Date().toISOString(),
        }
        set(s => ({ accountBuilds: [build, ...s.accountBuilds].slice(0, 12) }))
        return id
      },

      loadBuild: (id) => {
        const state = get()
        const build = [...state.savedBuilds, ...state.accountBuilds].find(b => b.id === id)
        if (!build) return
        set({ ...build.config, livePrice: calcPrice(build.config) })
      },

      deleteBuild: (id) => {
        set(s => ({ savedBuilds: s.savedBuilds.filter(b => b.id !== id) }))
      },

      resetConfig: () => {
        set({ ...DEFAULT_CONFIG, livePrice: calcPrice(DEFAULT_CONFIG) })
      },

      breakdown: () => {
        const state = get()
        return getPriceBreakdown({
          shape: state.shape, finish: state.finish, top: state.top,
          neck: state.neck, fretboard: state.fretboard,
          hardware: state.hardware, bridge: state.bridge, pickups: state.pickups,
          pickguard: state.pickguard, knobs: state.knobs, switchTip: state.switchTip,
          tuners: state.tuners, strings: state.strings,
        })
      },
    }),
    {
      name:    'luthify-config',
      partialize: (state) => ({
        shape: state.shape, finish: state.finish, top: state.top,
        neck: state.neck, fretboard: state.fretboard,
        hardware: state.hardware, bridge: state.bridge, pickups: state.pickups,
        pickguard: state.pickguard, knobs: state.knobs, switchTip: state.switchTip,
        tuners: state.tuners, strings: state.strings,
        savedBuilds: state.savedBuilds,
        accountBuilds: state.accountBuilds,
        quoteSubmissions: state.quoteSubmissions,
      }),
    }
  )
)
