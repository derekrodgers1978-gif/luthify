import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/layout/Nav'
import MobileCTABar from '@/components/layout/MobileCTABar'

export const metadata: Metadata = {
  title: 'Luthify — Buy, Build, or Sell Exceptional Instruments',
  description: 'The premium marketplace for handcrafted and custom stringed instruments. Request a quote from verified luthiers worldwide.',
  openGraph: {
    title: 'Luthify',
    description: 'Custom instruments, built your way.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div id="page-progress"
          style={{
            position: 'fixed', top: 0, left: 0, height: 2, width: '0%',
            background: 'linear-gradient(to right, #E2C07A, #C9A45C)',
            zIndex: 9999, transition: 'width 0.2s ease',
            boxShadow: '0 0 8px rgba(201,164,92,0.6)',
          }}
        />
        <Nav />
        <main>{children}</main>
        <MobileCTABar />
      </body>
    </html>
  )
}
