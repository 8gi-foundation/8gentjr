import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      colors: {
        // Fitzgerald Key colors (AAC clinical standard)
        fitzgerald: {
          yellow: 'var(--fitzgerald-yellow)',
          green: 'var(--fitzgerald-green)',
          blue: 'var(--fitzgerald-blue)',
          purple: 'var(--fitzgerald-purple)',
          orange: 'var(--fitzgerald-orange)',
          brown: 'var(--fitzgerald-brown)',
          red: 'var(--fitzgerald-red)',
          pink: 'var(--fitzgerald-pink)',
          white: 'var(--fitzgerald-white)',
          gray: 'var(--fitzgerald-gray)',
        },
        safety: {
          stop: 'var(--safety-stop)',
          help: 'var(--safety-help)',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
