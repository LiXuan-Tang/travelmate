/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#FFFFFF',
        border: '#E5E5E5',
        foreground: '#0A0A0A',
        primary: {
          DEFAULT: '#0A0A0A',
          foreground: '#FFFFFF',
          light: '#F5F5F5',
          dark: '#000000',
        },
        muted: {
          DEFAULT: '#F5F5F5',
          foreground: '#737373',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F5F5F5',
          foreground: '#0A0A0A',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
