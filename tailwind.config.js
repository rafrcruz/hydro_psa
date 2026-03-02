import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'hydro-blue': '#444D55',
        'hydro-light-blue': '#768692',
        'hydro-dark-blue': '#333940',
        aluminium: '#8C8C8C',
        white: '#FFFFFF',
        black: '#000000',
        green: '#43807A',
        warm: '#C5B9AC',
        purple: '#4A3041',
        bauxite: '#B95946',
        'mid-gray': '#757575',
        'light-gray': '#F4F4F4',
      },
      fontFamily: {
        display: ['"Ivar Display"', 'serif'],
        text: ['"Ivar Text"', 'serif'],
        arial: ['Arial', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      maxWidth: {
        content: '110rem',
      },
    },
  },
  plugins: [typography],
};
