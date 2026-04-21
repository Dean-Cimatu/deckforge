import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#1a1a1a',
          muted: '#6b7280',
        },
        paper: {
          DEFAULT: '#fafaf8',
          dark: '#f0efec',
        },
        amber: {
          DEFAULT: '#f59e0b',
          hover: '#d97706',
        },
        surface: '#ffffff',
        border: '#e5e5e3',
      },
    },
  },
  plugins: [typography],
} satisfies Config;
