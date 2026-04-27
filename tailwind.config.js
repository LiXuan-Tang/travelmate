/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#fdf9ec',
        surface: '#FFFFFF',
        border: '#d4cdb8',
        foreground: '#111827',
        primary: {
          DEFAULT: '#006a66',
          foreground: '#FFFFFF',
          light: '#9cf1ec',
          dark: '#004e4a',
        },
        muted: {
          DEFAULT: '#ede8d5',
          foreground: '#6b7280',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#00677c',
          foreground: '#FFFFFF',
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
