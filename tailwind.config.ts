import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0a0a0a',
          secondary: '#121212',
        },
        foreground: {
          DEFAULT: '#e5e5e5',
          muted: '#a3a3a3',
        },
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
        },
        dark: {
          100: '#404040',
          200: '#2d2d2d',
          300: '#1a1a1a',
          400: '#000000',
        },
      },
    },
  },
  plugins: [],
}
export default config

