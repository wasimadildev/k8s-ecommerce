/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        teal: {
          50: '#effcf9',
          100: '#d8f7f1',
          500: '#159a8c',
          600: '#107d73',
          700: '#0d625b',
        },
      },
      boxShadow: {
        card: '0 14px 40px rgba(23, 32, 51, 0.08)',
      },
    },
  },
  plugins: [],
};
