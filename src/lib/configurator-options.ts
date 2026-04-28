import instrumentsData from '@/config/instruments.json'
import optionsData from '@/config/options.json'
import type { ConfigOption, ConfigState, InstrumentConfig, InstrumentRendererConfig, MaterialPreset, OptionGroup, OverlayPreset } from '@/types'

export const BASE_PRICE = optionsData.basePrice
export const MODEL_ROOT = instrumentsData.modelRoot
export const DEFAULT_INSTRUMENT_ID = instrumentsData.defaultInstrumentId

function normalizeRenderer(renderer: Partial<InstrumentRendererConfig>): InstrumentRendererConfig {
  const rotation = renderer.rotation ?? [0, 0, 0]
  return {
    targetSize: renderer.targetSize ?? 4.25,
    cameraDistance: renderer.cameraDistance ?? 6.4,
    rotation: [rotation[0] ?? 0, rotation[1] ?? 0, rotation[2] ?? 0],
    materialPreset: (renderer.materialPreset ?? 'universal') as MaterialPreset,
    overlayPreset: renderer.overlayPreset as OverlayPreset | undefined,
  }
}

export const INSTRUMENTS: InstrumentConfig[] = instrumentsData.instruments.map(instrument => ({
  ...instrument,
  modelPath: `${instrumentsData.modelRoot}/${instrument.model}`,
  renderer: normalizeRenderer(instrument.renderer as Partial<InstrumentRendererConfig>),
}))

export const BODY_SHAPES: ConfigOption[] = INSTRUMENTS.map(({ id, label, modelPath, priceAdj }) => ({
  id,
  label,
  modelPath,
  priceAdj,
}))

export const OPTION_GROUPS: OptionGroup[] = optionsData.groups.map(group => ({
  ...group,
  options: group.source === 'instruments' ? BODY_SHAPES : group.options ?? [],
})) as OptionGroup[]

export const FINISHES = getOptions('finish')
export const TOPS = getOptions('top')
export const NECK_WOODS = getOptions('neck')
export const FRETBOARDS = getOptions('fretboard')
export const HARDWARE_COLORS = getOptions('hardware')
export const BRIDGES = getOptions('bridge')
export const PICKUPS = getOptions('pickups')

export const DEFAULT_CONFIG = optionsData.defaults
export type ConfigKey = keyof typeof DEFAULT_CONFIG
export type ConfigValues = Record<ConfigKey, string>

export const CONFIG_OPTION_GROUPS: [ConfigKey, string, ConfigOption[]][] = OPTION_GROUPS.map(group => [
  group.key,
  group.label,
  group.options,
])

export function getInstrument(id: string): InstrumentConfig {
  return INSTRUMENTS.find(instrument => instrument.id === id) ?? INSTRUMENTS[0]
}

export function getOptionLabel(key: ConfigKey, id: string): string {
  const group = CONFIG_OPTION_GROUPS.find(([groupKey]) => groupKey === key)
  return group?.[2].find(o => o.id === id)?.label ?? id
}

export function getOptions(key: ConfigKey): ConfigOption[] {
  return OPTION_GROUPS.find(group => group.key === key)?.options ?? []
}

export function sanitizeConfig(config: Partial<ConfigValues>): ConfigValues {
  return (Object.keys(DEFAULT_CONFIG) as ConfigKey[]).reduce((next, key) => {
    const options = getOptions(key)
    const value = config[key]
    next[key] = value && options.some(option => option.id === value) ? value : DEFAULT_CONFIG[key]
    return next
  }, {} as ConfigValues)
}

export function calcPrice(config: Partial<ConfigValues>): number {
  return BASE_PRICE + CONFIG_OPTION_GROUPS.reduce((sum, [key, , options]) => {
    const id = config[key]
    const opt = options.find(o => o.id === id)
    return sum + (opt?.priceAdj ?? 0)
  }, 0)
}

export function getPriceBreakdown(config: Partial<ConfigValues>) {
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

export function configWithPrice(config: Partial<ConfigValues>): ConfigState {
  const sanitized = sanitizeConfig(config)
  return {
    ...sanitized,
    livePrice: calcPrice(sanitized),
  }
}
