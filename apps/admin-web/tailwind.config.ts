import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Background layers
        bg: {
          base: '#0a0a0a',
          surface: '#111111',
          elevated: '#1a1a1a',
          overlay: '#222222',
        },
        // Borders
        border: {
          DEFAULT: '#2a2a2a',
          strong: '#3a3a3a',
        },
        // Primary accent — red
        primary: {
          DEFAULT: '#dc2626',
          hover: '#b91c1c',
          light: '#ef4444',
          muted: '#7f1d1d',
          foreground: '#ffffff',
        },
        // Text
        text: {
          primary: '#f5f5f5',
          secondary: '#a1a1aa',
          muted: '#71717a',
          disabled: '#52525b',
        },
        // Status badges
        status: {
          draft: '#78716c',
          active: '#22c55e',
          published: '#22c55e',
          uploading: '#3b82f6',
          processing: '#f59e0b',
          failed: '#ef4444',
          archived: '#6b7280',
          replaced: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.5)',
        glow: '0 0 20px rgba(220,38,38,0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
