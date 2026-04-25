import type { Metadata } from 'next'
import ConfiguratorClient from './ConfiguratorClient'

export const metadata: Metadata = {
  title: 'Configurator — Luthify',
  description: 'Design your dream instrument in real-time. Choose woods, finishes, hardware — then request quotes from verified luthiers.',
}

export default function ConfiguratorPage() {
  return <ConfiguratorClient />
}
