/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        // Executive Navy semantic tokens — each has a light/dark pair,
        // selected via the `dark:` variant (class strategy) at call sites.
        bg: {
          light: '#F7F5EF',
          dark: '#0A0F1C',
        },
        surface: {
          light: '#FFFFFF',
          dark: 'rgba(255,255,255,0.03)',
        },
        'surface-border': {
          light: '#E8E4D8',
          dark: 'rgba(255,255,255,0.08)',
        },
        input: {
          light: '#FBFAF6',
          dark: 'rgba(255,255,255,0.04)',
        },
        'input-border': {
          light: '#E8E4D8',
          dark: 'rgba(255,255,255,0.10)',
        },
        divider: {
          light: '#E8E4D8',
          dark: 'rgba(255,255,255,0.08)',
        },
        sidebar: {
          light: '#FFFFFF',
          dark: 'rgba(255,255,255,0.02)',
        },
        gold: {
          light: '#B8860B',
          dark: '#E8C877',
        },
        'gold-tint': {
          light: 'rgba(184,134,11,0.06)',
          dark: 'rgba(232,200,119,0.08)',
        },
        'gold-tint-strong': {
          light: 'rgba(184,134,11,0.10)',
          dark: 'rgba(232,200,119,0.12)',
        },
        'gold-tint-border': {
          light: 'rgba(184,134,11,0.3)',
          dark: 'rgba(232,200,119,0.35)',
        },
        body: {
          light: '#1E2438',
          dark: '#CBD5E1',
        },
        hi: {
          light: '#12162A',
          dark: '#F1F5F9',
        },
        muted: {
          light: '#8A8878',
          dark: '#5B6685',
        },
        'on-gold': {
          light: '#FFFFFF',
          dark: '#14151C',
        },
        secure: {
          light: '#4F7A5E',
          dark: '#6FCF97',
        },
        // Risk badge colors
        critical: {
          bg: { light: 'rgba(178,58,58,0.08)', dark: 'rgba(226,75,74,0.14)' },
          border: { light: 'rgba(178,58,58,0.3)', dark: 'rgba(226,75,74,0.4)' },
          text: { light: '#B23A3A', dark: '#F0827E' },
        },
        high: {
          bg: { light: 'rgba(184,134,11,0.10)', dark: 'rgba(232,200,119,0.14)' },
          border: { light: 'rgba(184,134,11,0.35)', dark: 'rgba(232,200,119,0.4)' },
          text: { light: '#8A6508', dark: '#E8C877' },
        },
        medium: {
          bg: { light: 'rgba(91,102,133,0.10)', dark: 'rgba(91,102,133,0.20)' },
          border: { light: 'rgba(91,102,133,0.3)', dark: 'rgba(91,102,133,0.45)' },
          text: { light: '#5B6685', dark: '#A6B0D1' },
        },
        low: {
          bg: { light: 'rgba(79,122,94,0.10)', dark: 'rgba(107,153,130,0.16)' },
          border: { light: 'rgba(79,122,94,0.3)', dark: 'rgba(107,153,130,0.4)' },
          text: { light: '#4F7A5E', dark: '#8FCBAA' },
        },
      },
      boxShadow: {
        card: '0 20px 44px -24px rgba(30,36,56,0.14)',
        'card-dark': '0 24px 60px -20px rgba(0,0,0,0.6)',
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
}
