/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0a0a',
          surface: '#111111',
          elevated: '#1a1a1a',
        },
        primary: {
          DEFAULT: '#dc2626',
          hover: '#b91c1c',
        },
      },
    },
  },
  plugins: [],
};
