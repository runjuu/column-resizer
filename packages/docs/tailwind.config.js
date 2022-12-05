module.exports = {
  content: ['pages', 'components'].map((name) => `./${name}/**/*.{ts,tsx,mdx}`),
  theme: { extend: {} },
  plugins: [],
  darkMode: 'class',
};
