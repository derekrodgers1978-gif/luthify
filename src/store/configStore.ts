import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  CONFIG_OPTION_GROUPS,
  DEFAULT_CONFIG,
  type ConfigKey,
  getPriceBreakdown,
} from '@/lib/configurator-options'
import {
  DEFAULT_INSTRUMENT_KEY,
  getInstrumentConfig,
  type InstrumentConfig,
} from '@/config/instrumentConfig'
import type { ConfigState } from '@/types'

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ModelErrorCode = 'NOT_FOUND' | 'INVALID_GLB' | 'UNKNOWN' | null
export type MeshAudit = { found: string[]; missing: string[]; all: string[] }

export interface SavedBuild {
  id:        string
  name:      string
  config:    Omit<ConfigState, 'livePrice'>
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
  instrumentKey: string
  instrumentConfig: InstrumentConfig
  finishId: string
  hardwareId: string
  fretboardId: string
  pickupId: string
  modelStatus: ModelStatus
  errorCode: ModelErrorCode
  meshAudit: MeshAudit | null

  // Existing UI-facing config keys.
  shape: string
  finish: string
  top: string
  neck: string
  fretboard: string
  hardware: string
  bridge: string
  pickups: string
  livePrice: number

  savedBuilds: SavedBuild[]
  accountBuilds: SavedBuild[]
  quoteSubmissions: QuoteSubmission[]

  setInstrument: (instrumentKey: string) => void
  setFinish: (finishId: string) => void
  setHardware: (hardwareId: string) => void
  setFretboard: (fretboardId: string) => void
  setPickup: (pickupId: string) => void
  setModelStatus: (status: ModelStatus) => void
  setError: (errorCode: ModelErrorCode) => void
  setMeshAudit: (meshAudit: MeshAudit | null) => void

  setOption: (key: ConfigKey, value: string) => void
  saveBuild: (name: string) => string
  saveBuildToAccount: (name: string) => string
  saveQuoteSubmission: (submission: Omit<QuoteSubmission, 'id' | 'createdAt' | 'config' | 'price'>) => string
  loadBuild: (id: string) => void
  deleteBuild: (id: string) => void
  resetConfig: () => void
  currentConfig: () => ConfigState
  totalPrice: () => number
  breakdown: () => { label: string; amount: number }[]
}

function priceForState(state: Pick<ConfigStore, 'instrumentConfig' | ConfigKey>): number {
  const optionTotal = CONFIG_OPTION_GROUPS.reduce((sum, [key, , options]) => {
    if (key === 'shape') return sum
    const option = options.find(item => item.id === state[key])
    return sum + (option?.priceAdj ?? 0)
  }, 0)
  return state.instrumentConfig.basePrice + optionTotal
}

function statePatchForOption(state: ConfigStore, key: ConfigKey, value: string): Partial<ConfigStore> {
  if (key === 'shape') {
    const instrumentConfig = getInstrumentConfig(value)
    return {
      shape: instrumentConfig.id,
      instrumentKey: instrumentConfig.id,
      instrumentConfig,
      modelStatus: 'idle',
      errorCode: null,
      meshAudit: null,
    }
  }
  if (key === 'finish') return { finish: value, finishId: value }
  if (key === 'hardware') return { hardware: value, hardwareId: value }
  if (key === 'fretboard') return { fretboard: value, fretboardId: value }
  if (key === 'pickups') return { pickups: value, pickupId: value }
  return { [key]: value } as Partial<ConfigStore>
}

function currentConfigFromState(state: ConfigStore): ConfigState {
  return {
    shape: state.shape,
    finish: state.finish,
    top: state.top,
    neck: state.neck,
    fretboard: state.fretboard,
    hardware: state.hardware,
    bridge: state.bridge,
    pickups: state.pickups,
    livePrice: state.totalPrice(),
  }
}

function buildPriceBreakdown(state: ConfigStore) {
  const lines = getPriceBreakdown(currentConfigFromState(state)).filter(line => line.label !== 'Base build')
  return [{ label: 'Base build', amount: state.instrumentConfig.basePrice }, ...lines]
}

