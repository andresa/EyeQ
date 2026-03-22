const palette = require('./src/theme/palette.json')
const defaultTheme = require('tailwindcss/defaultTheme')

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
      fontFamily: {
        sans: ['"Source Sans 3"', ...defaultTheme.fontFamily.sans],
        heading: ['"Raleway"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('pointer-coarse', '@media (pointer: coarse)')
    },
  ],
}
