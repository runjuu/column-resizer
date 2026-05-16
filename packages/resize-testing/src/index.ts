import type { ResizeGraph } from '@column-resizer/resize-graph';

export function crossJunctionFixture(): ResizeGraph {
  return {
    variables: {
      x0: { id: 'x0', value: 0, locked: true },
      x1: { id: 'x1', value: 250 },
      x2: { id: 'x2', value: 500 },
      x3: { id: 'x3', value: 800, locked: true },
      y0: { id: 'y0', value: 0, locked: true },
      y1: { id: 'y1', value: 200 },
      y2: { id: 'y2', value: 400 },
      y3: { id: 'y3', value: 600, locked: true },
    },
    points: [
      { id: 'top', x: 'x1', y: 'y0' },
      { id: 'left', x: 'x0', y: 'y1' },
      { id: 'J', x: 'x1', y: 'y1' },
      { id: 'right', x: 'x2', y: 'y1' },
      { id: 'bottom', x: 'x1', y: 'y2' },
    ],
    edges: [
      { id: 'top-arm', from: 'top', to: 'J', propagate: true },
      { id: 'left-arm', from: 'left', to: 'J', propagate: true },
      { id: 'right-arm', from: 'J', to: 'right', propagate: true },
      { id: 'bottom-arm', from: 'J', to: 'bottom', propagate: true },
    ],
    regions: [
      {
        id: 'top-left',
        left: 'x0',
        right: 'x1',
        top: 'y0',
        bottom: 'y1',
        minWidth: 100,
        minHeight: 100,
      },
      {
        id: 'top-right',
        left: 'x1',
        right: 'x2',
        top: 'y0',
        bottom: 'y1',
        minWidth: 100,
        minHeight: 100,
      },
      {
        id: 'bottom-left',
        left: 'x0',
        right: 'x1',
        top: 'y1',
        bottom: 'y2',
        minWidth: 100,
        minHeight: 100,
      },
      {
        id: 'bottom-right',
        left: 'x1',
        right: 'x2',
        top: 'y1',
        bottom: 'y2',
        minWidth: 100,
        minHeight: 100,
      },
    ],
    handles: [{ id: 'J', point: 'J', axis: 'both', behavior: 'junction-propagate' }],
  };
}

export function tJunctionFixture(): ResizeGraph {
  return {
    variables: {
      x0: { id: 'x0', value: 0, locked: true },
      x1: { id: 'x1', value: 200 },
      x2: { id: 'x2', value: 400, locked: true },
      y0: { id: 'y0', value: 0, locked: true },
      y1: { id: 'y1', value: 200 },
      y2: { id: 'y2', value: 400, locked: true },
    },
    points: [
      { id: 'top', x: 'x1', y: 'y0' },
      { id: 'left', x: 'x0', y: 'y1' },
      { id: 'J', x: 'x1', y: 'y1' },
      { id: 'right', x: 'x2', y: 'y1' },
    ],
    edges: [
      { id: 'stem', from: 'top', to: 'J', propagate: true },
      { id: 'left-arm', from: 'left', to: 'J', propagate: true },
      { id: 'right-arm', from: 'J', to: 'right', propagate: true },
    ],
    regions: [
      {
        id: 'body',
        left: 'x0',
        right: 'x2',
        top: 'y0',
        bottom: 'y2',
        minWidth: 200,
        minHeight: 200,
      },
    ],
    handles: [{ id: 'J', point: 'J', axis: 'both' }],
  };
}

export function lJunctionFixture(): ResizeGraph {
  return {
    variables: {
      x0: { id: 'x0', value: 0, locked: true },
      x1: { id: 'x1', value: 150 },
      y0: { id: 'y0', value: 0, locked: true },
      y1: { id: 'y1', value: 150 },
    },
    points: [
      { id: 'corner', x: 'x0', y: 'y0' },
      { id: 'J', x: 'x1', y: 'y1' },
      { id: 'horizontal', x: 'x1', y: 'y0' },
      { id: 'vertical', x: 'x0', y: 'y1' },
    ],
    edges: [
      { id: 'horizontal-arm', from: 'corner', to: 'horizontal', propagate: true },
      { id: 'vertical-arm', from: 'corner', to: 'vertical', propagate: true },
    ],
    regions: [
      {
        id: 'corner-region',
        left: 'x0',
        right: 'x1',
        top: 'y0',
        bottom: 'y1',
        minWidth: 80,
        minHeight: 80,
      },
    ],
    handles: [{ id: 'corner', point: 'corner', axis: 'both' }],
  };
}

export function cyclicGraphFixture(): ResizeGraph {
  return {
    variables: {
      x0: { id: 'x0', value: 0 },
      x1: { id: 'x1', value: 100 },
      y0: { id: 'y0', value: 0 },
      y1: { id: 'y1', value: 100 },
    },
    points: [
      { id: 'a', x: 'x0', y: 'y0' },
      { id: 'b', x: 'x1', y: 'y0' },
      { id: 'c', x: 'x1', y: 'y1' },
      { id: 'd', x: 'x0', y: 'y1' },
    ],
    edges: [
      { id: 'ab', from: 'a', to: 'b', propagate: true },
      { id: 'bc', from: 'b', to: 'c', propagate: true },
      { id: 'cd', from: 'c', to: 'd', propagate: true },
      { id: 'da', from: 'd', to: 'a', propagate: true },
    ],
    regions: [
      { id: 'loop', left: 'x0', right: 'x1', top: 'y0', bottom: 'y1', minWidth: 50, minHeight: 50 },
    ],
    handles: [{ id: 'a', point: 'a', axis: 'both', traversal: 'whole-connected-component' }],
  };
}

export function groupedEdgeFixture(): ResizeGraph {
  return {
    variables: {
      x0: { id: 'x0', value: 0 },
      x1: { id: 'x1', value: 100 },
      x2: { id: 'x2', value: 200 },
      y0: { id: 'y0', value: 0 },
    },
    points: [
      { id: 'a', x: 'x0', y: 'y0', group: 'left-group' },
      { id: 'b', x: 'x1', y: 'y0', group: 'left-group' },
      { id: 'c', x: 'x2', y: 'y0', group: 'right-group' },
    ],
    edges: [
      { id: 'ab', from: 'a', to: 'b', group: 'left-group', propagate: true },
      { id: 'bc', from: 'b', to: 'c', group: 'right-group', propagate: true },
    ],
    regions: [
      {
        id: 'left',
        left: 'x0',
        right: 'x1',
        top: 'y0',
        bottom: 'y0',
        minWidth: 40,
      },
      {
        id: 'right',
        left: 'x1',
        right: 'x2',
        top: 'y0',
        bottom: 'y0',
        minWidth: 40,
      },
    ],
    handles: [
      {
        id: 'group-handle',
        point: 'a',
        axis: 'x',
        traversal: 'same-group',
        group: 'left-group',
      },
    ],
  };
}
