export type ResizeVariable = {
  id: string;
  value: number;
  min?: number;
  max?: number;
  locked?: boolean;
};

export type RangeConstraint = {
  id: string;
  type: 'range';
  variable: string;
  min?: number;
  max?: number;
};

export type DistanceConstraint = {
  id: string;
  type: 'distance';
  from: string;
  to: string;
  min?: number;
  max?: number;
};

export type LockedConstraint = {
  id: string;
  type: 'locked';
  variable: string;
};

export type Constraint = RangeConstraint | DistanceConstraint | LockedConstraint;

export type ResizeState = {
  variables: Record<string, ResizeVariable>;
  constraints?: Constraint[];
};

export type DeltaVector = Record<string, number>;

export type DiagnosticSeverity = 'error' | 'warning';

export type ResizeDiagnostic = {
  code: string;
  message: string;
  path: string;
  severity: DiagnosticSeverity;
};

export type SolveResult = {
  nextState: ResizeState;
  requestedVector: DeltaVector;
  appliedVector: DeltaVector;
  residualVector: DeltaVector;
  hitConstraints: Constraint[];
  changedVariables: string[];
  blocked: boolean;
  scale: number;
  diagnostics: ResizeDiagnostic[];
};

export type ResizeSession = {
  initialState: ResizeState;
  currentState: ResizeState;
  lastPreview: SolveResult | null;
};

const EPSILON = 1e-9;

function diagnostic(
  code: string,
  path: string,
  message: string,
  severity: DiagnosticSeverity = 'error',
): ResizeDiagnostic {
  return { code, path, message, severity };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function cloneConstraint(constraint: Constraint): Constraint {
  return { ...constraint };
}

function cloneState(state: ResizeState): ResizeState {
  return {
    variables: Object.fromEntries(
      Object.entries(state.variables).map(([id, variable]) => [id, { ...variable }]),
    ),
    constraints: state.constraints?.map(cloneConstraint),
  };
}

function sortedVariables(state: ResizeState): ResizeVariable[] {
  return Object.values(state.variables).sort((a, b) => a.id.localeCompare(b.id));
}

function sortedConstraints(state: ResizeState): Constraint[] {
  return [...(state.constraints ?? [])].sort((a, b) => a.id.localeCompare(b.id));
}

function sanitizeVector(vector: DeltaVector): {
  vector: DeltaVector;
  diagnostics: ResizeDiagnostic[];
} {
  const diagnostics: ResizeDiagnostic[] = [];
  const sanitized: DeltaVector = {};

  Object.entries(vector)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([variable, delta]) => {
      if (!isFiniteNumber(delta)) {
        diagnostics.push(
          diagnostic(
            'non_finite_delta',
            `delta.${variable}`,
            `Delta for variable "${variable}" must be finite.`,
          ),
        );
        return;
      }

      if (Math.abs(delta) > EPSILON) {
        sanitized[variable] = delta;
      }
    });

  return { vector: sanitized, diagnostics };
}

function syntheticConstraints(state: ResizeState): Constraint[] {
  const constraints: Constraint[] = [];

  sortedVariables(state).forEach((variable) => {
    if (variable.min !== undefined || variable.max !== undefined) {
      constraints.push({
        id: `variable:${variable.id}:range`,
        type: 'range',
        variable: variable.id,
        min: variable.min,
        max: variable.max,
      });
    }

    if (variable.locked) {
      constraints.push({
        id: `variable:${variable.id}:locked`,
        type: 'locked',
        variable: variable.id,
      });
    }
  });

  return constraints;
}

function allConstraints(state: ResizeState): Constraint[] {
  return [...syntheticConstraints(state), ...sortedConstraints(state)];
}

function finiteOptional(
  diagnostics: ResizeDiagnostic[],
  path: string,
  value: number | undefined,
): void {
  if (value !== undefined && !isFiniteNumber(value)) {
    diagnostics.push(diagnostic('non_finite_constraint_bound', path, `${path} must be finite.`));
  }
}

