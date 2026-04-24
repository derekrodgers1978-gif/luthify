'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    setSent(true)
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 76px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="section-label" style={{ display: 'inline-block' }}>Welcome Back</div>
          <h1 style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '2.4rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 10 }}>Sign in to Luthify</h1>
          <p style={{ color: 'rgba(245,241,232,0.55)', fontSize: '0.9rem' }}>Access your builds, quotes, and builder dashboard</p>
        </div>

        <div style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: 32 }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(95,184,122,0.1)', border: '1px solid rgba(95,184,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5fb87a" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h3 style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '1.3rem', marginBottom: 8 }}>Check your email</h3>
              <p style={{ color: 'rgba(245,241,232,0.55)', fontSize: '0.85rem', lineHeight: 1.7 }}>We sent a sign-in link to <strong style={{ color: '#F5F1E8' }}>{email}</strong>. Click the link to continue.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A45C', display: 'block', marginBottom: 8 }}>Email</label>
                <input className="input-field" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A45C', display: 'block', marginBottom: 8 }}>Password</label>
                <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 12, background: 'linear-gradient(135deg,#E2C07A,#C9A45C)', color: '#09090B', fontWeight: 700, fontSize: '0.92rem', border: 'none', cursor: 'pointer', marginTop: 4, opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.82rem', color: 'rgba(245,241,232,0.45)' }}>
            Don't have an account?{' '}
            <Link href="/auth/signup" style={{ color: '#C9A45C', textDecoration: 'none', fontWeight: 500 }}>Sign up free →</Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.78rem', color: 'rgba(245,241,232,0.3)' }}>
          No account needed to{' '}
          <Link href="/configurator" style={{ color: 'rgba(201,164,92,0.7)', textDecoration: 'none' }}>design an instrument</Link>
          {' '}or{' '}
          <Link href="/builders" style={{ color: 'rgba(201,164,92,0.7)', textDecoration: 'none' }}>request quotes</Link>
        </div>
      </div>
    </div>
  )
}
