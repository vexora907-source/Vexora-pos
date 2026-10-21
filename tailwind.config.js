/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vexora: {
          50: '#eff6ff',
          100: '#dceafa',
          500: '#1176d3',
          600: '#0d4c91',
          700: '#0b2f63',
          900: '#071d3c',
        },
      },
    },
  },
  plugins: [],
}
