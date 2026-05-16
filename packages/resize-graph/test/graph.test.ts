import { describe, expect, it } from 'vitest';

import { solveScaledVector } from '@column-resizer/resize-kernel';
import {
  crossJunctionFixture,
  cyclicGraphFixture,
  lJunctionFixture,
  tJunctionFixture,
} from '@column-resizer/resize-testing';

import {
  ResizeGraph,
  ResizePolicy,
  createBehaviorRegistry,
  createPolicyRegistry,
  createResizeProgram,
  executeResizeProgram,
  executeResizeProgramWithResidualRerouting,
  graphToResizeState,
  resolveHandlePoints,
  validateResizeGraph,
} from '../src';

function rerouteGraph({ locked = false, propagate = true } = {}): ResizeGraph {
  return {
    variables: {
      xa: { id: 'xa', value: 0, locked },
      xb: { id: 'xb', value: 100, max: 120 },
      xc: { id: 'xc', value: 200, max: 260 },
      y: { id: 'y', value: 0 },
    },
    points: [
      { id: 'a', x: 'xa', y: 'y', group: 'one' },
      { id: 'b', x: 'xb', y: 'y', group: 'one' },
      { id: 'c', x: 'xc', y: 'y', group: 'two' },
    ],
    edges: [
      { id: 'ab', from: 'a', to: 'b', kind: 'primary', group: 'one', propagate },
      { id: 'bc', from: 'b', to: 'c', kind: 'primary', group: 'two', propagate: true },
      { id: 'ca', from: 'c', to: 'a', kind: 'cycle', group: 'two', propagate: true },
    ],
    regions: [],
    handles: [{ id: 'a', point: 'a', axis: 'x' }],
  };
}

describe('resize graph validation and constraints', () => {
  it('generates region width, height, locked/fixed, and raw constraints', () => {
    const graph = crossJunctionFixture();
    graph.regions[0] = { ...graph.regions[0], locked: true };
    graph.constraints = [{ id: 'raw', type: 'range', variable: 'x1', min: 100, max: 700 }];

    const state = graphToResizeState(graph);

    expect(state.constraints?.map((constraint) => constraint.id)).toContain('raw');
    expect(
      state.constraints?.find((constraint) => constraint.id === 'region:top-left:width'),
    ).toMatchObject({
      min: 250,
      max: 250,
    });
    expect(
      state.constraints?.find((constraint) => constraint.id === 'region:top-right:height'),
    ).toMatchObject({
      min: 100,
    });
  });

  it('rejects duplicate ids and missing references', () => {
    const graph: ResizeGraph = {
      variables: { x: { id: 'x', value: 0 }, y: { id: 'y', value: 0 } },
      points: [
        { id: 'p', x: 'x', y: 'y' },
        { id: 'p', x: 'missing', y: 'y' },
      ],
      edges: [{ id: 'e', from: 'p', to: 'missing' }],
      regions: [{ id: 'r', left: 'x', right: 'missing', top: 'y', bottom: 'y' }],
      handles: [{ id: 'h', point: 'missing', edges: ['missing'], regions: ['missing'] }],
    };

    expect(validateResizeGraph(graph).map((item) => [item.path, item.code])).toEqual([
      ['edges.e.to', 'missing_point'],
      ['handles.h.edges.missing', 'missing_edge'],
      ['handles.h.point', 'missing_point'],
      ['handles.h.regions.missing', 'missing_region'],
      ['points.p', 'duplicate_id'],
      ['points.p.x', 'missing_variable'],
      ['regions.r.right', 'missing_variable'],
    ]);
  });

  it('validates cross, T, L, and cyclic fixtures', () => {
    expect(validateResizeGraph(crossJunctionFixture())).toEqual([]);
    expect(validateResizeGraph(tJunctionFixture())).toEqual([]);
    expect(validateResizeGraph(lJunctionFixture())).toEqual([]);
    expect(validateResizeGraph(cyclicGraphFixture())).toEqual([]);
  });
});

