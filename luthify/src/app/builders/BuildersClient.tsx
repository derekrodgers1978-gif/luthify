'use client'
import { useState } from 'react'
import { BUILDERS } from '@/lib/builders-data'
import QuoteModal from '@/components/ui/QuoteModal'
import type { Builder } from '@/types'

const SPECIALITIES = ['All', 'Electric & Semi-Hollow', 'Acoustic Guitars', 'Orchestral & Acoustic', 'Ukuleles', 'Hollowbody & Archtop']

export default function BuildersClient() {
  const [filter, setFilter] = useState('All')
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [selectedBuilder, setSelectedBuilder] = useState<string | undefined>()

  const filtered = filter === 'All' ? BUILDERS : BUILDERS.filter(b => b.speciality === filter)

  const openQuote = (id?: string) => {
    setSelectedBuilder(id)
    setQuoteOpen(true)
  }

  return (
    <div style={{ width: 'min(1280px, calc(100% - 48px))', margin: '0 auto', padding: '80px 0 120px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <div className="section-label" style={{ display: 'inline-block' }}>Verified Builders</div>
        <h1 style={{ fontFamily: "'Bodoni Moda',serif", fontSize: 'clamp(2.4rem,4vw,3.8rem)', fontWeight: 700, lineHeight: 0.95, letterSpacing: '-0.02em', marginBottom: 16 }}>
          The world's finest<br />luthiers, in one place.
        </h1>
        <p style={{ color: 'rgba(245,241,232,0.55)', fontSize: '1rem', lineHeight: 1.75, maxWidth: '38rem', margin: '0 auto 36px' }}>
          Every builder on Luthify is verified. Browse by speciality, review average build times, and request a quote from one or all of them.
        </p>
        <button onClick={() => openQuote()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14, background: 'linear-gradient(135deg,#E2C07A,#C9A45C)', color: '#09090B', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer', boxShadow: '0 8px 32px rgba(201,164,92,0.3)', transition: 'all 0.2s' }}>
          Request Quotes from All Builders →
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40, justifyContent: 'center' }}>
        {SPECIALITIES.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '8px 18px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', background: filter === s ? 'rgba(201,164,92,0.08)' : 'transparent', border: `1px solid ${filter === s ? '#C9A45C' : 'rgba(255,255,255,0.07)'}`, color: filter === s ? '#C9A45C' : 'rgba(245,241,232,0.55)', transition: 'all 0.15s' }}>
            {s}
          </button>
        ))}
      </div>
      {/* Builder grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {filtered.map(b => <BuilderCard key={b.id} builder={b} onQuote={() => openQuote(b.id)} />)}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(245,241,232,0.4)' }}>
          <p style={{ fontSize: '1rem' }}>No builders match this filter yet.</p>
          <button onClick={() => setFilter('All')} style={{ marginTop: 16, color: '#C9A45C', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>View all builders →</button>
        </div>
      )}

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} preselectedBuilderId={selectedBuilder} />
    </div>
  )
}

function BuilderCard({ builder: b, onQuote }: { builder: Builder; onQuote: () => void }) {
  return (
    <div style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, overflow: 'hidden', transition: 'all 0.3s', cursor: 'default' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,164,92,0.2)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(0,0,0,0.3)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}>
      {/* Card top */}
      <div style={{ padding: '28px 28px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#E2C07A,#C9A45C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem', color: '#09090B', flexShrink: 0 }}>{b.avatar}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '0.97rem', fontWeight: 600 }}>{b.shopName}</span>
            {b.verified && <span style={{ fontSize: '0.6rem', color: '#C9A45C', background: 'rgba(201,164,92,0.08)', border: '1px solid rgba(201,164,92,0.18)', borderRadius: 999, padding: '1px 7px', fontWeight: 600 }}>✦ Verified</span>}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(245,241,232,0.5)' }}>{b.speciality} · {b.location}</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          [b.rating + '★', 'Rating'],
          [b.avgBuildWeeks + ' wks', 'Avg Build'],
          [b.listingCount + '', 'Listings'],
        ].map(([val, label]) => (
          <div key={label} style={{ textAlign: 'center', padding: '14px 8px', borderRight: label !== 'Listings' ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <div style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1rem', fontWeight: 700, color: '#C9A45C', marginBottom: 2 }}>{val}</div>
            <div style={{ fontSize: '0.66rem', color: 'rgba(245,241,232,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Bio */}
      <div style={{ padding: '18px 28px 0' }}>
        <p style={{ fontSize: '0.84rem', color: 'rgba(245,241,232,0.6)', lineHeight: 1.65, fontWeight: 300 }}>{b.bio}</p>
      </div>

      {/* CTA */}
      <div style={{ padding: '16px 28px 24px' }}>
        <button onClick={onQuote} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'rgba(201,164,92,0.08)', border: '1px solid rgba(201,164,92,0.2)', color: '#C9A45C', fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.02em' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,164,92,0.15)'; e.currentTarget.style.borderColor = 'rgba(201,164,92,0.4)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,164,92,0.08)'; e.currentTarget.style.borderColor = 'rgba(201,164,92,0.2)' }}>
          Request a Quote →
        </button>
      </div>
    </div>
  )
}
