/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#15803d',
          600: '#166534',
          700: '#14532d',
          800: '#14532d',
          900: '#052e16',
        },
      },
    },
  },
  plugins: [],
}
