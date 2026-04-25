import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#09090B',
        bg2:     '#111114',
        bg3:     '#18181C',
        bg4:     '#1e1e23',
        gold:    '#C9A45C',
        gold2:   '#E2C07A',
        text:    '#F5F1E8',
        muted:   'rgba(245,241,232,0.55)',
        muted2:  'rgba(245,241,232,0.35)',
        success: '#5fb87a',
      },
      fontFamily: {
        serif: ['"Bodoni Moda"', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.07)',
        gold:    'rgba(201,164,92,0.25)',
      },
      borderRadius: {
        card: '22px',
        xl2:  '28px',
        xl3:  '32px',
      },
      animation: {
        shimmer:  'shimmer 1.6s infinite linear',
        pulse2:   'pulse2 2s ease-in-out infinite',
        marquee:  'marquee 30s linear infinite',
        float:    'float 9s ease-in-out infinite',
        scanline: 'scanline 4s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-600px 0' },
          '100%': { backgroundPosition: '600px 0' },
        },
        pulse2: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%':     { opacity: '0.5', transform: 'scale(1.6)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-16px)' },
        },
        scanline: {
          '0%,100%': { top: '15%', opacity: '0' },
          '20%':     { opacity: '1' },
          '80%':     { opacity: '1' },
          '99%':     { top: '85%', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
export default config
