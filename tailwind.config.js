/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#223F7F',
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#223F7F',
          600: '#1e40af',
          700: '#1d4ed8',
        },
        secondary: {
          DEFAULT: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#F59E0B',
        }
      }
    },
  },
  plugins: [],
};
