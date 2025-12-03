import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        card: '#1a1a1a',
        'cyan-glow': '#00ffff',
        'magenta-glow': '#ff00ff',
        'lime-glow': '#00ff00',
        'amber-glow': '#ffbf00',
        'red-glow': '#ff4444',
      },
      boxShadow: {
        'neu-outer': '8px 8px 16px #0d0d0d, -8px -8px 16px #272727',
        'neu-inner': 'inset 6px 6px 12px #0d0d0d, inset -6px -6px 12px #272727',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config

