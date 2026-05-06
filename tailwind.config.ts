import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      background: '#0D1F2D',
      'bg-secondary': '#152A3A',
      'bg-tertiary': '#1A3A4D',
      accent: '#06CFF5',
      'accent-dark': '#0099AA',
      warning: '#FFB800',
      success: '#00D084',
      danger: '#FF6B6B',
      'text-primary': '#FFFFFF',
      'text-secondary': '#A8B8C8',
      'card-bg': '#1A3F52',
      white: '#FFFFFF',
      black: '#000000',
    },
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['var(--font-space-grotesk)', 'Space Grotesk', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(6, 207, 245, 0.3)',
        'glow-sm': '0 0 10px rgba(6, 207, 245, 0.2)',
      },
      backdropFilter: {
        glass: 'blur(10px)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}

export default config
