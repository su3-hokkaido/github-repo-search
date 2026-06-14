/** PostCSS configuration. Tailwind v4 ships its pipeline as a single PostCSS
 *  plugin (`@tailwindcss/postcss`); no separate `tailwind.config.js` is needed. */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
