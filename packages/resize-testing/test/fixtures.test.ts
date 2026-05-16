import { describe, expect, it } from 'vitest';

import { validateResizeGraph } from '@column-resizer/resize-graph';

import {
  crossJunctionFixture,
  cyclicGraphFixture,
  groupedEdgeFixture,
  lJunctionFixture,
  tJunctionFixture,
} from '../src';

describe('resize-testing fixtures', () => {
  it('exports valid cross, T, L, grouped-edge, and cyclic graph fixtures', () => {
    const fixtures = [
      crossJunctionFixture(),
      tJunctionFixture(),
      lJunctionFixture(),
      groupedEdgeFixture(),
      cyclicGraphFixture(),
    ];

    expect(fixtures.map((fixture) => validateResizeGraph(fixture))).toEqual([[], [], [], [], []]);
    expect(fixtures.map((fixture) => fixture.handles.length)).toEqual([1, 1, 1, 1, 1]);
  });
});
