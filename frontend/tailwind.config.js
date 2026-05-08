/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },
      colors: {
        instagram: '#E1306C',
        facebook: '#1877F2',
        bg: {
          base: 'rgb(var(--bg-base) / <alpha-value>)',
          raised: 'rgb(var(--bg-raised) / <alpha-value>)',
          sunken: 'rgb(var(--bg-sunken) / <alpha-value>)',
          overlay: 'rgb(var(--bg-overlay) / <alpha-value>)',
        },
        border: {
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
        },
        fg: {
          DEFAULT: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          inverse: 'rgb(var(--text-inverse) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
          ring: 'rgb(var(--accent-ring) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
        },
        accent2: 'rgb(var(--accent-2) / <alpha-value>)',
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          soft: 'rgb(var(--danger-soft) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          soft: 'rgb(var(--warning-soft) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          soft: 'rgb(var(--success-soft) / <alpha-value>)',
        },
      },
      fontSize: {
        xs: ['clamp(0.75rem, 0.72rem + 0.15vw, 0.8125rem)', { lineHeight: '1.4' }],
        sm: ['clamp(0.875rem, 0.84rem + 0.18vw, 0.9375rem)', { lineHeight: '1.5' }],
        base: ['clamp(1rem, 0.96rem + 0.22vw, 1.0625rem)', { lineHeight: '1.55' }],
        lg: ['clamp(1.125rem, 1.05rem + 0.4vw, 1.25rem)', { lineHeight: '1.5' }],
        xl: ['clamp(1.25rem, 1.1rem + 0.7vw, 1.5rem)', { lineHeight: '1.4' }],
        '2xl': ['clamp(1.5rem, 1.25rem + 1.2vw, 1.875rem)', { lineHeight: '1.3' }],
        '3xl': ['clamp(1.875rem, 1.5rem + 1.7vw, 2.25rem)', { lineHeight: '1.2' }],
      },
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-l': 'env(safe-area-inset-left)',
        'safe-r': 'env(safe-area-inset-right)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow-color) / 0.06), 0 4px 12px rgb(var(--shadow-color) / 0.04)',
        pop: '0 4px 16px rgb(var(--shadow-color) / 0.10), 0 12px 32px rgb(var(--shadow-color) / 0.08)',
      },
    },
  },
  plugins: [],
};
