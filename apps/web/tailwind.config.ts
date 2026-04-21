import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'ui-serif', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bg: 'hsl(var(--bg))',
        surface: 'hsl(var(--surface))',
        fg: 'hsl(var(--fg))',
        muted: 'hsl(var(--muted))',
        accent: 'hsl(var(--accent))',
        success: 'hsl(var(--success))',
        warn: 'hsl(var(--warn))',
        border: 'hsl(var(--border))',
      },
      borderColor: {
        DEFAULT: 'hsl(var(--border))',
      },
      keyframes: {
        'card-flip': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
      },
      animation: {
        'card-flip': 'card-flip 300ms ease-out forwards',
      },
      transitionDuration: {
        press: '100ms',
        tab: '150ms',
        flip: '300ms',
      },
    },
  },
  plugins: [typography],
} satisfies Config;
