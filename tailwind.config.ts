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
        // Page backgrounds — warm parchment scale
        bg:           '#f4efe5',
        surface:      '#ece5d8',
        card:         '#ffffff',
        'card-hover': '#faf7f3',

        // Borders — warm tan
        border:        '#d9cfbc',
        'border-light':'#e6dece',
        'border-dark': '#c5b89f',

        // Text — warm charcoal
        text: {
          primary:   '#1a1510',
          secondary: '#5c4e3a',
          muted:     '#9a8a72',
        },
        muted: '#9a8a72',

        // Primary accent — deep music-ink navy
        accent:         '#1c3a5e',
        'accent-hover': '#142d4a',
        'accent-light': '#2d5a8e',
        'accent-dim':   '#dce8f7',
        'accent-glow':  'rgba(28,58,94,0.15)',

        // Gold / amber — illuminated-manuscript warmth
        gold:         '#b07d0a',
        'gold-light': '#d09e2a',
        'gold-dim':   '#faf2dc',

        // Functional
        emerald: { 300: '#5cc994', 400: '#2d9e6a', 500: '#1f7a51', 600: '#175e3e' },
        rose:    { 400: '#c9484a', 500: '#b23232', 600: '#8f2828' },
        amber:   { 400: '#c49022', 500: '#a67818' },
        sky:     { 400: '#2d7ea8', 500: '#1e6489' },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        // For display headings — slightly heavier Inter weights
        display: ['Inter', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        // Warm golden glow for hero
        'hero-glow':    'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(176,125,10,0.12) 0%, transparent 70%)',
        'hero-grid':    'linear-gradient(rgba(28,58,94,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(28,58,94,0.05) 1px, transparent 1px)',
        'card-shine':   'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, transparent 50%)',
        'accent-fade':  'linear-gradient(135deg, rgba(28,58,94,0.06) 0%, transparent 60%)',
        'emerald-fade': 'linear-gradient(135deg, rgba(31,122,81,0.06) 0%, transparent 60%)',
        'gold-fade':    'linear-gradient(135deg, rgba(176,125,10,0.08) 0%, transparent 60%)',
      },
      animation: {
        'pulse-slow':    'pulse 3s ease-in-out infinite',
        'slide-up':      'slideUp 0.22s ease-out',
        'fade-in':       'fadeIn 0.18s ease-out',
        'scale-in':      'scaleIn 0.18s ease-out',
        'bounce-gentle': 'bounceGentle 1.6s ease-in-out infinite',
        'record-pulse':  'recordPulse 1s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-3px)' },
        },
        recordPulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.35' },
        },
      },
      boxShadow: {
        'sm':        '0 1px 3px rgba(0,0,0,0.08)',
        'md':        '0 2px 8px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)',
        'lg':        '0 4px 20px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
        'accent':    '0 2px 12px rgba(28,58,94,0.18)',
        'accent-lg': '0 4px 24px rgba(28,58,94,0.22)',
        'gold':      '0 2px 12px rgba(176,125,10,0.20)',
        'sheet':     '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
