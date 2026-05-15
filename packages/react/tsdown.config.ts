import { defineConfig } from 'tsdown';

import { iifeConfig, legacyConfig, modernConfig } from '../../scripts/tsdown-config.mts';

export default defineConfig([
  iifeConfig({
    globalName: 'ColumnResizerReact',
    deps: {
      alwaysBundle: ['@column-resizer/core'],
      neverBundle: ['react'],
      onlyBundle: false,
    },
    globals: {
      react: 'React',
    },
  }),
  modernConfig(),
  legacyConfig(),
]);
