import { defineConfig, Options } from 'tsup';

const baseConfig: Options = {
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  outDir: 'dist',
  minify: true,
  treeshake: true,
  tsconfig: 'tsconfig.json',
  splitting: true,
};

export default defineConfig([
  {
    ...baseConfig,
    format: 'esm',
  },
  {
    ...baseConfig,
    format: 'cjs',
    target: 'es2018',
  },
  {
    ...baseConfig,
    format: 'iife',
    globalName: 'ColumnResizerReact',
  },
]);
