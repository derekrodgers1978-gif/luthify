'use client'
import { useState } from 'react'
import Link from 'next/link'

type Role = 'buyer' | 'builder'

export default function SignupPage() {
  const [role, setRole] = useState<Role | null>(null)
  const [step, setStep] = useState<'role' | 'form' | 'done'>('role')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 1400))
    setLoading(false)
    setStep('done')
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 76px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="section-label" style={{ display: 'inline-block' }}>Join Luthify</div>
          <h1 style={{ fontFamily: "'Bodoni Moda',serif", fontSize: '2.4rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 10 }}>
            {step === 'role' ? 'Who are you?' : step === 'form' ? `Join as a ${role}` : 'Welcome!'}
          </h1>
          <p style={{ color: 'rgba(245,241,232,0.55)', fontSize: '0.9rem' }}>
            {step === 'role' && 'Choose your path. You can always do both later.'}
            {step === 'form' && 'Free to join. No credit card required.'}
            {step === 'done' && 'Check your email to confirm your account.'}
          </p>
        </div>

        <div style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: 32 }}>

          {/* Step 1: Role */}
          {step === 'role' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {([
                { id: 'buyer' as Role, title: 'I want to buy or commission an instrument', sub: 'Browse listings, design in the configurator, request quotes from verified builders', icon: '🎸' },
                { id: 'builder' as Role, title: "I'm a luthier and want to sell my work", sub: 'List completed instruments, accept commissions, receive quote requests from buyers worldwide', icon: '🔨' },
              ]).map(opt => (
                <button key={opt.id} onClick={() => { setRole(opt.id); setStep('form') }} style={{ padding: '20px 22px', borderRadius: 16, textAlign: 'left', background: '#18181C', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: 16, alignItems: 'flex-start' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,164,92,0.3)'; e.currentTarget.style.background = 'rgba(201,164,92,0.04)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#18181C' }}>
                  <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 2 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 6 }}>{opt.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(245,241,232,0.5)', lineHeight: 1.6 }}>{opt.sub}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A45C" strokeWidth="2" style={{ flexShrink: 0, marginTop: 4 }}><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Form */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <button type="button" onClick={() => setStep('role')} style={{ background: 'none', border: 'none', color: 'rgba(245,241,232,0.4)', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left', marginBottom: 4 }}>← Back</button>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A45C', display: 'block', marginBottom: 8 }}>
                  {role === 'builder' ? 'Full Name / Shop Name' : 'Your Name'}
                </label>
                <input className="input-field" placeholder={role === 'builder' ? 'e.g. Smith Custom Guitars' : 'Jane Smith'} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A45C', display: 'block', marginBottom: 8 }}>Email</label>
                <input className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A45C', display: 'block', marginBottom: 8 }}>Password</label>
                <input className="input-field" type="password" placeholder="Min. 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} minLength={8} required />
              </div>
              {role === 'builder' && (
                <div style={{ background: 'rgba(201,164,92,0.05)', border: '1px solid rgba(201,164,92,0.15)', borderRadius: 12, padding: '12px 16px', fontSize: '0.78rem', color: 'rgba(245,241,232,0.55)', lineHeight: 1.6 }}>
                  🎉 <strong style={{ color: '#F5F1E8' }}>Founding builder spot</strong> — free to join, only 5% fee when you sell. Stripe Connect payout setup after signup.
                </div>
              )}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 12, background: 'linear-gradient(135deg,#E2C07A,#C9A45C)', color: '#09090B', fontWeight: 700, fontSize: '0.92rem', border: 'none', cursor: 'pointer', marginTop: 4, opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}>
                {loading ? 'Creating account…' : `Create ${role === 'builder' ? 'Builder' : ''} Account →`}
              </button>
            </form>
          )}

          {/* Done */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(95,184,122,0.1)', border: '1px solid rgba(95,184,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5fb87a" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <p style={{ color: 'rgba(245,241,232,0.6)', fontSize: '0.85rem', lineHeight: 1.7 }}>Account created for <strong style={{ color: '#F5F1E8' }}>{form.email}</strong>. Check your inbox to confirm.</p>
              <Link href="/configurator" style={{ display: 'inline-block', marginTop: 20, padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#E2C07A,#C9A45C)', color: '#09090B', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}>
                {role === 'buyer' ? 'Start Designing →' : 'Go to Dashboard →'}
              </Link>
            </div>
          )}

          {step !== 'done' && (
            <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.82rem', color: 'rgba(245,241,232,0.45)' }}>
              Already have an account?{' '}
              <Link href="/auth/login" style={{ color: '#C9A45C', textDecoration: 'none', fontWeight: 500 }}>Sign in →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
