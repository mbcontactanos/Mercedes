/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mercedes: {
          dark: '#000000',
          light: '#FFFFFF',
          accent: '#1A1A1A',
          border: '#DEE2E6',
          aside: '#0A0A0A',
          asideLight: '#F8F9FA',
          muted: '#64748B',
          mutedLight: '#6C757D',
          card: '#111111',
          input: '#212529',
          success: '#0DF20D',
        }
      },
      borderRadius: {
        '3xl': '24px',
        '2xl': '16px',
        'xl': '12px',
      }
    },
  },
  plugins: [],
}
