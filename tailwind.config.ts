import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#070710',
        surface: '#0f0f1e',
        card:    '#141428',
        'card-hover': '#1a1a32',
        border:  '#1e1e38',
        'border-light': '#2a2a48',
        muted:   '#4a4a70',
        accent:         '#7c6fcd',
        'accent-hover': '#6b5ec0',
        'accent-dim':   '#3d3670',
        'accent-light': '#a89de0',
        'accent-glow':  'rgba(124,111,205,0.35)',
        emerald: {
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        sky: {
          400: '#38bdf8',
          500: '#0ea5e9',
        },
        text: {
          primary:   '#eeeeff',
          secondary: '#8080aa',
          muted:     '#50506a',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow':    'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(124,111,205,0.28) 0%, transparent 65%)',
        'hero-grid':    'linear-gradient(rgba(124,111,205,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,111,205,0.04) 1px, transparent 1px)',
        'card-shine':   'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)',
        'accent-fade':  'linear-gradient(135deg, rgba(124,111,205,0.15) 0%, transparent 60%)',
        'emerald-fade': 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, transparent 60%)',
      },
      animation: {
        'pulse-slow':    'pulse 3s ease-in-out infinite',
        'glow':          'glow 2.5s ease-in-out infinite alternate',
        'slide-up':      'slideUp 0.25s ease-out',
        'fade-in':       'fadeIn 0.2s ease-out',
        'scale-in':      'scaleIn 0.2s ease-out',
        'shimmer':       'shimmer 2s linear infinite',
        'bounce-gentle': 'bounceGentle 1.5s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%':   { boxShadow: '0 0 12px rgba(124,111,205,0.25)' },
          '100%': { boxShadow: '0 0 30px rgba(124,111,205,0.55)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
      },
      boxShadow: {
        'accent':     '0 0 0 1px rgba(124,111,205,0.3), 0 4px 16px rgba(124,111,205,0.15)',
        'accent-lg':  '0 0 0 1px rgba(124,111,205,0.4), 0 8px 32px rgba(124,111,205,0.25)',
        'card':       '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 24px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
