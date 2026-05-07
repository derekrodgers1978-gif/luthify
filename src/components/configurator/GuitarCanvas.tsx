'use client'

import { useState } from 'react'

type ViewMode = 'standard' | 'detail'
type ModularGuitarModule = 'BODY' | 'NECK' | 'FRETBOARD' | 'PICKGUARD' | 'HARDWARE' | 'PICKUPS'

const MODULE_SLOTS: ModularGuitarModule[] = [
  'BODY',
  'NECK',
  'FRETBOARD',
  'PICKGUARD',
  'HARDWARE',
  'PICKUPS',
]

function ModularBuilderPlaceholder({ view }: { view: ViewMode }) {
  return (
    <div
      aria-live="polite"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 8,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
        padding: 24,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: 560,
          transform: view === 'detail' ? 'scale(1.04)' : 'scale(1)',
          transition: 'transform 220ms ease',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "'Bodoni Moda',serif",
            fontSize: 'clamp(1.6rem, 2.8vw, 2.85rem)',
            lineHeight: 1.04,
            color: '#F5F1E8',
            textShadow: '0 12px 42px rgba(0,0,0,0.6)',
          }}
        >
          Modular guitar builder coming soon
        </p>
        <div
          style={{
            marginTop: 22,
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {MODULE_SLOTS.map(slot => (
            <span
              key={slot}
              style={{
                border: '1px solid rgba(201,164,92,0.24)',
                background: 'rgba(9,9,11,0.62)',
                color: '#C9A45C',
                borderRadius: 999,
                padding: '7px 11px',
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              {slot}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GuitarCanvas() {
  const [view, setView] = useState<ViewMode>('standard')

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        role="img"
        aria-label="Modular guitar builder preview"
        style={{
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 50% 45%, #17151a 0%, #09090B 62%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '18% 16%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,164,92,0.16) 0%, rgba(201,164,92,0.04) 42%, rgba(201,164,92,0) 70%)',
            filter: 'blur(10px)',
            opacity: 0.72,
          }}
        />
        <ModularBuilderPlaceholder view={view} />
      </div>

      <div style={{ position: 'absolute', left: 20, top: 64, zIndex: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          ['standard', 'Reset'],
          ['detail', 'Zoom'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setView(id as ViewMode)} style={{ border: '1px solid rgba(201,164,92,0.24)', background: view === id ? 'rgba(201,164,92,0.14)' : 'rgba(9,9,11,0.68)', color: '#C9A45C', borderRadius: 999, padding: '7px 12px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
