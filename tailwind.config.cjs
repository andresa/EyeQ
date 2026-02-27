const palette = require('./src/theme/palette.json')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: palette.neutral,
        accent: palette.accent,
        tags: palette.tags,
      },
    },
  },
  plugins: [],
}
