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
          'yellow-text': 'var(--fitzgerald-yellow-text)',
          'green-text': 'var(--fitzgerald-green-text)',
          'blue-text': 'var(--fitzgerald-blue-text)',
          'purple-text': 'var(--fitzgerald-purple-text)',
          'orange-text': 'var(--fitzgerald-orange-text)',
          'red-text': 'var(--fitzgerald-red-text)',
          'pink-text': 'var(--fitzgerald-pink-text)',
          'white-text': 'var(--fitzgerald-white-text)',
          'gray-text': 'var(--fitzgerald-gray-text)',
          'yellow-border': 'var(--fitzgerald-yellow-border)',
          'green-border': 'var(--fitzgerald-green-border)',
          'blue-border': 'var(--fitzgerald-blue-border)',
          'purple-border': 'var(--fitzgerald-purple-border)',
          'orange-border': 'var(--fitzgerald-orange-border)',
          'red-border': 'var(--fitzgerald-red-border)',
          'pink-border': 'var(--fitzgerald-pink-border)',
          'white-border': 'var(--fitzgerald-white-border)',
          'gray-border': 'var(--fitzgerald-gray-border)',
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
