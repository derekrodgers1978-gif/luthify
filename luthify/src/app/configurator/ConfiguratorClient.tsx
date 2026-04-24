'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import ConfigPanel from '@/components/configurator/ConfigPanel'
import SpecSheet from '@/components/configurator/SpecSheet'
import QuoteModal from '@/components/ui/QuoteModal'
import { useConfigStore } from '@/store/configStore'

// SSR-safe Three.js canvas
const GuitarCanvas = dynamic(() => import('@/components/configurator/GuitarCanvas'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', background: '#09090B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(201,164,92,0.3)', borderTopColor: '#C9A45C', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontSize: '0.8rem', color: 'rgba(245,241,232,0.4)' }}>Loading 3D viewer…</p>
      </div>
    </div>
  ),
})

const TRUST_ITEMS = [
  { icon: '🛡', title: 'Escrow Protected', sub: 'Funds held until delivery' },
  { icon: '✦', title: 'Vetted Luthiers', sub: 'Hand-selected, insured builds' },
  { icon: '✈', title: 'Global Shipping', sub: 'Insured white-glove freight' },
  { icon: '★', title: '4.9 / 5 Average', sub: 'From verified commissions' },
]

export default function ConfiguratorClient() {
  const store = useConfigStore()
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false) // mobile panel toggle

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 76px)', background: '#09090B', overflow: 'hidden', position: 'relative' }}>

      {/* ── LEFT: 3D Canvas ── */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <GuitarCanvas />

          {/* Real-time badge */}
          <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(9,9,11,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '6px 14px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#F5F1E8' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5fb87a', boxShadow: '0 0 6px #5fb87a', animation: 'pulse2 2s infinite' }} />
            Real-Time 3D
          </div>

          {/* Controls hint */}
          <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', gap: 8 }}>
            <div style={{ background: 'rgba(9,9,11,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '6px 12px', fontSize: '0.68rem', color: 'rgba(245,241,232,0.5)' }}>Drag · Pinch · Zoom</div>
          </div>

          {/* Spec sheet overlay */}
          <SpecSheet />

          {/* Estimate chip */}
          <div style={{ position: 'absolute', bottom: 80, right: 20, zIndex: 10, background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(201,164,92,0.2)', borderRadius: 12, padding: '8px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'rgba(245,241,232,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Est.</span>
            <span style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1.1rem', fontWeight: 700, color: '#C9A45C' }}>${store.livePrice.toLocaleString()}</span>
          </div>
        </div>

        {/* Trust bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(9,9,11,0.9)' }}>
          {TRUST_ITEMS.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(201,164,92,0.08)', border: '1px solid rgba(201,164,92,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{item.title}</div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(245,241,232,0.45)' }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Config Panel (desktop) ── */}
      <div className="hidden lg:flex" style={{ width: 420, borderLeft: '1px solid rgba(255,255,255,0.07)', background: '#111114', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ConfigPanel />
      </div>

      {/* ── Mobile: slide-up panel toggle ── */}
      <div className="lg:hidden" style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 50 }}>
        <button onClick={() => setPanelOpen(p => !p)} style={{ background: 'linear-gradient(135deg,#E2C07A,#C9A45C)', color: '#09090B', border: 'none', borderRadius: 999, padding: '12px 20px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 8px 32px rgba(201,164,92,0.4)' }}>
          {panelOpen ? '✕ Close' : '⚙ Configure'}
        </button>
      </div>

      {/* ── Mobile config drawer ── */}
      {panelOpen && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.6)' }} onClick={() => setPanelOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80vh', background: '#111114', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '12px auto 0' }} />
            <ConfigPanel />
          </div>
        </div>
      )}

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </div>
  )
}
