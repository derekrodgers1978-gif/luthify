'use client'
import { useState } from 'react'
import { useConfigStore } from '@/store/configStore'
import {
  BODY_SHAPES, FINISHES, FINISH_GROUPS, TOPS, NECK_WOODS,
  FRETBOARDS, HARDWARE_COLORS, PICKGUARDS, TUNERS, KNOBS, SWITCH_TIPS, BRIDGES, PICKUP_COVERS, PICKUPS,
  DEFAULT_CONFIG, type ConfigKey,
} from '@/lib/configurator-options'
import type { ConfigOption } from '@/types'

type Tab = 'body' | 'neck' | 'hardware'

const S = {
  label:    { fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#C9A45C', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  group:    { background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015)), #18181C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '21px 20px 19px', transition: 'border-color 0.2s, box-shadow 0.2s' },
  tab:      (active: boolean) => ({ flex: 1, padding: '12px 8px', textAlign: 'center' as const, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: active ? 'rgba(201,164,92,0.08)' : 'transparent', border: 'none', borderBottom: `2px solid ${active ? '#C9A45C' : 'rgba(255,255,255,0.05)'}`, color: active ? '#C9A45C' : 'rgba(245,241,232,0.52)', transition: 'all 0.18s', letterSpacing: '0.02em' }),
  swatch:   (active: boolean, hex: string) => ({ width: 36, height: 36, borderRadius: 10, background: hex, border: `2px solid ${active ? '#C9A45C' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', transition: 'all 0.15s', outline: active ? '1px solid rgba(201,164,92,0.4)' : 'none', transform: active ? 'scale(1.08)' : 'scale(1)', boxShadow: active ? '0 0 0 4px rgba(201,164,92,0.14)' : 'inset 0 0 0 1px rgba(0,0,0,0.35)' }),
  burstSwatch: (active: boolean, colors: string[]) => ({ width: 36, height: 36, borderRadius: 10, background: `radial-gradient(circle at 50% 45%, ${colors[0]} 0%, ${colors[1]} 48%, ${colors[2]} 88%)`, border: `2px solid ${active ? '#C9A45C' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', transition: 'all 0.15s', outline: active ? '1px solid rgba(201,164,92,0.4)' : 'none', transform: active ? 'scale(1.08)' : 'scale(1)', boxShadow: active ? '0 0 0 4px rgba(201,164,92,0.14)' : 'inset 0 0 0 1px rgba(0,0,0,0.35)' }),
  finishGroupLabel: { fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase' as const, color: 'rgba(226,192,122,0.72)', margin: '2px 0 8px' },
  pill:     (active: boolean) => ({ padding: '9px 15px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 650, cursor: 'pointer', background: active ? 'linear-gradient(135deg,rgba(226,192,122,0.14),rgba(201,164,92,0.08))' : '#111114', border: `1px solid ${active ? '#C9A45C' : 'rgba(255,255,255,0.08)'}`, color: active ? '#E2C07A' : 'rgba(245,241,232,0.58)', transition: 'all 0.15s', boxShadow: active ? '0 8px 24px rgba(201,164,92,0.08)' : 'none' }),
  topCard:  (active: boolean) => ({ padding: '15px 16px', borderRadius: 16, background: active ? 'linear-gradient(180deg,rgba(201,164,92,0.09),rgba(201,164,92,0.04))' : '#09090B', border: `2px solid ${active ? '#C9A45C' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', transition: 'all 0.18s', boxShadow: active ? '0 10px 30px rgba(201,164,92,0.08)' : 'none' }),
}

function GroupLabel({ children, value }: { children: React.ReactNode; value?: string }) {
  return (
    <div style={S.label}>
      <span>{children}</span>
      {value && <span style={{ color: '#F5F1E8', textTransform: 'none', letterSpacing: 0, fontWeight: 400, fontSize: '0.78rem' }}>{value}</span>}
    </div>
  )
}

export default function ConfigPanel() {
  const store = useConfigStore()
  const [tab, setTab] = useState<Tab>('body')

  const getLabel = (opts: ConfigOption[], id: string) => opts.find(o => o.id === id)?.label ?? id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '30px 30px 0' }}>
        <div style={{ fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C9A45C', marginBottom: 10 }}>Specification</div>
        <h2 style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1.72rem', fontWeight: 700, lineHeight: 1.05, marginBottom: 7 }}>Configure every detail</h2>
        <p style={{ fontSize: '0.82rem', color: 'rgba(245,241,232,0.56)', fontWeight: 300, lineHeight: 1.55 }}>Every selection updates the preview, price, and builder spec.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)', margin: '22px 0 0', background: 'rgba(9,9,11,0.36)' }}>
        {(['body','neck','hardware'] as Tab[]).map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Options — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 30px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {tab === 'body' && (
          <>
            {/* Body shape */}
            <div style={S.group}>
              <GroupLabel value={getLabel(BODY_SHAPES, store.shape)}>Body Shape</GroupLabel>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {BODY_SHAPES.map(o => (
                  <button key={o.id} style={S.pill(store.shape === o.id)} onClick={() => store.setOption('shape', o.id)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Finish */}
            <div style={S.group}>
              <GroupLabel value={getLabel(FINISHES, store.finish)}>Finish</GroupLabel>
              {FINISH_GROUPS.map(group => {
                const options = FINISHES.filter(o => o.finishGroup === group.id)
                return (
                  <div key={group.id} style={{ marginBottom: 12 }}>
                    <div style={S.finishGroupLabel}>{group.label}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                      {options.map(o => (
                        <div
                          key={o.id}
                          title={o.label}
                          style={o.finishGroup === 'burst' && o.burstColors ? S.burstSwatch(store.finish === o.id, o.burstColors) : S.swatch(store.finish === o.id, o.hex!)}
                          onClick={() => store.setOption('finish', o.id)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
              <p style={{ fontSize: '0.72rem', color: 'rgba(245,241,232,0.4)', marginTop: 4 }}>
                {FINISHES.find(f => f.id === store.finish)?.label} finish
              </p>
            </div>

            {/* Top wood */}
            <div style={S.group}>
              <GroupLabel value={getLabel(TOPS, store.top)}>Top</GroupLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TOPS.map(o => (
                  <div key={o.id} style={S.topCard(store.top === o.id)} onClick={() => store.setOption('top', o.id)}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 2 }}>{o.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(245,241,232,0.45)', marginBottom: 4 }}>{o.sub}</div>
                    {o.priceAdj > 0 && <div style={{ fontSize: '0.72rem', color: '#C9A45C', fontWeight: 600 }}>+${o.priceAdj}</div>}
                    {o.priceAdj === 0 && <div style={{ fontSize: '0.72rem', color: '#5fb87a' }}>Included</div>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'neck' && (
          <>
            <div style={S.group}>
              <GroupLabel value={getLabel(NECK_WOODS, store.neck)}>Neck Wood</GroupLabel>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {NECK_WOODS.map(o => (
                  <button key={o.id} style={S.pill(store.neck === o.id)} onClick={() => store.setOption('neck', o.id)}>
                    {o.label}{o.priceAdj > 0 && <span style={{ color: '#C9A45C', marginLeft: 4 }}>+${o.priceAdj}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={S.group}>
              <GroupLabel value={getLabel(FRETBOARDS, store.fretboard)}>Fretboard</GroupLabel>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                {FRETBOARDS.map(o => (
                  <div key={o.id} title={o.label} style={{ width: 36, height: 36, borderRadius: 9, background: o.hex, border: `2px solid ${store.fretboard === o.id ? '#C9A45C' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s', transform: store.fretboard === o.id ? 'scale(1.12)' : 'scale(1)' }} onClick={() => store.setOption('fretboard', o.id)} />
                ))}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'rgba(245,241,232,0.4)' }}>{FRETBOARDS.find(f => f.id === store.fretboard)?.label}</p>
            </div>
          </>
        )}

        {tab === 'hardware' && (
          <>
            <div style={S.group}>
              <GroupLabel value={getLabel(HARDWARE_COLORS, store.hardware)}>Hardware</GroupLabel>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {HARDWARE_COLORS.map(o => (
                  <button key={o.id} style={S.pill(store.hardware === o.id)} onClick={() => store.setOption('hardware', o.id)}>
                    {o.label}{o.priceAdj > 0 && <span style={{ color: '#C9A45C', marginLeft: 4 }}>+${o.priceAdj}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={S.group}>
              <GroupLabel value={getLabel(BRIDGES, store.bridge)}>Bridge</GroupLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {BRIDGES.map(o => (
                  <div key={o.id} style={S.topCard(store.bridge === o.id)} onClick={() => store.setOption('bridge', o.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{o.label}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(245,241,232,0.45)' }}>{o.sub}</div>
                      </div>
                      {o.priceAdj > 0 && <span style={{ fontSize: '0.76rem', color: '#C9A45C', fontWeight: 600 }}>+${o.priceAdj}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={S.group}>
              <GroupLabel value={getLabel(PICKUPS, store.pickups)}>Pickups</GroupLabel>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {PICKUPS.map(o => (
                  <button key={o.id} style={S.pill(store.pickups === o.id)} onClick={() => store.setOption('pickups', o.id)}>
                    {o.label}{o.priceAdj > 0 && <span style={{ color: '#C9A45C', marginLeft: 4 }}>+${o.priceAdj}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={S.group}>
              <GroupLabel value={getLabel(PICKGUARDS, store.pickguard)}>Pickguard</GroupLabel>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {PICKGUARDS.map(o => (
                  <div key={o.id} title={o.label} style={S.swatch(store.pickguard === o.id, o.hex!)} onClick={() => store.setOption('pickguard', o.id)} />
                ))}
              </div>
            </div>

            <div style={S.group}>
              <GroupLabel value={getLabel(TUNERS, store.tuners)}>Tuners</GroupLabel>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {TUNERS.map(o => (
                  <div key={o.id} title={o.label} style={S.swatch(store.tuners === o.id, o.hex!)} onClick={() => store.setOption('tuners', o.id)} />
                ))}
              </div>
            </div>

            <div style={S.group}>
              <GroupLabel value={getLabel(KNOBS, store.knobs)}>Knobs</GroupLabel>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {KNOBS.map(o => (
                  <div key={o.id} title={o.label} style={S.swatch(store.knobs === o.id, o.hex!)} onClick={() => store.setOption('knobs', o.id)} />
                ))}
              </div>
            </div>

            <div style={S.group}>
              <GroupLabel value={getLabel(SWITCH_TIPS, store.switchTip)}>Switch Tip</GroupLabel>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {SWITCH_TIPS.map(o => (
                  <div key={o.id} title={o.label} style={S.swatch(store.switchTip === o.id, o.hex!)} onClick={() => store.setOption('switchTip', o.id)} />
                ))}
              </div>
            </div>

            <div style={S.group}>
              <GroupLabel value={getLabel(PICKUP_COVERS, store.pickupCovers)}>Pickup Covers</GroupLabel>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {PICKUP_COVERS.map(o => (
                  <div key={o.id} title={o.label} style={S.swatch(store.pickupCovers === o.id, o.hex!)} onClick={() => store.setOption('pickupCovers', o.id)} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Live price + actions — sticky */}
      <PriceFooter />
    </div>
  )
}

function PriceFooter() {
  const store = useConfigStore()
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [saveName, setSaveName] = useState('My custom build')
  const [status, setStatus] = useState<string | null>(null)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const breakdown = store.breakdown()

  const currentParams = () => {
    const params = new URLSearchParams()
    ;(Object.keys(DEFAULT_CONFIG) as ConfigKey[]).forEach(key => {
      params.set(key, store[key])
    })
    return params
  }

  const handleSave = () => {
    const name = saveName.trim() || 'My custom build'
    store.saveBuild(name)
    setStatus('Build saved')
    setSaveOpen(false)
    setSaveName('My custom build')
    setTimeout(() => setStatus(null), 1800)
  }

  const handleAccountSave = () => {
    const name = saveName.trim() || `Account build ${store.accountBuilds.length + 1}`
    store.saveBuildToAccount(name)
    setStatus('Saved to account')
    setSaveOpen(false)
    setSaveName('My custom build')
    setTimeout(() => setStatus(null), 1800)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?${currentParams().toString()}`
    const shareData = {
      title: 'Luthify custom build',
      text: `Configured build estimate: $${store.livePrice.toLocaleString()}`,
      url,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
        setStatus('Share sheet opened')
      } else {
        await navigator.clipboard.writeText(url)
        setStatus('Share link copied')
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setStatus('Share unavailable')
    }
    setTimeout(() => setStatus(null), 1800)
  }

  // Lazy-load QuoteModal to avoid circular import issues at module level
  const [QuoteModal, setQM] = useState<React.ComponentType<{ open: boolean; onClose: () => void }> | null>(null)
  const openQuote = async () => {
    if (!QuoteModal) {
      const mod = await import('@/components/ui/QuoteModal')
      setQM(() => mod.default)
    }
    setQuoteOpen(true)
  }

  return (
    <>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '16px 28px 28px', background: '#111114' }}>
        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showBreakdown ? 12 : 16 }}>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,241,232,0.4)' }}>Live Price</div>
            <div style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1.8rem', fontWeight: 700, color: '#C9A45C', transition: 'all 0.3s' }}>
              ${store.livePrice.toLocaleString()}
            </div>
          </div>
          <button onClick={() => setShowBreakdown(b => !b)} style={{ fontSize: '0.75rem', color: 'rgba(245,241,232,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {showBreakdown ? 'Hide ↑' : 'Details ↓'}
          </button>
        </div>

        {/* Breakdown */}
        {showBreakdown && (
          <div style={{ background: '#18181C', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
            {breakdown.map((line, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: i < breakdown.length - 1 ? 6 : 0, paddingBottom: i === 0 ? 8 : 0, borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ color: 'rgba(245,241,232,0.6)' }}>{line.label}</span>
                <span style={{ color: i === breakdown.length - 1 ? '#C9A45C' : '#F5F1E8', fontWeight: i === breakdown.length - 1 ? 600 : 400 }}>${line.amount.toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <span style={{ color: '#C9A45C', fontWeight: 700, fontFamily: "'Bodoni Moda',serif" }}>${store.livePrice.toLocaleString()}</span>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'rgba(245,241,232,0.35)', marginTop: 6 }}>Final price confirmed by your chosen builder. No payment is collected in Phase 1.</p>
          </div>
        )}

        {status && (
          <div style={{ background: 'rgba(95,184,122,0.08)', border: '1px solid rgba(95,184,122,0.22)', color: '#5fb87a', borderRadius: 10, padding: '9px 12px', fontSize: '0.78rem', fontWeight: 600, marginBottom: 10 }}>
            {status}
          </div>
        )}

        {/* Save build */}
        {saveOpen ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              className="input-field"
              style={{ flex: 1, padding: '10px 14px', fontSize: '0.84rem' }}
              placeholder="Name this build…"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <button onClick={handleSave} style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(201,164,92,0.1)', border: '1px solid rgba(201,164,92,0.25)', color: '#C9A45C', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
              Save
            </button>
            <button onClick={handleAccountSave} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(95,184,122,0.08)', border: '1px solid rgba(95,184,122,0.22)', color: '#5fb87a', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
              Account
            </button>
            <button onClick={() => setSaveOpen(false)} style={{ padding: '10px', borderRadius: 10, background: 'none', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(245,241,232,0.4)', cursor: 'pointer' }}>✕</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <button onClick={() => setSaveOpen(true)} style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'none', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(245,241,232,0.5)', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,164,92,0.3)'; e.currentTarget.style.color = '#C9A45C' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(245,241,232,0.5)' }}>
              ☆ Save Build
            </button>
            <button onClick={handleShare} style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'none', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(245,241,232,0.5)', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,164,92,0.3)'; e.currentTarget.style.color = '#C9A45C' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(245,241,232,0.5)' }}>
              ↗ Share Build
            </button>
          </div>
        )}

        <button onClick={handleAccountSave} style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'rgba(95,184,122,0.06)', border: '1px solid rgba(95,184,122,0.2)', color: '#5fb87a', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, marginBottom: 10, transition: 'all 0.2s' }}>
          Save to Account
        </button>

        <button onClick={() => setCompareOpen(o => !o)} style={{ width: '100%', padding: '10px', borderRadius: 12, background: compareOpen ? 'rgba(201,164,92,0.08)' : 'none', border: '1px solid rgba(255,255,255,0.07)', color: compareOpen ? '#C9A45C' : 'rgba(245,241,232,0.5)', cursor: 'pointer', fontSize: '0.8rem', marginBottom: 10, transition: 'all 0.2s' }}>
          Compare Builds ({store.savedBuilds.length + store.accountBuilds.length})
        </button>

        {compareOpen && (
          <div style={{ background: '#18181C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
            {[...store.savedBuilds, ...store.accountBuilds].length === 0 ? (
              <p style={{ fontSize: '0.76rem', color: 'rgba(245,241,232,0.42)', lineHeight: 1.5 }}>Save a build to compare specs and pricing side by side.</p>
            ) : (
              [...store.savedBuilds, ...store.accountBuilds].slice(0, 4).map(build => (
                <div key={build.id} onClick={() => store.loadBuild(build.id)} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.76rem', color: '#F5F1E8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{build.name}</span>
                  <span style={{ fontSize: '0.76rem', color: '#C9A45C', fontWeight: 700 }}>${build.price.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Primary CTA */}
        <button onClick={openQuote} style={{ width: '100%', padding: 15, borderRadius: 14, background: 'linear-gradient(135deg,#E2C07A,#C9A45C)', color: '#09090B', fontWeight: 700, fontSize: '0.92rem', border: 'none', cursor: 'pointer', letterSpacing: '0.02em', boxShadow: '0 8px 32px rgba(201,164,92,0.3)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 44px rgba(201,164,92,0.45)' }} onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,164,92,0.3)' }}>
          Request Builder Quote →
        </button>
        <a href="/builders" style={{ display: 'block', width: '100%', marginTop: 10, padding: 12, borderRadius: 12, textAlign: 'center', background: 'none', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(245,241,232,0.58)', textDecoration: 'none', cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,164,92,0.3)'; e.currentTarget.style.color = '#C9A45C' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(245,241,232,0.58)' }}>
          Choose Builder →
        </a>

        {QuoteModal && <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />}
      </div>

      {/* Saved builds list */}
      {store.savedBuilds.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px 28px', background: '#0d0d10' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,241,232,0.3)', marginBottom: 10 }}>Saved Builds</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {store.savedBuilds.slice(0, 3).map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: '#18181C', cursor: 'pointer' }} onClick={() => store.loadBuild(b.id)}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{b.name}</span>
                <span style={{ fontSize: '0.78rem', color: '#C9A45C' }}>${b.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
