import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit:  ['var(--font-outfit)',  'sans-serif'],
        manrope: ['var(--font-manrope)', 'sans-serif'],
        inter:   ['var(--font-inter)',   'sans-serif'],
        lobster: ['var(--font-lobster)', 'cursive'],
      },
    },
  },
  plugins: [],
}

export default config
