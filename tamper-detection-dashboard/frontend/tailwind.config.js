/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
        danger: {
          500: '#ef4444',
        },
        warning: {
          500: '#f97316',
        },
        success: {
          500: '#22c55e',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s linear infinite',
        'bounce-slow': 'bounce 3s infinite',
        'spin-slow': 'spin 5s linear infinite',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.5)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.5)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};


