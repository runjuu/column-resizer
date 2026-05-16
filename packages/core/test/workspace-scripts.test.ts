import { describe, expect, it } from 'vitest';

import packageJson from '../../../package.json';

describe('workspace scripts', () => {
  it('runs the real Biome source check for linting', () => {
    expect(packageJson.scripts.lint).toBe('biome check .');
  });
});
