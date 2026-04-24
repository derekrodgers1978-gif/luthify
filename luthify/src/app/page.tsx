'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import QuoteModal from '@/components/ui/QuoteModal'
import { BUILDERS } from '@/lib/builders-data'

const MARQUEE_ITEMS = ['Handbuilt Electric Guitars','Master Grade Violins','Custom Acoustic Builds','Boutique Bass Guitars','Hawaiian Koa Ukuleles','Concert Cellos','F-Style Mandolins','Classical Guitars','Archtop Hollowbody','7-String Custom']

export default function HomePage() {
  const [quoteOpen, setQuoteOpen] = useState(false)
  const revealRefs = useRef<HTMLElement[]>([])

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add('visible'); obs.unobserve(e.target) } })
    }, { threshold: 0.06 })
    revealRefs.current.forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const addReveal = (el: HTMLElement | null) => { if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el) }

  return (
    <>
      {/* ── HERO ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 'calc(100vh - 76px)', width: 'min(1280px, calc(100% - 48px))', margin: '0 auto', alignItems: 'center', gap: 0 }}>
        <div ref={addReveal} className="reveal" style={{ paddingRight: 60, paddingTop: 80, paddingBottom: 80 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 999, background: 'rgba(201,164,92,0.08)', border: '1px solid rgba(201,164,92,0.18)', color: '#C9A45C', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 36 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A45C', boxShadow: '0 0 8px #C9A45C', animation: 'pulse2 2s infinite' }} />
            Free to join · Pay only when you sell
          </div>

          <h1 style={{ fontFamily: "'Bodoni Moda',serif", fontSize: 'clamp(3.2rem,4.8vw,5.2rem)', lineHeight: 0.95, letterSpacing: '-0.02em', marginBottom: 28 }}>
            Custom<br />instruments,<br /><em style={{ color: '#C9A45C', fontStyle: 'normal' }}>built your way.</em>
          </h1>

          <p style={{ fontSize: '1.05rem', lineHeight: 1.75, color: 'rgba(245,241,232,0.55)', marginBottom: 44, maxWidth: '30rem', fontWeight: 300 }}>
            Design your dream instrument. Then request quotes from verified luthiers worldwide. Founded by real instrument sellers — including the team behind <strong style={{ color: '#C9A45C', fontWeight: 500 }}>Tsunami Guitars</strong>{' '}
            <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 8, padding: '3px 10px', borderRadius: 999, background: 'rgba(201,164,92,0.08)', border: '1px solid rgba(201,164,92,0.2)', color: '#C9A45C', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', verticalAlign: 'middle' }}>Founding Platform</span>.
          </p>

          <div style={{ display: 'flex', gap: 14, marginBottom: 44, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => setQuoteOpen(true)} style={{ fontSize: '0.95rem', padding: '14px 28px' }}>
              Request a Quote — Free
            </button>
            <Link href="/configurator" className="btn-ghost" style={{ fontSize: '0.95rem', padding: '14px 28px' }}>
              Design Your Instrument →
            </Link>
          </div>

          {/* Social proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex' }}>
              {['JM','AR','TN','MC','WA'].map((av, i) => (
                <div key={av} style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#E2C07A,#C9A45C)', border: '2px solid #09090B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 700, color: '#09090B', marginLeft: i === 0 ? 0 : -8 }}>{av}</div>
              ))}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'rgba(245,241,232,0.55)' }}>47 builders already selling · Join them free</span>
          </div>

          <div style={{ paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {['Free builder listings','Secure checkout','Custom commissions','No monthly fees'].map(note => (
              <span key={note} style={{ color: 'rgba(245,241,232,0.55)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#C9A45C', flexShrink: 0 }} />{note}
              </span>
            ))}
          </div>
        </div>

        {/* Hero right — watermark */}
        <div style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)', width: 460, height: 680, background: 'radial-gradient(ellipse at 50% 85%, rgba(201,164,92,0.18) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, rgba(201,164,92,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 2 }} />
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(680px, 88%)', opacity: 0.052, pointerEvents: 'none', zIndex: 1 }}>
            <img src="/luthify-logo.webp" alt="" style={{ width: '100%', height: 'auto', display: 'block', mixBlendMode: 'lighten', filter: 'sepia(1) saturate(2) hue-rotate(4deg) brightness(0.8)' }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 55%, rgba(201,164,92,0.09) 0%, transparent 58%), radial-gradient(ellipse at 20% 50%, rgba(9,9,11,0.6) 0%, transparent 45%)', pointerEvents: 'none', zIndex: 4 }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 140, background: 'linear-gradient(to right, #09090B, transparent)', pointerEvents: 'none', zIndex: 5 }} />
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div style={{ padding: '22px 0', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(to right, rgba(201,164,92,0.03), rgba(201,164,92,0.06), rgba(201,164,92,0.03))' }}>
        <div style={{ display: 'flex', width: 'max-content', animation: 'marquee 30s linear infinite' }}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '0 40px', whiteSpace: 'nowrap', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,241,232,0.55)' }}>
              <strong style={{ color: '#C9A45C' }}>{item}</strong>
              <span style={{ color: '#C9A45C', opacity: 0.4, fontSize: '0.6rem' }}>◆</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── TRUST ── */}
      <div style={{ width: 'min(1280px, calc(100% - 48px))', margin: '0 auto', padding: '60px 0' }}>
        <div ref={addReveal} className="reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', background: '#111114', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, overflow: 'hidden' }}>
          {[
            { icon: '★', label: 'Handcrafted Quality' },
            { icon: '✦', label: 'Verified Builders' },
            { icon: '🔒', label: 'Secure Checkout' },
            { icon: '✈', label: 'Global Shipping' },
            { icon: '✏', label: 'Custom Orders' },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '28px 16px', borderRight: i < 4 ? '1px solid rgba(255,255,255,0.07)' : 'none', transition: 'background 0.3s', cursor: 'default' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,164,92,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(201,164,92,0.08)', border: '1px solid rgba(201,164,92,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1rem', color: '#C9A45C' }}>{item.icon}</div>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 500, color: 'rgba(245,241,232,0.55)' }}>{item.label}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '100px 0', width: 'min(1280px, calc(100% - 48px))', margin: '0 auto' }}>
        <div ref={addReveal} className="reveal" style={{ marginBottom: 64 }}>
          <div className="section-label">How It Works</div>
          <h2 style={{ fontFamily: "'Bodoni Moda',serif", fontSize: 'clamp(2.4rem,3.8vw,3.8rem)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 16 }}>Three steps to your<br />dream instrument.</h2>
          <p style={{ color: 'rgba(245,241,232,0.55)', fontSize: '1rem', lineHeight: 1.75, maxWidth: '40rem' }}>No guesswork. No commitment until you're ready. Just your spec, the right builder, and a clear process.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {[
            { n: '1', title: 'Design your instrument', body: 'Use the 3D configurator to choose your body shape, woods, finish, hardware, and components. Watch the price update live.', cta: 'Open Configurator →', href: '/configurator' },
            { n: '2', title: 'Request quotes', body: 'Send your spec to one builder you trust, or broadcast to all verified luthiers and receive competitive quotes within 48 hours.', cta: 'Request a Quote →', onClick: true },
            { n: '3', title: 'Choose and commit', body: 'Compare builder responses — price, timeline, and approach. Accept the quote that fits. Deposit held in escrow until you approve the build.', cta: 'Browse Builders →', href: '/builders' },
          ].map((step, i) => (
            <div key={i} ref={addReveal} className="reveal" style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: 36, position: 'relative', overflow: 'hidden', transition: 'all 0.25s', cursor: 'default' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,164,92,0.2)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.transform = '' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#E2C07A,#C9A45C)', color: '#09090B', fontWeight: 700, display: 'grid', placeItems: 'center', marginBottom: 22, fontSize: '0.85rem' }}>{step.n}</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>{step.title}</h3>
              <p style={{ color: 'rgba(245,241,232,0.55)', lineHeight: 1.7, fontSize: '0.9rem', fontWeight: 300, marginBottom: 20 }}>{step.body}</p>
              {step.onClick ? (
                <button onClick={() => setQuoteOpen(true)} style={{ color: '#C9A45C', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 500, padding: 0 }}>{step.cta}</button>
              ) : (
                <Link href={step.href!} style={{ color: '#C9A45C', textDecoration: 'none', fontSize: '0.84rem', fontWeight: 500 }}>{step.cta}</Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED BUILDERS ── */}
      <section style={{ padding: '80px 0 120px', width: 'min(1280px, calc(100% - 48px))', margin: '0 auto' }}>
        <div ref={addReveal} className="reveal" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="section-label">Verified Builders</div>
            <h2 style={{ fontFamily: "'Bodoni Moda',serif", fontSize: 'clamp(2rem,3vw,3rem)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>Meet the makers.</h2>
          </div>
          <Link href="/builders" style={{ color: '#C9A45C', fontSize: '0.88rem', fontWeight: 500, textDecoration: 'none' }}>All builders →</Link>
        </div>
        <div ref={addReveal} className="reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {BUILDERS.slice(0, 4).map(b => (
            <div key={b.id} style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px', transition: 'all 0.25s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,164,92,0.2)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.transform = '' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#E2C07A,#C9A45C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#09090B', flexShrink: 0 }}>{b.avatar}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{b.shopName}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(245,241,232,0.45)' }}>{b.location} · {b.rating}★</div>
                </div>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'rgba(245,241,232,0.5)', lineHeight: 1.55, fontWeight: 300, marginBottom: 14 }}>{b.speciality} · Avg {b.avgBuildWeeks}wk build</p>
              <button onClick={() => setQuoteOpen(true)} style={{ fontSize: '0.76rem', color: '#C9A45C', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}>Request Quote →</button>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '0 0 120px', width: 'min(1280px, calc(100% - 48px))', margin: '0 auto' }}>
        <div ref={addReveal} className="reveal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, padding: '64px 72px', borderRadius: 32, background: 'radial-gradient(ellipse at 20% 50%, rgba(201,164,92,0.08), transparent 55%), #111114', border: '1px solid rgba(201,164,92,0.18)', flexWrap: 'wrap' }}>
          <div>
            <div className="section-label">Get Started</div>
            <h2 style={{ fontFamily: "'Bodoni Moda',serif", fontSize: 'clamp(2rem,3vw,3rem)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 14 }}>Your first quote<br />takes 2 minutes.</h2>
            <p style={{ color: 'rgba(245,241,232,0.55)', lineHeight: 1.7, maxWidth: '38ch', fontWeight: 300 }}>Design your spec, send it to verified builders, and receive competitive quotes. No payment. No commitment. Just your dream instrument getting closer.</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, background: 'rgba(95,184,122,0.06)', border: '1px solid rgba(95,184,122,0.2)', borderRadius: 999, padding: '5px 12px', fontSize: '0.72rem', color: '#5fb87a', fontWeight: 500 }}>
              ✓ Free forever · No card needed to start
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, flexShrink: 0, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => setQuoteOpen(true)} style={{ padding: '14px 28px', fontSize: '0.95rem' }}>Request a Quote →</button>
            <Link href="/configurator" className="btn-ghost" style={{ padding: '14px 28px', fontSize: '0.95rem' }}>Design First</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '56px 0 40px' }}>
        <div style={{ width: 'min(1280px, calc(100% - 48px))', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 48, marginBottom: 48, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1.3rem', fontWeight: 700, marginBottom: 12, background: 'linear-gradient(135deg,#F5F1E8,#C9A45C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Luthify</div>
              <p style={{ color: 'rgba(245,241,232,0.55)', fontSize: '0.88rem', lineHeight: 1.7, fontWeight: 300 }}>The premium marketplace for handcrafted and custom stringed instruments. A Tsunami Guitars initiative.</p>
            </div>
            {[
              { title: 'Product', links: [['Configurator','/configurator'],['Builders','/builders'],['How It Works','#how-it-works']] },
              { title: 'Builders', links: [['Start Selling','/auth/signup'],['Builder Dashboard','#'],['Get Verified','#']] },
              { title: 'Support', links: [['Help Center','#'],['Contact Us','#'],['Privacy Policy','#']] },
            ].map(col => (
              <div key={col.title}>
                <h4 style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A45C', marginBottom: 18 }}>{col.title}</h4>
                {col.links.map(([label, href]) => (
                  <Link key={label} href={href} style={{ display: 'block', color: 'rgba(245,241,232,0.55)', marginBottom: 12, fontSize: '0.88rem', fontWeight: 300, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#F5F1E8')} onMouseLeave={e => (e.currentTarget.style.color = '')}>{label}</Link>
                ))}
              </div>
            ))}
          </div>
          <div style={{ paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', color: 'rgba(245,241,232,0.3)', fontSize: '0.82rem', flexWrap: 'wrap', gap: 12 }}>
            <span>© 2025 Luthify. All rights reserved.</span>
            <span>Your Tone. Custom Made.</span>
          </div>
        </div>
      </footer>

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />

      <style>{`
        @media (max-width: 1024px) {
          section > div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          section > div[style*="grid-template-columns: repeat(3,1fr)"] { grid-template-columns: 1fr !important; }
          section > div[style*="grid-template-columns: repeat(5,1fr)"] { grid-template-columns: repeat(3,1fr) !important; }
          footer div[style*="grid-template-columns"] { grid-template-columns: 1fr 1fr !important; }
        }
        @keyframes pulse2 { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.6)} }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>
    </>
  )
}
