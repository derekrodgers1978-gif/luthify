'use client'
import { useConfigStore } from '@/store/configStore'
import { CONFIG_OPTION_GROUPS } from '@/lib/configurator-options'

export default function SpecSheet() {
  const s = useConfigStore()
  const rows = CONFIG_OPTION_GROUPS
    .filter(([key]) => key !== 'binding' || s.shape === 'single-cut')
    .map(([key, label, options]) => [
      label,
      options.find(o => o.id === s[key])?.label ?? s[key],
    ])

  return (
    <div className="hidden sm:block" style={{
      position: 'absolute', bottom: 24, left: 20, zIndex: 10,
      background: 'linear-gradient(180deg, rgba(17,17,20,0.92), rgba(9,9,11,0.88))', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(201,164,92,0.16)',
      borderRadius: 18, padding: '16px 18px', minWidth: 270,
      boxShadow: '0 18px 48px rgba(0,0,0,0.32)',
    }}>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A45C', marginBottom: 12 }}>Spec Sheet</div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'grid', gridTemplateColumns: '96px 1fr', alignItems: 'baseline', gap: 18, marginBottom: 6 }}>
          <span style={{ fontSize: '0.68rem', color: 'rgba(245,241,232,0.42)', fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: '0.72rem', color: '#F5F1E8', fontWeight: 600, textAlign: 'right', letterSpacing: '0.01em' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}
