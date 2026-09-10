/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--cp-bg)',
        foreground: 'var(--cp-text)',
        border: 'var(--cp-border)',
        accent: 'var(--cp-accent)',
      },
      borderRadius: { md: '0.625rem', lg: '1rem' },
    },
  },
  plugins: [],
}
