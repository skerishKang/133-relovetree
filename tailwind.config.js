/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./*.js",
    "./src/**/*.{html,js}"
  ],
  safelist: [
    'bg-purple-100', 'bg-blue-100', 'bg-red-100', 'bg-green-100', 'bg-pink-100',
    'text-purple-600', 'text-blue-600', 'text-red-600', 'text-green-600', 'text-pink-600'
  ],
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
