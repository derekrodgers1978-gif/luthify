import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  transpilePackages: ['three'],
  webpack: (config) => {
    // Allow Three.js shader imports
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader'],
    })
    return config
  },
}

export default nextConfig
