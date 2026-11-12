/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        handwriting: ['Caveat', 'cursive', 'sans-serif'],
        brand: ['Caveat', 'cursive', 'sans-serif'],
        handwritten: ['Caveat', 'cursive', 'sans-serif'],
        interface: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        tempo: {
          black: '#080808',
          secondary: '#171717',
          charcoal: '#404040',
          muted: '#777777',
          border: '#D9D9D9',
          light: '#EFEFEF',
          surface: '#F5F5F5',
          offwhite: '#FAFAFA',
          white: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
};
