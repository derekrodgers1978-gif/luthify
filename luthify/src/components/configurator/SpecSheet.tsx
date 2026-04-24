'use client'
import { useConfigStore } from '@/store/configStore'
import { CONFIG_OPTION_GROUPS } from '@/lib/configurator-options'

export default function SpecSheet() {
  const s = useConfigStore()
  const rows = CONFIG_OPTION_GROUPS.map(([key, label, options]) => [
    label,
    options.find(o => o.id === s[key])?.label ?? s[key],
  ])

  return (
    <div className="hidden sm:block" style={{
      position: 'absolute', bottom: 24, left: 20, zIndex: 10,
      background: 'rgba(9,9,11,0.82)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: '14px 18px', minWidth: 240,
    }}>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(201,164,92,0.7)', marginBottom: 10 }}>Spec Sheet</div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(245,241,232,0.4)', fontWeight: 400 }}>{label}</span>
          <span style={{ fontSize: '0.72rem', color: '#F5F1E8', fontWeight: 500, fontFamily: 'monospace' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}
