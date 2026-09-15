/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mag: {
          green: '#00b074',
          dark: '#111827',
          darker: '#0b0f19',
          card: '#1f2937',
        }
      }
    },
  },
  plugins: [],
}
