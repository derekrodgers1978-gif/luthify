import type { Metadata } from 'next'
import BuildersClient from './BuildersClient'

export const metadata: Metadata = {
  title: 'Builders — Luthify',
  description: 'Browse verified luthiers worldwide. Select your builder or request competitive quotes from all of them.',
}

export default function BuildersPage() {
  return <BuildersClient />
}
