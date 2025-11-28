/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans KR"', 'Outfit', 'sans-serif'],
        display: ['Outfit', '"Noto Sans KR"', 'sans-serif']
      },
      colors: {
        brand: { 50: '#fff1f2', 100: '#ffe4e6', 500: '#f43f5e', 600: '#e11d48' }
      }
    },
  },
  plugins: [],
}
