import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  resolve: {
    alias: {
      '@column-resizer/core': fileURLToPath(
        new URL('./packages/core/src/index.ts', import.meta.url),
      ),
      '@column-resizer/react': fileURLToPath(
        new URL('./packages/react/src/index.ts', import.meta.url),
      ),
      '@column-resizer/resize-kernel': fileURLToPath(
        new URL('./packages/resize-kernel/src/index.ts', import.meta.url),
      ),
      '@column-resizer/resize-graph': fileURLToPath(
        new URL('./packages/resize-graph/src/index.ts', import.meta.url),
      ),
      '@column-resizer/resize-dom': fileURLToPath(
        new URL('./packages/resize-dom/src/index.ts', import.meta.url),
      ),
      '@column-resizer/resize-react': fileURLToPath(
        new URL('./packages/resize-react/src/index.tsx', import.meta.url),
      ),
      '@column-resizer/resize-testing': fileURLToPath(
        new URL('./packages/resize-testing/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['packages/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
