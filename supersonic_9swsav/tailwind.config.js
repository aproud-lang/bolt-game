/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'faction-red': '#EF4444',
        'faction-blue': '#3B82F6',
        'faction-green': '#22C55E',
        'faction-yellow': '#EAB308',
        'faction-purple': '#A855F7',
        'faction-orange': '#F97316',
        'cyber-dark': '#0a0a0f',
        'cyber-darker': '#050508',
        'cyber-accent': '#00f0ff',
        'cyber-pink': '#ff00ff',
        'cyber-green': '#00ff88',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'bounce-in': 'bounce-in 0.5s ease-out',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px currentColor' },
          '50%': { boxShadow: '0 0 40px currentColor, 0 0 60px currentColor' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'glow': {
          '0%': { textShadow: '0 0 10px currentColor, 0 0 20px currentColor' },
          '100%': { textShadow: '0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor' },
        },
      },
    },
  },
  plugins: [],
}
