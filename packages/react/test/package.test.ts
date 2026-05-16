import { describe, expect, it } from 'vitest';

import packageJson from '../package.json';

describe('@column-resizer/react package metadata', () => {
  it('requires a hooks-capable React peer dependency', () => {
    expect(packageJson.peerDependencies?.react).toBe('^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0');
  });
});
