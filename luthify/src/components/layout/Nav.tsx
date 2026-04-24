'use client'
import Link from 'next/link'
import { useState } from 'react'
import QuoteModal from '@/components/ui/QuoteModal'

export default function Nav() {
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(9,9,11,0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ width: 'min(1280px, calc(100% - 48px))', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 76, gap: 24 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Bodoni Moda', serif", fontSize: '1.4rem', fontWeight: 700, background: 'linear-gradient(135deg, #F5F1E8, #C9A45C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Luthify</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex" style={{ gap: 36, color: 'rgba(245,241,232,0.55)', fontSize: '0.9rem', fontWeight: 400 }}>
            <Link href="/configurator" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#F5F1E8')} onMouseLeave={e => (e.currentTarget.style.color = '')}>Configurator</Link>
            <Link href="/builders" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#F5F1E8')} onMouseLeave={e => (e.currentTarget.style.color = '')}>Builders</Link>
            <Link href="/auth/login" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#F5F1E8')} onMouseLeave={e => (e.currentTarget.style.color = '')}>Sign In</Link>
          </div>

          <button className="btn-primary hidden md:inline-flex" onClick={() => setQuoteOpen(true)} style={{ fontSize: '0.88rem' }}>
            Request a Quote
          </button>

          {/* Mobile hamburger */}
          <button className="md:hidden" onClick={() => setMenuOpen(m => !m)} style={{ background: 'none', border: 'none', color: '#F5F1E8', cursor: 'pointer', padding: 8 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8">
              {menuOpen ? <path d="M4 4l14 14M18 4L4 18"/> : <><path d="M3 6h16M3 11h16M3 16h16"/></>}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: '#09090B', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Link href="/configurator" style={{ color: 'rgba(245,241,232,0.7)', textDecoration: 'none', fontSize: '0.95rem' }} onClick={() => setMenuOpen(false)}>Configurator</Link>
            <Link href="/builders" style={{ color: 'rgba(245,241,232,0.7)', textDecoration: 'none', fontSize: '0.95rem' }} onClick={() => setMenuOpen(false)}>Builders</Link>
            <Link href="/auth/login" style={{ color: 'rgba(245,241,232,0.7)', textDecoration: 'none', fontSize: '0.95rem' }} onClick={() => setMenuOpen(false)}>Sign In</Link>
            <button className="btn-primary" onClick={() => { setQuoteOpen(true); setMenuOpen(false) }} style={{ width: '100%' }}>Request a Quote</button>
          </div>
        )}
      </nav>

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </>
  )
}