export function validateResizeState(state: ResizeState): ResizeDiagnostic[] {
  const diagnostics: ResizeDiagnostic[] = [];

  sortedVariables(state).forEach((variable) => {
    if (variable.id.length === 0) {
      diagnostics.push(
        diagnostic('empty_variable_id', 'variables', 'Variable ids cannot be empty.'),
      );
    }

    if (!isFiniteNumber(variable.value)) {
      diagnostics.push(
        diagnostic(
          'non_finite_variable',
          `variables.${variable.id}.value`,
          'Variable value must be finite.',
        ),
      );
    }

    finiteOptional(diagnostics, `variables.${variable.id}.min`, variable.min);
    finiteOptional(diagnostics, `variables.${variable.id}.max`, variable.max);

    if (
      variable.min !== undefined &&
      variable.max !== undefined &&
      isFiniteNumber(variable.min) &&
      isFiniteNumber(variable.max) &&
      variable.min > variable.max
    ) {
      diagnostics.push(
        diagnostic(
          'invalid_variable_range',
          `variables.${variable.id}`,
          'Variable min cannot exceed max.',
        ),
      );
    }
  });

  sortedConstraints(state).forEach((constraint) => {
    switch (constraint.type) {
      case 'range': {
        if (!state.variables[constraint.variable]) {
          diagnostics.push(
            diagnostic(
              'missing_variable',
              `constraints.${constraint.id}.variable`,
              `Constraint "${constraint.id}" references missing variable "${constraint.variable}".`,
            ),
          );
        }

        finiteOptional(diagnostics, `constraints.${constraint.id}.min`, constraint.min);
        finiteOptional(diagnostics, `constraints.${constraint.id}.max`, constraint.max);

        if (
          constraint.min !== undefined &&
          constraint.max !== undefined &&
          isFiniteNumber(constraint.min) &&
          isFiniteNumber(constraint.max) &&
          constraint.min > constraint.max
        ) {
          diagnostics.push(
            diagnostic(
              'invalid_constraint_range',
              `constraints.${constraint.id}`,
              `Constraint "${constraint.id}" min cannot exceed max.`,
            ),
          );
        }
        break;
      }
      case 'distance': {
        if (!state.variables[constraint.from]) {
          diagnostics.push(
            diagnostic(
              'missing_variable',
              `constraints.${constraint.id}.from`,
              `Constraint "${constraint.id}" references missing variable "${constraint.from}".`,
            ),
          );
        }

        if (!state.variables[constraint.to]) {
          diagnostics.push(
            diagnostic(
              'missing_variable',
              `constraints.${constraint.id}.to`,
              `Constraint "${constraint.id}" references missing variable "${constraint.to}".`,
            ),
          );
        }

        finiteOptional(diagnostics, `constraints.${constraint.id}.min`, constraint.min);
        finiteOptional(diagnostics, `constraints.${constraint.id}.max`, constraint.max);

        if (
          constraint.min !== undefined &&
          constraint.max !== undefined &&
          isFiniteNumber(constraint.min) &&
          isFiniteNumber(constraint.max) &&
          constraint.min > constraint.max
        ) {
          diagnostics.push(
            diagnostic(
              'invalid_constraint_range',
              `constraints.${constraint.id}`,
              `Constraint "${constraint.id}" min cannot exceed max.`,
            ),
          );
        }
        break;
      }
      case 'locked': {
        if (!state.variables[constraint.variable]) {
          diagnostics.push(
            diagnostic(
              'missing_variable',
              `constraints.${constraint.id}.variable`,
              `Constraint "${constraint.id}" references missing variable "${constraint.variable}".`,
            ),
          );
        }
        break;
      }
      default:
        constraint satisfies never;
    }
  });

  return diagnostics.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code));
}

function applyLimit(currentScale: number, candidate: number): number {
  if (candidate < currentScale) {
    return Math.max(0, candidate);
  }

  return currentScale;
}

function rangeLimit(
  currentValue: number,
  delta: number,
  min: number | undefined,
  max: number | undefined,
): number {
  let scale = 1;

  if (min !== undefined && delta < -EPSILON) {
    scale = applyLimit(scale, (currentValue - min) / -delta);
  }

  if (max !== undefined && delta > EPSILON) {
    scale = applyLimit(scale, (max - currentValue) / delta);
  }

  return scale;
}

