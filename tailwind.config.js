/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{html,njk,js,md}"],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        primary: {
          500: 'rgb(var(--color-primary) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        heading: ["Crimson Pro", "serif"],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.fg'),
            a: {
              color: theme('colors.accent'),
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            },
            blockquote: {
              color: theme('colors.fg') + '/80',
              borderLeftColor: theme('colors.accent'),
            },
            hr: { borderColor: theme('colors.muted') },
          },
        },
      }),
    },
  },
  plugins: [require('daisyui')],
daisyui: {
  themes: [
    {
      rc: {
        'base-100': 'rgb(var(--bg))',
        'base-content': 'rgb(var(--fg))',

        primary: 'rgb(var(--color-primary))',
        'primary-content': 'rgb(255 255 255)',

        neutral: 'rgb(var(--surface))',
      },
    },
  ],
},
};