const initialInstrumentConfig = getInstrumentConfig(DEFAULT_CONFIG.shape ?? DEFAULT_INSTRUMENT_KEY)

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      instrumentKey: initialInstrumentConfig.id,
      instrumentConfig: initialInstrumentConfig,
      finishId: DEFAULT_CONFIG.finish,
      hardwareId: DEFAULT_CONFIG.hardware,
      fretboardId: DEFAULT_CONFIG.fretboard,
      pickupId: DEFAULT_CONFIG.pickups,
      modelStatus: 'idle',
      errorCode: null,
      meshAudit: null,

      ...DEFAULT_CONFIG,
      livePrice: 0,
      savedBuilds: [],
      accountBuilds: [],
      quoteSubmissions: [],

      setInstrument: (instrumentKey) => {
        const instrumentConfig = getInstrumentConfig(instrumentKey)
        set(state => {
          const next = {
            ...state,
            shape: instrumentConfig.id,
            instrumentKey: instrumentConfig.id,
            instrumentConfig,
            modelStatus: 'idle' as ModelStatus,
            errorCode: null,
            meshAudit: null,
          }
          return { ...next, livePrice: priceForState(next) }
        })
      },
      setFinish: (finishId) => get().setOption('finish', finishId),
      setHardware: (hardwareId) => get().setOption('hardware', hardwareId),
      setFretboard: (fretboardId) => get().setOption('fretboard', fretboardId),
      setPickup: (pickupId) => get().setOption('pickups', pickupId),
      setModelStatus: (modelStatus) => set({ modelStatus }),
      setError: (errorCode) => set({ errorCode, modelStatus: errorCode ? 'error' : get().modelStatus }),
      setMeshAudit: (meshAudit) => set({ meshAudit }),

      setOption: (key, value) => {
        set(state => {
          const next = { ...state, ...statePatchForOption(state, key, value) }
          return { ...next, livePrice: priceForState(next) }
        })
      },

      totalPrice: () => priceForState(get()),

      currentConfig: () => currentConfigFromState(get()),

      saveQuoteSubmission: (submission) => {
        const state = get()
        const id = `quote_${Date.now()}`
        const quote: QuoteSubmission = {
          ...submission,
          id,
          config: state.currentConfig(),
          price: state.totalPrice(),
          createdAt: new Date().toISOString(),
        }
        set(s => ({ quoteSubmissions: [quote, ...s.quoteSubmissions].slice(0, 20) }))
        return id
      },

      saveBuild: (name) => {
        const state = get()
        const id = `build_${Date.now()}`
        const build: SavedBuild = {
          id,
          name,
          config: {
            shape: state.shape,
            finish: state.finish,
            top: state.top,
            neck: state.neck,
            fretboard: state.fretboard,
            hardware: state.hardware,
            bridge: state.bridge,
            pickups: state.pickups,
          },
          price: state.totalPrice(),
          createdAt: new Date().toISOString(),
        }
        set(s => ({ savedBuilds: [build, ...s.savedBuilds] }))
        return id
      },

      saveBuildToAccount: (name) => {
        const state = get()
        const id = `account_build_${Date.now()}`
        const build: SavedBuild = {
          id,
          name,
          config: {
            shape: state.shape,
            finish: state.finish,
            top: state.top,
            neck: state.neck,
            fretboard: state.fretboard,
            hardware: state.hardware,
            bridge: state.bridge,
            pickups: state.pickups,
          },
          price: state.totalPrice(),
          createdAt: new Date().toISOString(),
        }
        set(s => ({ accountBuilds: [build, ...s.accountBuilds].slice(0, 12) }))
        return id
      },

      loadBuild: (id) => {
        const state = get()
        const build = [...state.savedBuilds, ...state.accountBuilds].find(item => item.id === id)
        if (!build) return
        const instrumentConfig = getInstrumentConfig(build.config.shape)
        set(current => {
          const next = {
            ...current,
            ...build.config,
            instrumentKey: instrumentConfig.id,
            instrumentConfig,
            finishId: build.config.finish,
            hardwareId: build.config.hardware,
            fretboardId: build.config.fretboard,
            pickupId: build.config.pickups,
            modelStatus: 'idle' as ModelStatus,
            errorCode: null,
            meshAudit: null,
          }
          return { ...next, livePrice: priceForState(next) }
        })
      },

      deleteBuild: (id) => {
        set(s => ({ savedBuilds: s.savedBuilds.filter(build => build.id !== id) }))
      },

      resetConfig: () => {
        const instrumentConfig = getInstrumentConfig(DEFAULT_CONFIG.shape)
        set(state => {
          const next = {
            ...state,
            ...DEFAULT_CONFIG,
            instrumentKey: instrumentConfig.id,
            instrumentConfig,
            finishId: DEFAULT_CONFIG.finish,
            hardwareId: DEFAULT_CONFIG.hardware,
            fretboardId: DEFAULT_CONFIG.fretboard,
            pickupId: DEFAULT_CONFIG.pickups,
            modelStatus: 'idle' as ModelStatus,
            errorCode: null,
            meshAudit: null,
          }
          return { ...next, livePrice: priceForState(next) }
        })
      },

      breakdown: () => buildPriceBreakdown(get()),
    }),
    {
      name: 'luthify-config',
      partialize: (state) => ({
        shape: state.shape,
        finish: state.finish,
        top: state.top,
        neck: state.neck,
        fretboard: state.fretboard,
        hardware: state.hardware,
        bridge: state.bridge,
        pickups: state.pickups,
        instrumentKey: state.instrumentKey,
        finishId: state.finishId,
        hardwareId: state.hardwareId,
        fretboardId: state.fretboardId,
        pickupId: state.pickupId,
        savedBuilds: state.savedBuilds,
        accountBuilds: state.accountBuilds,
        quoteSubmissions: state.quoteSubmissions,
      }),
      merge: (persisted, current) => {
        const restored = { ...current, ...(persisted as Partial<ConfigStore>) }
        const instrumentConfig = getInstrumentConfig(restored.instrumentKey ?? restored.shape ?? DEFAULT_INSTRUMENT_KEY)
        const next = {
          ...restored,
          shape: instrumentConfig.id,
          instrumentKey: instrumentConfig.id,
          instrumentConfig,
          finishId: restored.finish ?? DEFAULT_CONFIG.finish,
          hardwareId: restored.hardware ?? DEFAULT_CONFIG.hardware,
          fretboardId: restored.fretboard ?? DEFAULT_CONFIG.fretboard,
          pickupId: restored.pickups ?? DEFAULT_CONFIG.pickups,
          modelStatus: 'idle' as ModelStatus,
          errorCode: null,
          meshAudit: null,
        }
        return { ...next, livePrice: priceForState(next) } as ConfigStore
      },
    }
  )
)

useConfigStore.setState(state => ({ livePrice: priceForState(state) }))
