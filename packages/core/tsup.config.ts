import { defineConfig } from 'tsup';

import { iifeConfig, legacyConfig, modernConfig } from '../../scripts/tsup-config';

export default defineConfig([iifeConfig(), modernConfig(), legacyConfig()]);
