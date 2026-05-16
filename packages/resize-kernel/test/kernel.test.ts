import { describe, expect, it } from 'vitest';

import {
  ResizeState,
  cancel,
  commit,
  createSession,
  preview,
  solveScaledVector,
  validateResizeState,
} from '../src';

function state(overrides: Partial<ResizeState> = {}): ResizeState {
  return {
    variables: {
      a: { id: 'a', value: 100, min: 0, max: 200 },
      b: { id: 'b', value: 200, min: 0, max: 400 },
      ...(overrides.variables ?? {}),
    },
    constraints: overrides.constraints ?? [],
  };
}

describe('resize-kernel validation', () => {
  it('accepts valid finite variables and fixed distance constraints', () => {
    const diagnostics = validateResizeState(
      state({
        constraints: [{ id: 'fixed', type: 'distance', from: 'a', to: 'b', min: 100, max: 100 }],
      }),
    );

    expect(diagnostics).toEqual([]);
  });

  it('reports invalid variables and constraints deterministically', () => {
    const diagnostics = validateResizeState({
      variables: {
        b: { id: 'b', value: Number.POSITIVE_INFINITY, min: 10, max: 0 },
        a: { id: 'a', value: Number.NaN },
      },
      constraints: [
        { id: 'z-distance', type: 'distance', from: 'a', to: 'missing', min: 4, max: 2 },
        { id: 'a-range', type: 'range', variable: 'missing', min: 10, max: 5 },
        { id: 'locked', type: 'locked', variable: 'missing' },
      ],
    });

    expect(diagnostics.map((item) => [item.path, item.code])).toEqual([
      ['constraints.a-range', 'invalid_constraint_range'],
      ['constraints.a-range.variable', 'missing_variable'],
      ['constraints.locked.variable', 'missing_variable'],
      ['constraints.z-distance', 'invalid_constraint_range'],
      ['constraints.z-distance.to', 'missing_variable'],
      ['variables.a.value', 'non_finite_variable'],
      ['variables.b', 'invalid_variable_range'],
      ['variables.b.value', 'non_finite_variable'],
    ]);
  });
});

describe('solveScaledVector', () => {
  it('grows within max and reports changed variables', () => {
    const result = solveScaledVector(state(), { a: 50 });

    expect(result.nextState.variables.a.value).toBe(150);
    expect(result.appliedVector).toEqual({ a: 50 });
    expect(result.residualVector).toEqual({});
    expect(result.changedVariables).toEqual(['a']);
    expect(result.blocked).toBe(false);
  });

  it('clamps at max and reports residual movement', () => {
    const result = solveScaledVector(state(), { a: 150 });

    expect(result.nextState.variables.a.value).toBe(200);
    expect(result.appliedVector.a).toBe(100);
    expect(result.residualVector.a).toBe(50);
    expect(result.hitConstraints.map((constraint) => constraint.id)).toContain('variable:a:range');
    expect(result.blocked).toBe(true);
  });

  it('clamps at min', () => {
    const result = solveScaledVector(state(), { a: -150 });

    expect(result.nextState.variables.a.value).toBe(0);
    expect(result.appliedVector.a).toBe(-100);
    expect(result.residualVector.a).toBe(-50);
  });

  it('blocks locked variables', () => {
    const result = solveScaledVector(
      state({ variables: { a: { id: 'a', value: 100, locked: true } } }),
      { a: 25 },
    );

    expect(result.scale).toBe(0);
    expect(result.nextState.variables.a.value).toBe(100);
    expect(result.hitConstraints.map((constraint) => constraint.id)).toEqual(['variable:a:locked']);
  });

  it('respects distance min and max constraints', () => {
    const distanceState = state({
      constraints: [{ id: 'gap', type: 'distance', from: 'a', to: 'b', min: 50, max: 125 }],
    });

    expect(solveScaledVector(distanceState, { a: -100 }).appliedVector.a).toBe(-25);
    expect(solveScaledVector(distanceState, { a: 75 }).appliedVector.a).toBe(50);
  });

  it('uses the strongest constraint and ignores unrelated constraints', () => {
    const result = solveScaledVector(
      state({
        variables: {
          c: { id: 'c', value: 0, min: -10, max: 10 },
        },
        constraints: [
          { id: 'loose', type: 'range', variable: 'a', max: 190 },
          { id: 'tight', type: 'range', variable: 'a', max: 160 },
          { id: 'unrelated', type: 'range', variable: 'c', max: 0 },
        ],
      }),
      { a: 100 },
    );

    expect(result.nextState.variables.a.value).toBe(160);
    expect(result.hitConstraints.map((constraint) => constraint.id)).toEqual(['tight']);
  });

  it('is independent of constraint order', () => {
    const first = solveScaledVector(
      state({
        constraints: [
          { id: 'b', type: 'range', variable: 'a', max: 160 },
          { id: 'a', type: 'range', variable: 'a', max: 180 },
        ],
      }),
      { a: 100 },
    );
    const second = solveScaledVector(
      state({
        constraints: [
          { id: 'a', type: 'range', variable: 'a', max: 180 },
          { id: 'b', type: 'range', variable: 'a', max: 160 },
        ],
      }),
      { a: 100 },
    );

    expect(first.appliedVector).toEqual(second.appliedVector);
    expect(first.hitConstraints).toEqual(second.hitConstraints);
  });
});

describe('kernel sessions', () => {
  it('previews from the activation snapshot without mutating current state', () => {
    const session = createSession(state());

    const first = preview(session, { a: 50 });
    const second = preview(session, { a: 70 });

    expect(first.nextState.variables.a.value).toBe(150);
    expect(second.nextState.variables.a.value).toBe(170);
    expect(session.currentState.variables.a.value).toBe(100);
  });

  it('commits, cancels, and keeps discarded previews from poisoning later previews', () => {
    const session = createSession(state());

    preview(session, { a: 50 });
    const second = preview(session, { a: 80 });

    expect(commit(session, second).variables.a.value).toBe(180);
    expect(cancel(session).variables.a.value).toBe(100);
  });

  it('handles empty and non-finite delta vectors deterministically', () => {
    const session = createSession(state());

    expect(preview(session, {}).nextState.variables.a.value).toBe(100);

    const invalid = preview(session, { a: Number.NaN });

    expect(invalid.diagnostics.map((item) => item.code)).toEqual(['non_finite_delta']);
    expect(invalid.nextState.variables.a.value).toBe(100);
  });
});
