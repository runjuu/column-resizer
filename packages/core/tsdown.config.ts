import { defineConfig } from 'tsdown';

import { iifeConfig, legacyConfig, modernConfig } from '../../scripts/tsdown-config.mts';

export default defineConfig([
  iifeConfig({ globalName: 'ColumnResizerCore' }),
  modernConfig(),
  legacyConfig(),
]);
