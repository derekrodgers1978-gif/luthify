'use client'
import Link from 'next/link'
import { useState } from 'react'
import QuoteModal from '@/components/ui/QuoteModal'

export default function Nav() {
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav className="site-nav">
        <div className="site-nav-inner">
          <Link href="/" className="site-nav-logo">
            <img src="/luthify_black_logo.webp" alt="Luthify" style={{ height: 46, width: 'auto', display: 'block' }} />
          </Link>

          {/* Desktop links */}
          <div className="site-nav-links">
            <Link href="/configurator" className="site-nav-link">Configurator</Link>
            <Link href="/builders" className="site-nav-link">Builders</Link>
            <Link href="/auth/login" className="site-nav-link">Sign In</Link>
          </div>

          <button className="btn-primary site-nav-cta" onClick={() => setQuoteOpen(true)}>
            Request a Quote
          </button>

          {/* Mobile hamburger */}
          <button className="site-nav-menu-button" onClick={() => setMenuOpen(m => !m)} aria-label="Toggle menu">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8">
              {menuOpen ? <path d="M4 4l14 14M18 4L4 18"/> : <><path d="M3 6h16M3 11h16M3 16h16"/></>}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="site-mobile-menu">
            <Link href="/configurator" className="site-mobile-link" onClick={() => setMenuOpen(false)}>Configurator</Link>
            <Link href="/builders" className="site-mobile-link" onClick={() => setMenuOpen(false)}>Builders</Link>
            <Link href="/auth/login" className="site-mobile-link" onClick={() => setMenuOpen(false)}>Sign In</Link>
            <button className="btn-primary" onClick={() => { setQuoteOpen(true); setMenuOpen(false) }} style={{ width: '100%' }}>Request a Quote</button>
          </div>
        )}
      </nav>

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </>
  )
}
