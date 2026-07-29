/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          0: '#0A0D12',
          1: '#0F1419',
          2: '#161D26',
        },
        text: {
          0: '#F1F5F9',
          1: '#9BA7B8',
          2: '#8C9AAB',
        },
        red: {
          DEFAULT: '#EF4444',
          dim: 'rgba(239, 68, 68, 0.1)',
        },
        gold: {
          DEFAULT: '#D49B2C',
        },
        green: {
          DEFAULT: '#55E838',
        },
        steel: {
          DEFAULT: '#94A3B8',
        },
        line: {
          DEFAULT: 'rgba(255, 255, 255, 0.06)',
          2: 'rgba(255, 255, 255, 0.12)',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['"Space Mono"', '"Courier New"', 'monospace'],
        body: ['"Space Grotesk"', 'sans-serif'],
      },
      boxShadow: {
        'btn-cta': '0 0 32px rgba(239, 68, 68, 0.4), 0 4px 24px rgba(0, 0, 0, 0.55)',
        'btn-cta-hover': '0 0 44px rgba(239, 68, 68, 0.6), 0 4px 24px rgba(0, 0, 0, 0.55)',
        panel: '0 24px 80px rgba(0, 0, 0, 0.5)',
      },
      letterSpacing: {
        'wide-1': '0.1em',
        'wide-2': '0.16em',
        'wide-3': '0.22em',
      },
    },
  },
  plugins: [],
}
