module.exports = {
  content: ['pages', 'components', 'examples'].map((name) => `./${name}/**/*.{ts,tsx,mdx}`),
  theme: { extend: {} },
  plugins: [],
  darkMode: 'class',
};
