import { defineConfig } from 'tsdown';

import { legacyConfig, modernConfig } from '../../scripts/tsdown-config.mts';

export default defineConfig([modernConfig(), legacyConfig()]);
