/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        canvas: {
          light: '#F5F7FA',
          dark: '#0B1120',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#111C2E',
          dark2: '#18243A',
        },
        ink: {
          light: '#111827',
          muted: '#64748B',
          dark: '#F8FAFC',
          darkMuted: '#94A3B8',
        },
        brand: {
          DEFAULT: '#315CF5',
          dark: '#6D8AFF',
        },
        income: {
          DEFAULT: '#059669',
          dark: '#34D399',
        },
        expense: {
          DEFAULT: '#E5484D',
          dark: '#FB7185',
        },
        alert: {
          DEFAULT: '#F59E0B',
        },
        stroke: {
          light: '#E8EDF3',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 24, 39, 0.04), 0 4px 12px rgba(17, 24, 39, 0.03)',
        'card-hover': '0 4px 16px rgba(17, 24, 39, 0.07), 0 1px 3px rgba(17, 24, 39, 0.04)',
      },
    },
  },
  plugins: [],
}
