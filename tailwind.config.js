/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fun: {
          primary: '#4F46E5', // Main brand color - indigo
          secondary: '#60A5FA', // Light blue for accents
          accent: '#34D399', // Green for success/positive actions
          background: '#818CF8', // Lighter indigo for backgrounds
          yellow: '#FCD34D', // Playful yellow
          pink: '#F472B6', // Fun pink
          purple: '#A78BFA', // Soft purple
          orange: '#FB923C', // Warm orange
        },
      },
      fontFamily: {
        sans: ['Quicksand', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      animation: {
        'bounce-gentle': 'bounce-gentle 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale': 'scale 0.2s ease-out',
      },
      keyframes: {
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'scale': {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'fun': '0 4px 14px 0 rgba(79, 70, 229, 0.4)',
        'fun-lg': '0 10px 25px -3px rgba(79, 70, 229, 0.4)',
      },
    },
  },
  plugins: [],
}