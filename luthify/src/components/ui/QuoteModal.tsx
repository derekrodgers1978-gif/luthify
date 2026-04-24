'use client'
import { useState, useEffect } from 'react'
import { useConfigStore } from '@/store/configStore'
import { BUILDERS } from '@/lib/builders-data'
import { FINISHES, TOPS, HARDWARE_COLORS, FRETBOARDS, BODY_SHAPES, BRIDGES, PICKUPS, NECK_WOODS } from '@/lib/configurator-options'

interface Props { open: boolean; onClose: () => void; preselectedBuilderId?: string }

type Step = 'spec' | 'builder' | 'contact' | 'success'

export default function QuoteModal({ open, onClose, preselectedBuilderId }: Props) {
  const store = useConfigStore()
  const [step, setStep] = useState<Step>('spec')
  const [mode, setMode] = useState<'broadcast' | 'specific'>('broadcast')
  const [selectedBuilders, setSelectedBuilders] = useState<string[]>(
    preselectedBuilderId ? [preselectedBuilderId] : []
  )
  const [form, setForm] = useState({ name: '', email: '', budget: '$2,000 – $4,000', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) { setTimeout(() => setStep('spec'), 300) }
  }, [open])

  useEffect(() => {
    if (preselectedBuilderId) {
      setSelectedBuilders([preselectedBuilderId])
      setMode('specific')
    }
  }, [preselectedBuilderId])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const finish = FINISHES.find(f => f.id === store.finish)
  const top    = TOPS.find(t => t.id === store.top)
  const hw     = HARDWARE_COLORS.find(h => h.id === store.hardware)
  const fb     = FRETBOARDS.find(f => f.id === store.fretboard)
  const neck   = NECK_WOODS.find(n => n.id === store.neck)
  const shape  = BODY_SHAPES.find(s => s.id === store.shape)
  const bridge = BRIDGES.find(b => b.id === store.bridge)
  const pickups = PICKUPS.find(p => p.id === store.pickups)

  const specTags = [
    { label: shape?.label ?? store.shape, key: 'shape' },
    { label: finish?.label ?? store.finish, key: 'finish' },
    { label: top?.label ?? store.top, key: 'top' },
    { label: neck?.label ?? store.neck, key: 'neck' },
    { label: hw?.label + ' HW', key: 'hardware' },
    { label: fb?.label, key: 'fretboard' },
    { label: bridge?.label ?? store.bridge, key: 'bridge' },
    { label: pickups?.label ?? store.pickups, key: 'pickups' },
  ]

  const toggleBuilder = (id: string) => {
    setSelectedBuilders(s => s.includes(id) ? s.filter(b => b !== id) : [...s, id])
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1800))
    try {
      store.saveQuoteSubmission({
        name: form.name,
        email: form.email,
        budget: form.budget,
        notes: form.notes,
        mode,
        builderIds: mode === 'specific' ? selectedBuilders : [],
      })
    } catch (err) {
      console.warn('[Quote Request] Unable to save locally', err)
    }
    setSubmitting(false)
    setStep('success')
  }

  const steps: Step[] = ['spec', 'builder', 'contact']
  const stepIdx = steps.indexOf(step)

  if (!open) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{transform:translateY(20px) scale(0.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}`}</style>
      <div style={{
        background: '#111114', border: '1px solid rgba(201,164,92,0.18)',
        borderRadius: 28, width: 'min(560px, 100%)', maxHeight: '90vh',
        overflowY: 'auto', animation: 'slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* Header */}
        <div style={{ padding: '28px 32px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
              {step === 'success' ? 'Quote Requested!' : 'Request a Quote'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(245,241,232,0.55)' }}>
              {step === 'spec'    && 'Confirm your build spec'}
              {step === 'builder' && 'Choose who builds it'}
              {step === 'contact' && 'Where should quotes go?'}
              {step === 'success' && 'Builders will respond within 48 hours'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: '#18181C', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(245,241,232,0.55)', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l12 12M13 1L1 13"/></svg>
          </button>
        </div>

        <div style={{ padding: '20px 32px 32px' }}>

          {/* Progress steps */}
          {step !== 'success' && (
            <div style={{ display: 'flex', marginBottom: 24 }}>
              {(['spec','builder','contact'] as Step[]).map((s, i) => (
                <div key={s} style={{ flex: 1, paddingBottom: 8, textAlign: 'center', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `2px solid ${i < stepIdx ? '#5fb87a' : i === stepIdx ? '#C9A45C' : 'rgba(255,255,255,0.07)'}`, color: i < stepIdx ? '#5fb87a' : i === stepIdx ? '#C9A45C' : 'rgba(245,241,232,0.35)', transition: 'all 0.2s' }}>
                  {i < stepIdx ? '✓ ' : ''}{s}
                </div>
              ))}
            </div>
          )}

          {/* ── STEP 1: Spec ── */}
          {step === 'spec' && (
            <div>
              <div style={{ background: '#18181C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,241,232,0.35)', marginRight: 4 }}>Your Build</span>
                {specTags.map(t => (
                  <span key={t.key} style={{ background: 'rgba(201,164,92,0.1)', border: '1px solid rgba(201,164,92,0.25)', borderRadius: 8, padding: '4px 10px', fontSize: '0.72rem', color: '#C9A45C', fontWeight: 500 }}>{t.label}</span>
                ))}
                <span style={{ marginLeft: 'auto', fontFamily: "'Bodoni Moda',serif", fontSize: '1.1rem', fontWeight: 700, color: '#C9A45C' }}>${store.livePrice.toLocaleString()}</span>
              </div>

              <div style={{ background: 'rgba(201,164,92,0.06)', border: '1px solid rgba(201,164,92,0.18)', borderRadius: 14, padding: '16px 18px', display: 'flex', gap: 14, marginBottom: 24 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A45C" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#F5F1E8', display: 'block', marginBottom: 3 }}>No payment until you accept a quote</strong>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(245,241,232,0.55)', lineHeight: 1.6, fontWeight: 300 }}>Builders will review your spec and respond with pricing, timeline, and availability. You choose who to proceed with — or no one. Zero commitment.</p>
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'rgba(245,241,232,0.55)', marginBottom: 12 }}>Not happy with the spec?</p>
              <a href="/configurator" style={{ fontSize: '0.82rem', color: '#C9A45C', textDecoration: 'none', fontWeight: 500 }}>← Edit in configurator</a>

              <button className="btn-primary" onClick={() => setStep('builder')} style={{ width: '100%', marginTop: 24, padding: 15, fontSize: '0.92rem' }}>
                Continue — Choose Builders →
              </button>
            </div>
          )}

          {/* ── STEP 2: Builder ── */}
          {step === 'builder' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {(['broadcast','specific'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '11px 8px', borderRadius: 10, textAlign: 'center', background: mode === m ? 'rgba(201,164,92,0.07)' : '#18181C', border: `1px solid ${mode === m ? '#C9A45C' : 'rgba(255,255,255,0.07)'}`, color: mode === m ? '#C9A45C' : 'rgba(245,241,232,0.55)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.18s' }}>
                    {m === 'broadcast' ? '📣  Send to all verified builders' : '🎯  Choose specific builders'}
                  </button>
                ))}
              </div>

              {mode === 'broadcast' ? (
                <div style={{ background: 'rgba(95,184,122,0.06)', border: '1px solid rgba(95,184,122,0.2)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
                  <strong style={{ fontSize: '0.85rem', color: '#5fb87a', display: 'block', marginBottom: 4 }}>Your quote goes to {BUILDERS.filter(b => b.verified).length} verified builders</strong>
                  <p style={{ fontSize: '0.79rem', color: 'rgba(245,241,232,0.55)', lineHeight: 1.6, fontWeight: 300 }}>Get competitive quotes from all matching luthiers. Average response time: 48 hours.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {BUILDERS.map(b => (
                    <div key={b.id} onClick={() => toggleBuilder(b.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: '#18181C', border: `2px solid ${selectedBuilders.includes(b.id) ? '#C9A45C' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer', transition: 'all 0.18s' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#E2C07A,#C9A45C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#09090B', flexShrink: 0 }}>{b.avatar}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{b.shopName}</span>
                          {b.featured && <span style={{ fontSize: '0.6rem', color: '#C9A45C', background: 'rgba(201,164,92,0.1)', border: '1px solid rgba(201,164,92,0.2)', borderRadius: 999, padding: '1px 7px', fontWeight: 500 }}>Featured</span>}
                        </div>
                        <span style={{ fontSize: '0.74rem', color: 'rgba(245,241,232,0.5)' }}>{b.speciality} · {b.location} · Avg {b.avgBuildWeeks}wk · {b.rating}★</span>
                      </div>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selectedBuilders.includes(b.id) ? '#C9A45C' : 'rgba(255,255,255,0.2)'}`, background: selectedBuilders.includes(b.id) ? '#C9A45C' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.18s' }}>
                        {selectedBuilders.includes(b.id) && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#09090B" strokeWidth="2"><path d="M1.5 5l2.5 2.5 4.5-4"/></svg>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={() => setStep('spec')} style={{ flex: 1, padding: 13 }}>← Back</button>
                <button className="btn-primary" onClick={() => setStep('contact')} disabled={mode === 'specific' && selectedBuilders.length === 0} style={{ flex: 2, padding: 13, opacity: mode === 'specific' && selectedBuilders.length === 0 ? 0.5 : 1 }}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Contact ── */}
          {step === 'contact' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A45C', display: 'block', marginBottom: 8 }}>Your Name</label>
                  <input className="input-field" placeholder="Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A45C', display: 'block', marginBottom: 8 }}>Email — Quotes delivered here</label>
                  <input className="input-field" placeholder="jane@example.com" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A45C', display: 'block', marginBottom: 8 }}>Budget Range</label>
                  <select className="input-field" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} style={{ cursor: 'pointer' }}>
                    {['Under $2,000','$2,000 – $4,000','$4,000 – $7,000','$7,000 – $12,000','$12,000+'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A45C', display: 'block', marginBottom: 8 }}>Additional Notes <span style={{ color: 'rgba(245,241,232,0.35)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <textarea className="input-field" rows={3} placeholder="Neck profile, scale length, pickup preferences, timeline, anything else…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn-ghost" onClick={() => setStep('builder')} style={{ flex: 1, padding: 13 }}>← Back</button>
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting || !form.name || !form.email}
                  style={{ flex: 2, padding: 15, fontSize: '0.92rem', opacity: (!form.name || !form.email) ? 0.5 : 1 }}
                >
                  {submitting ? 'Sending…' : mode === 'broadcast' ? `Send to All Builders →` : `Send to ${selectedBuilders.length} Builder${selectedBuilders.length !== 1 ? 's' : ''} →`}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                {[['🔒','No commitment'], ['⚡','48hr response'], ['✓','Free to request']].map(([icon, text]) => (
                  <span key={text} style={{ fontSize: '0.7rem', color: 'rgba(245,241,232,0.35)' }}>{icon} {text}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(95,184,122,0.1)', border: '1px solid rgba(95,184,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5fb87a" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h3 style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1.4rem', marginBottom: 10 }}>Quote request sent!</h3>
              <p style={{ color: 'rgba(245,241,232,0.55)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 24, maxWidth: '34ch', margin: '0 auto 24px' }}>
                {mode === 'broadcast' ? `Your spec has been sent to ${BUILDERS.filter(b => b.verified).length} verified builders.` : `Your spec has been sent to ${selectedBuilders.length} builder${selectedBuilders.length !== 1 ? 's' : ''}.`} Expect responses at <strong style={{ color: '#F5F1E8' }}>{form.email}</strong> within 48 hours.
              </p>
              <div style={{ background: '#18181C', borderRadius: 14, padding: '14px 18px', marginBottom: 24, textAlign: 'left', fontSize: '0.8rem', color: 'rgba(245,241,232,0.55)', lineHeight: 1.7 }}>
                <strong style={{ color: '#F5F1E8', display: 'block', marginBottom: 4 }}>What happens next?</strong>
                Each builder reviews your spec and responds with their price, timeline, and approach. You compare, ask questions, and only commit when you're ready. No payment until you accept a quote.
              </div>
              <button className="btn-primary" onClick={onClose} style={{ width: '100%', padding: 14 }}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
