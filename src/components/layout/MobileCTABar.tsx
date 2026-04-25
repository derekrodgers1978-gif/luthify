'use client'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import QuoteModal from '@/components/ui/QuoteModal'

export default function MobileCTABar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  if (pathname === '/configurator') return null

  return (
    <>
      <div className="md:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
        padding: '12px 16px', background: 'rgba(9,9,11,0.96)',
        backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', gap: 10,
      }}>
        <Link href="/configurator" className="btn-ghost" style={{ flex: 1, minHeight: 48, fontSize: '0.88rem' }}>
          Design Yours
        </Link>
        <button className="btn-primary" onClick={() => setOpen(true)} style={{ flex: 1.4, minHeight: 48, fontSize: '0.88rem' }}>
          Request a Quote
        </button>
      </div>
      <QuoteModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
