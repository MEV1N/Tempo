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
          black: 'var(--tempo-black)',
          secondary: 'var(--tempo-secondary)',
          charcoal: 'var(--tempo-charcoal)',
          muted: 'var(--tempo-muted)',
          border: 'var(--tempo-border)',
          light: 'var(--tempo-light)',
          surface: 'var(--tempo-surface)',
          offwhite: 'var(--tempo-offwhite)',
          white: 'var(--tempo-white)',
        },
      },
    },
  },
  plugins: [],
};