describe('junction-propagate behavior', () => {
  it('moves only directly related variables with incident traversal', () => {
    const graph = crossJunctionFixture();
    graph.handles[0] = { ...graph.handles[0], traversal: 'incident' };

    const program = createResizeProgram(graph, 'J', { x: 10, y: 20 });

    expect(program.phases[0].vector).toEqual({ x1: 10, y1: 20 });
  });

  it('follows only marked propagation edges', () => {
    const graph = crossJunctionFixture();
    graph.edges.find((edge) => edge.id === 'right-arm')!.propagate = false;
    graph.handles[0] = { ...graph.handles[0], traversal: 'propagate-marked-edges' };

    const selected = resolveHandlePoints(graph, graph.handles[0]);

    expect([...selected].sort()).toEqual(['J', 'bottom', 'left', 'top']);
  });

  it('selects same-group points and terminates cycles', () => {
    const graph = cyclicGraphFixture();
    graph.points = graph.points.map((point) => ({
      ...point,
      group: point.id === 'a' || point.id === 'b' ? 'one' : 'two',
    }));
    graph.handles[0] = { ...graph.handles[0], traversal: 'same-group', group: 'one' };

    expect([...resolveHandlePoints(graph, graph.handles[0])].sort()).toEqual(['a', 'b']);

    graph.handles[0] = { ...graph.handles[0], traversal: 'whole-connected-component' };

    expect([...resolveHandlePoints(graph, graph.handles[0])].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('supports x-only, y-only, and both-axis handles', () => {
    const graph = crossJunctionFixture();

    graph.handles[0] = { ...graph.handles[0], axis: 'x' };
    expect(createResizeProgram(graph, 'J', { x: 10, y: 20 }).phases[0].vector).toEqual({ x1: 10 });

    graph.handles[0] = { ...graph.handles[0], axis: 'y' };
    expect(createResizeProgram(graph, 'J', { x: 10, y: 20 }).phases[0].vector).toEqual({ y1: 20 });

    graph.handles[0] = { ...graph.handles[0], axis: 'both' };
    expect(createResizeProgram(graph, 'J', { x: 10, y: 20 }).phases[0].vector).toEqual({
      x1: 10,
      y1: 20,
    });
  });

  it('matches the mandatory cross-junction independent and atomic fixture results', () => {
    const graph = crossJunctionFixture();
    const state = graphToResizeState(graph);

    graph.handles[0] = { ...graph.handles[0], vectorPolicy: 'independent-axis' };
    const independent = executeResizeProgram(
      state,
      createResizeProgram(graph, 'J', { x: 200, y: 150 }),
    );

    expect(independent.state.variables.x1.value).toBe(400);
    expect(independent.state.variables.y1.value).toBe(300);
    expect(independent.phaseResults[0].appliedVector).toEqual({ x1: 150, y1: 100 });

    graph.handles[0] = { ...graph.handles[0], vectorPolicy: 'atomic-vector' };
    const atomic = executeResizeProgram(state, createResizeProgram(graph, 'J', { x: 200, y: 150 }));

    expect(atomic.phaseResults[0].appliedVector.x1).toBeCloseTo(133.333, 2);
    expect(atomic.phaseResults[0].appliedVector.y1).toBe(100);
  });

  it('clamps movement when connected variables are locked', () => {
    const graph = crossJunctionFixture();
    graph.variables.x1.locked = true;

    const result = executeResizeProgram(
      graphToResizeState(graph),
      createResizeProgram(graph, 'J', { x: 10, y: 0 }),
    );

    expect(result.phaseResults[0].appliedVector).toEqual({});
    expect(result.phaseResults[0].blocked).toBe(true);
  });
});

describe('resize programs and policies', () => {
  it('matches the direct solver for a one-phase scaled-vector program', () => {
    const graph = crossJunctionFixture();
    const state = graphToResizeState(graph);
    const phase = { id: 'direct', vector: { x1: 10 }, policy: 'scaled-vector' as const };

    expect(executeResizeProgram(state, { phases: [phase] }).phaseResults[0]).toMatchObject(
      solveScaledVector(state, { x1: 10 }),
    );
  });

  it('executes phases in priority order and exposes residual movement to custom policies', () => {
    const graph = crossJunctionFixture();
    const state = graphToResizeState(graph);
    const seenResiduals: unknown[] = [];
    const customPolicy: ResizePolicy = ({ state: currentState, phase, previousResidual }) => {
      seenResiduals.push(previousResidual);
      return solveScaledVector(currentState, phase.vector);
    };

    const result = executeResizeProgram(
      state,
      {
        phases: [
          { id: 'later', vector: { y1: 10 }, policy: 'custom', priority: 2 },
          { id: 'first', vector: { x1: 500 }, policy: 'custom', priority: 1 },
        ],
      },
      createPolicyRegistry([['custom', customPolicy]]),
    );

    expect(result.phaseResults.map((phase) => phase.requestedVector)).toEqual([
      { x1: 500 },
      { y1: 10 },
    ]);
    expect(result.residualVector).toEqual({ x1: 350 });
    expect(seenResiduals).toEqual([{}, { x1: 350 }]);
  });

  it('accumulates residual movement across multiple blocked phases', () => {
    const graph = crossJunctionFixture();
    const state = graphToResizeState(graph);

    const result = executeResizeProgram(state, {
      phases: [
        { id: 'x-limit', vector: { x1: 500 }, priority: 1 },
        { id: 'y-limit', vector: { y1: -500 }, priority: 2 },
        { id: 'unblocked', vector: { x2: 25 }, priority: 3 },
      ],
    });

    expect(result.state.variables.x1.value).toBe(400);
    expect(result.state.variables.y1.value).toBe(100);
    expect(result.state.variables.x2.value).toBe(525);
    expect(result.residualVector).toEqual({ x1: 350, y1: -400 });
  });

  it('allows custom behavior and policy to discard or replace movement', () => {
    const graph = crossJunctionFixture();
    const behaviorRegistry = createBehaviorRegistry([
      [
        'replace',
        () => ({
          phases: [{ id: 'replace', vector: { x1: 999 }, policy: 'discard' }],
        }),
      ],
    ]);
    const policyRegistry = createPolicyRegistry([
      ['discard', ({ state: currentState }) => solveScaledVector(currentState, {})],
    ]);

    graph.handles[0] = { ...graph.handles[0], behavior: 'replace' };

    const result = executeResizeProgram(
      graphToResizeState(graph),
      createResizeProgram(graph, 'J', { x: 10, y: 10 }, behaviorRegistry),
      policyRegistry,
    );

    expect(result.state.variables.x1.value).toBe(250);
  });
});

describe('graph-level residual rerouting', () => {
  it('does not reroute when the primary target has capacity', () => {
    const graph = rerouteGraph({ locked: false });
    const result = executeResizeProgramWithResidualRerouting(
      graph,
      graphToResizeState(graph),
      createResizeProgram(graph, 'a', { x: 10, y: 0 }),
    );

    expect(result.state.variables.xa.value).toBe(10);
    expect(result.state.variables.xb.value).toBe(100);
    expect(result.residualVector).toEqual({});
  });

  it('fully reroutes locked primary residual through eligible graph paths', () => {
    const graph = rerouteGraph({ locked: true });
    const result = executeResizeProgramWithResidualRerouting(
      graph,
      graphToResizeState(graph),
      createResizeProgram(graph, 'a', { x: 50, y: 0 }),
    );

    expect(result.state.variables.xa.value).toBe(0);
    expect(result.state.variables.xb.value).toBe(120);
    expect(result.state.variables.xc.value).toBe(230);
    expect(result.residualVector).toEqual({});
    expect(result.diagnostics.map((item) => item.code)).toContain('residual_rerouted');
  });

  it('reroutes residual movement from an earlier phase after later phases succeed', () => {
    const graph = rerouteGraph({ locked: true });
    const result = executeResizeProgramWithResidualRerouting(graph, graphToResizeState(graph), {
      phases: [
        { id: 'blocked-x', vector: { xa: 50 }, priority: 1 },
        { id: 'free-y', vector: { y: 10 }, priority: 2 },
      ],
    });

    expect(result.state.variables.xa.value).toBe(0);
    expect(result.state.variables.xb.value).toBe(120);
    expect(result.state.variables.xc.value).toBe(230);
    expect(result.state.variables.y.value).toBe(10);
    expect(result.residualVector).toEqual({});
    expect(result.diagnostics.map((item) => item.code)).toContain('residual_rerouted');
  });

  it('supports partial reroute, maxDepth, propagate false, group boundaries, edge kinds, and cycles', () => {
    const locked = rerouteGraph({ locked: true });
    const maxDepthResult = executeResizeProgramWithResidualRerouting(
      locked,
      graphToResizeState(locked),
      createResizeProgram(locked, 'a', { x: 50, y: 0 }),
      { allowedEdgeKinds: ['primary'], maxDepth: 1 },
    );

    expect(maxDepthResult.state.variables.xb.value).toBe(120);
    expect(maxDepthResult.state.variables.xc.value).toBe(200);
    expect(maxDepthResult.residualVector).toEqual({ xa: 30 });

    const blocked = rerouteGraph({ locked: true, propagate: false });
    expect(
      executeResizeProgramWithResidualRerouting(
        blocked,
        graphToResizeState(blocked),
        createResizeProgram(blocked, 'a', { x: 50, y: 0 }),
        { allowedEdgeKinds: ['primary'] },
      ).residualVector,
    ).toEqual({ xa: 50 });

    const grouped = rerouteGraph({ locked: true });
    const groupedResult = executeResizeProgramWithResidualRerouting(
      grouped,
      graphToResizeState(grouped),
      createResizeProgram(grouped, 'a', { x: 50, y: 0 }),
      { group: 'one' },
    );

    expect(groupedResult.state.variables.xb.value).toBe(120);
    expect(groupedResult.state.variables.xc.value).toBe(200);
    expect(groupedResult.residualVector).toEqual({ xa: 30 });

    const kindFiltered = rerouteGraph({ locked: true });
    expect(
      executeResizeProgramWithResidualRerouting(
        kindFiltered,
        graphToResizeState(kindFiltered),
        createResizeProgram(kindFiltered, 'a', { x: 50, y: 0 }),
        { allowedEdgeKinds: ['cycle'], traversal: 'depth-first' },
      ).state.variables.xc.value,
    ).toBe(250);
  });
});