function constraintLimit(state: ResizeState, vector: DeltaVector, constraint: Constraint): number {
  switch (constraint.type) {
    case 'range': {
      const variable = state.variables[constraint.variable];
      return variable
        ? rangeLimit(
            variable.value,
            vector[constraint.variable] ?? 0,
            constraint.min,
            constraint.max,
          )
        : 1;
    }
    case 'distance': {
      const from = state.variables[constraint.from];
      const to = state.variables[constraint.to];

      if (!from || !to) {
        return 1;
      }

      return rangeLimit(
        to.value - from.value,
        (vector[constraint.to] ?? 0) - (vector[constraint.from] ?? 0),
        constraint.min,
        constraint.max,
      );
    }
    case 'locked':
      return Math.abs(vector[constraint.variable] ?? 0) > EPSILON ? 0 : 1;
    default:
      constraint satisfies never;
      return 1;
  }
}

function nextStateFromVector(state: ResizeState, vector: DeltaVector, scale: number): ResizeState {
  const nextState = cloneState(state);

  Object.entries(vector).forEach(([variable, delta]) => {
    const current = nextState.variables[variable];

    if (current) {
      current.value += delta * scale;
    }
  });

  return nextState;
}

export function solveScaledVector(state: ResizeState, requestedVector: DeltaVector): SolveResult {
  const stateDiagnostics = validateResizeState(state);
  const { vector, diagnostics: deltaDiagnostics } = sanitizeVector(requestedVector);
  const diagnostics = [...stateDiagnostics, ...deltaDiagnostics];

  if (diagnostics.some((item) => item.severity === 'error')) {
    return {
      nextState: cloneState(state),
      requestedVector: { ...requestedVector },
      appliedVector: {},
      residualVector: { ...vector },
      hitConstraints: [],
      changedVariables: [],
      blocked: Object.keys(vector).length > 0,
      scale: 0,
      diagnostics,
    };
  }

  let scale = 1;
  const constraints = allConstraints(state);
  const limits = constraints.map((constraint) => ({
    constraint,
    scale: constraintLimit(state, vector, constraint),
  }));

  limits.forEach((limit) => {
    scale = Math.min(scale, Math.max(0, Math.min(1, limit.scale)));
  });

  const appliedVector: DeltaVector = {};
  const residualVector: DeltaVector = {};
  const changedVariables: string[] = [];

  Object.entries(vector).forEach(([variable, delta]) => {
    const applied = delta * scale;
    const residual = delta - applied;

    if (Math.abs(applied) > EPSILON) {
      appliedVector[variable] = applied;
      changedVariables.push(variable);
    }

    if (Math.abs(residual) > EPSILON) {
      residualVector[variable] = residual;
    }
  });

  const hitConstraints =
    scale >= 1 - EPSILON
      ? []
      : limits
          .filter((limit) => Math.abs(Math.max(0, Math.min(1, limit.scale)) - scale) <= EPSILON)
          .map((limit) => limit.constraint);

  return {
    nextState: nextStateFromVector(state, vector, scale),
    requestedVector: { ...requestedVector },
    appliedVector,
    residualVector,
    hitConstraints,
    changedVariables: changedVariables.sort(),
    blocked: scale < 1 - EPSILON && Object.keys(vector).length > 0,
    scale,
    diagnostics,
  };
}

export function createSession(state: ResizeState): ResizeSession {
  const initialState = cloneState(state);

  return {
    initialState,
    currentState: cloneState(initialState),
    lastPreview: null,
  };
}

export function preview(session: ResizeSession, requestedVector: DeltaVector): SolveResult {
  const result = solveScaledVector(session.initialState, requestedVector);
  session.lastPreview = result;
  return result;
}

export function commit(
  session: ResizeSession,
  result: SolveResult | null = session.lastPreview,
): ResizeState {
  if (result) {
    session.currentState = cloneState(result.nextState);
  }

  return cloneState(session.currentState);
}

export function cancel(session: ResizeSession): ResizeState {
  session.currentState = cloneState(session.initialState);
  session.lastPreview = null;
  return cloneState(session.currentState);
}
