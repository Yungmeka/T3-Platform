/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'violet-primary': '#7C3AED',
        'accent-pink': '#EC4899',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.05)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}

