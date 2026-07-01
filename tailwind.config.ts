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
        bg: '#08080f',
        surface: '#11111c',
        card: '#17172a',
        border: '#252540',
        muted: '#5a5a80',
        accent: '#7c6fcd',
        'accent-hover': '#6457b8',
        'accent-light': '#a89de0',
        emerald: { 500: '#10b981', 400: '#34d399' },
        rose: { 500: '#f43f5e', 400: '#fb7185' },
        amber: { 400: '#fbbf24', 500: '#f59e0b' },
        text: { primary: '#eeeeff', secondary: '#8888b0', muted: '#55556a' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,111,205,0.25) 0%, transparent 70%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(124,111,205,0.3)' },
          '100%': { boxShadow: '0 0 25px rgba(124,111,205,0.6)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
