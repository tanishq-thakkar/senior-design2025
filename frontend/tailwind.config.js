/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0b1120',
        surface: '#111a2b',
        accent: '#5eead4',
        accentMuted: '#164e63',
        border: '#1f2937',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        destructive: '#f87171',
      },
      boxShadow: {
        card: '0 10px 25px -15px rgba(15, 23, 42, 0.8)',
      },
      animation: {
        pulseSlow: 'pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

