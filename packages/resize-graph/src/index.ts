import {
  Constraint,
  DeltaVector,
  ResizeDiagnostic,
  ResizeState,
  SolveResult,
  solveScaledVector,
  validateResizeState,
} from '@column-resizer/resize-kernel';

export type ResizeAxis = 'x' | 'y' | 'both';

export type TraversalPolicy =
  | 'incident'
  | 'propagate-marked-edges'
  | 'same-group'
  | 'whole-connected-component';

export type VectorPolicyName =
  | 'scaled-vector'
  | 'independent-axis'
  | 'atomic-vector'
  | 'sequential-priority';

export type GraphPoint = {
  id: string;
  x: string;
  y: string;
  group?: string;
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  kind?: string;
  group?: string;
  propagate?: boolean;
};

export type GraphRegion = {
  id: string;
  left: string;
  right: string;
  top: string;
  bottom: string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  locked?: boolean;
  fixed?: boolean;
  group?: string;
};

export type GraphHandle = {
  id: string;
  point?: string;
  points?: string[];
  edges?: string[];
  regions?: string[];
  axis?: ResizeAxis;
  behavior?: string;
  traversal?: TraversalPolicy;
  vectorPolicy?: VectorPolicyName;
  group?: string;
};

export type ResizeGraph = {
  variables: ResizeState['variables'];
  constraints?: Constraint[];
  points: GraphPoint[];
  edges: GraphEdge[];
  regions: GraphRegion[];
  handles: GraphHandle[];
};

export type ResizeProgramPhase = {
  id: string;
  vector: DeltaVector;
  axisVectors?: Partial<Record<'x' | 'y', DeltaVector>>;
  policy?: VectorPolicyName;
  priority?: number;
};

export type ResizeProgram = {
  phases: ResizeProgramPhase[];
};

export type ResizeBehaviorContext = {
  graph: ResizeGraph;
  handle: GraphHandle;
  delta: { x: number; y: number };
};

export type ResizeBehavior = (context: ResizeBehaviorContext) => ResizeProgram;

export type ResizePolicyContext = {
  state: ResizeState;
  phase: ResizeProgramPhase;
  previousResidual: DeltaVector;
};

export type ResizePolicy = (context: ResizePolicyContext) => SolveResult;

export type BehaviorRegistry = Map<string, ResizeBehavior>;
export type PolicyRegistry = Map<string, ResizePolicy>;

export type ResizeProgramResult = {
  state: ResizeState;
  phaseResults: SolveResult[];
  residualVector: DeltaVector;
  diagnostics: ResizeDiagnostic[];
};

export type ResidualRerouteOptions = {
  traversal?: 'breadth-first' | 'depth-first';
  maxDepth?: number;
  allowedEdgeKinds?: string[];
  group?: string;
};

const GRAPH_ERROR_SEVERITY = 'error' satisfies ResizeDiagnostic['severity'];

function graphDiagnostic(code: string, path: string, message: string): ResizeDiagnostic {
  return { code, path, message, severity: GRAPH_ERROR_SEVERITY };
}

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function validateUnique<T extends { id: string }>(
  diagnostics: ResizeDiagnostic[],
  path: string,
  items: T[],
): void {
  const seen = new Set<string>();

  items.forEach((item) => {
    if (seen.has(item.id)) {
      diagnostics.push(
        graphDiagnostic('duplicate_id', `${path}.${item.id}`, `Duplicate id "${item.id}".`),
      );
    }

    seen.add(item.id);
  });
}

function validateVariableRef(
  graph: ResizeGraph,
  diagnostics: ResizeDiagnostic[],
  path: string,
  variable: string,
): void {
  if (!graph.variables[variable]) {
    diagnostics.push(graphDiagnostic('missing_variable', path, `Missing variable "${variable}".`));
  }
}

function validatePointRef(
  points: Map<string, GraphPoint>,
  diagnostics: ResizeDiagnostic[],
  path: string,
  point: string,
): void {
  if (!points.has(point)) {
    diagnostics.push(graphDiagnostic('missing_point', path, `Missing point "${point}".`));
  }
}

export function validateResizeGraph(graph: ResizeGraph): ResizeDiagnostic[] {
  const diagnostics: ResizeDiagnostic[] = [];
  const points = byId(graph.points);
  const edges = byId(graph.edges);
  const regions = byId(graph.regions);

  validateUnique(diagnostics, 'points', graph.points);
  validateUnique(diagnostics, 'edges', graph.edges);
  validateUnique(diagnostics, 'regions', graph.regions);
  validateUnique(diagnostics, 'handles', graph.handles);

  graph.points.forEach((point) => {
    validateVariableRef(graph, diagnostics, `points.${point.id}.x`, point.x);
    validateVariableRef(graph, diagnostics, `points.${point.id}.y`, point.y);
  });

  graph.edges.forEach((edge) => {
    validatePointRef(points, diagnostics, `edges.${edge.id}.from`, edge.from);
    validatePointRef(points, diagnostics, `edges.${edge.id}.to`, edge.to);
  });

  graph.regions.forEach((region) => {
    validateVariableRef(graph, diagnostics, `regions.${region.id}.left`, region.left);
    validateVariableRef(graph, diagnostics, `regions.${region.id}.right`, region.right);
    validateVariableRef(graph, diagnostics, `regions.${region.id}.top`, region.top);
    validateVariableRef(graph, diagnostics, `regions.${region.id}.bottom`, region.bottom);
  });

  graph.handles.forEach((handle) => {
    handle.point &&
      validatePointRef(points, diagnostics, `handles.${handle.id}.point`, handle.point);
    handle.points?.forEach((point) =>
      validatePointRef(points, diagnostics, `handles.${handle.id}.points.${point}`, point),
    );
    handle.edges?.forEach((edge) => {
      if (!edges.has(edge)) {
        diagnostics.push(
          graphDiagnostic(
            'missing_edge',
            `handles.${handle.id}.edges.${edge}`,
            `Missing edge "${edge}".`,
          ),
        );
      }
    });
    handle.regions?.forEach((region) => {
      if (!regions.has(region)) {
        diagnostics.push(
          graphDiagnostic(
            'missing_region',
            `handles.${handle.id}.regions.${region}`,
            `Missing region "${region}".`,
          ),
        );
      }
    });
  });

  return diagnostics.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code));
}

function regionConstraints(region: GraphRegion): Constraint[] {
  const constraints: Constraint[] = [
    {
      id: `region:${region.id}:width`,
      type: 'distance',
      from: region.left,
      to: region.right,
      min: region.fixed || region.locked ? currentDistancePlaceholder : region.minWidth,
      max: region.fixed || region.locked ? currentDistancePlaceholder : region.maxWidth,
    },
    {
      id: `region:${region.id}:height`,
      type: 'distance',
      from: region.top,
      to: region.bottom,
      min: region.fixed || region.locked ? currentDistancePlaceholder : region.minHeight,
      max: region.fixed || region.locked ? currentDistancePlaceholder : region.maxHeight,
    },
  ];

  return constraints.filter(
    (constraint) =>
      constraint.type === 'distance' &&
      (constraint.min !== undefined || constraint.max !== undefined),
  );
}

const currentDistancePlaceholder = Symbol('current-distance') as unknown as number;

function resolveCurrentDistanceConstraints(
  graph: ResizeGraph,
  constraints: Constraint[],
): Constraint[] {
  return constraints.map((constraint) => {
    if (constraint.type !== 'distance') {
      return constraint;
    }

    const from = graph.variables[constraint.from]?.value;
    const to = graph.variables[constraint.to]?.value;
    const currentDistance = from !== undefined && to !== undefined ? to - from : undefined;

    return {
      ...constraint,
      min: constraint.min === currentDistancePlaceholder ? currentDistance : constraint.min,
      max: constraint.max === currentDistancePlaceholder ? currentDistance : constraint.max,
    };
  });
}

export function graphToResizeState(graph: ResizeGraph): ResizeState {
  const constraints = [...(graph.constraints ?? []), ...graph.regions.flatMap(regionConstraints)];

  return {
    variables: Object.fromEntries(
      Object.entries(graph.variables).map(([id, variable]) => [id, { ...variable }]),
    ),
    constraints: resolveCurrentDistanceConstraints(graph, constraints),
  };
}

function incidentPoints(graph: ResizeGraph, handle: GraphHandle): Set<string> {
  const points = new Set<string>();

  if (handle.point) {
    points.add(handle.point);
  }

  handle.points?.forEach((point) => points.add(point));
  handle.edges?.forEach((edgeId) => {
    const edge = graph.edges.find((item) => item.id === edgeId);

    if (edge) {
      points.add(edge.from);
      points.add(edge.to);
    }
  });

  return points;
}

function adjacentEdges(graph: ResizeGraph, pointId: string, propagateOnly: boolean): GraphEdge[] {
  return graph.edges.filter(
    (edge) =>
      (edge.from === pointId || edge.to === pointId) && (!propagateOnly || edge.propagate === true),
  );
}

function connectedPoints(
  graph: ResizeGraph,
  start: Set<string>,
  propagateOnly: boolean,
): Set<string> {
  const selected = new Set(start);
  const queue = [...start];

  while (queue.length > 0) {
    const point = queue.shift();

    if (!point) {
      continue;
    }

    adjacentEdges(graph, point, propagateOnly).forEach((edge) => {
      const next = edge.from === point ? edge.to : edge.from;

      if (!selected.has(next)) {
        selected.add(next);
        queue.push(next);
      }
    });
  }

  return selected;
}

export function resolveHandlePoints(graph: ResizeGraph, handle: GraphHandle): Set<string> {
  const start = incidentPoints(graph, handle);
  const pointMap = byId(graph.points);

  switch (handle.traversal ?? 'incident') {
    case 'incident':
      return start;
    case 'propagate-marked-edges':
      return connectedPoints(graph, start, true);
    case 'whole-connected-component':
      return connectedPoints(graph, start, false);
    case 'same-group': {
      const seedGroup =
        handle.group ??
        [...start]
          .map((point) => pointMap.get(point)?.group)
          .find((group): group is string => typeof group === 'string');

      return new Set(
        graph.points
          .filter(
            (point) =>
              point.group === seedGroup ||
              graph.edges.some(
                (edge) =>
                  edge.group === seedGroup && (edge.from === point.id || edge.to === point.id),
              ),
          )
          .map((point) => point.id),
      );
    }
    default:
      handle.traversal satisfies never;
      return start;
  }
}

function mergeVectors(vectors: DeltaVector[]): DeltaVector {
  const merged: DeltaVector = {};

  vectors.forEach((vector) => {
    Object.entries(vector).forEach(([variable, delta]) => {
      merged[variable] = (merged[variable] ?? 0) + delta;
    });
  });

  return merged;
}

export const junctionPropagate: ResizeBehavior = ({ graph, handle, delta }) => {
  const axis = handle.axis ?? 'both';
  const points = resolveHandlePoints(graph, handle);
  const pointMap = byId(graph.points);
  const xVector: DeltaVector = {};
  const yVector: DeltaVector = {};

  points.forEach((pointId) => {
    const point = pointMap.get(pointId);

    if (!point) {
      return;
    }

    if ((axis === 'x' || axis === 'both') && delta.x !== 0) {
      xVector[point.x] = delta.x;
    }

    if ((axis === 'y' || axis === 'both') && delta.y !== 0) {
      yVector[point.y] = delta.y;
    }
  });

  return {
    phases: [
      {
        id: `${handle.id}:junction-propagate`,
        vector: mergeVectors([xVector, yVector]),
        axisVectors: { x: xVector, y: yVector },
        policy: handle.vectorPolicy ?? 'independent-axis',
        priority: 0,
      },
    ],
  };
};

export function createBehaviorRegistry(entries: [string, ResizeBehavior][] = []): BehaviorRegistry {
  return new Map<string, ResizeBehavior>([['junction-propagate', junctionPropagate], ...entries]);
}

function zeroResult(state: ResizeState, phase: ResizeProgramPhase): SolveResult {
  return solveScaledVector(state, phase.vector);
}

function independentAxisPolicy({ state, phase }: ResizePolicyContext): SolveResult {
  const xResult = solveScaledVector(state, phase.axisVectors?.x ?? {});
  const yResult = solveScaledVector(xResult.nextState, phase.axisVectors?.y ?? {});
  const requestedVector = mergeVectors([xResult.requestedVector, yResult.requestedVector]);
  const appliedVector = mergeVectors([xResult.appliedVector, yResult.appliedVector]);
  const residualVector = mergeVectors([xResult.residualVector, yResult.residualVector]);

  return {
    nextState: yResult.nextState,
    requestedVector,
    appliedVector,
    residualVector,
    hitConstraints: [...xResult.hitConstraints, ...yResult.hitConstraints],
    changedVariables: [
      ...new Set([...xResult.changedVariables, ...yResult.changedVariables]),
    ].sort(),
    blocked: xResult.blocked || yResult.blocked,
    scale: Math.min(xResult.scale, yResult.scale),
    diagnostics: [...xResult.diagnostics, ...yResult.diagnostics],
  };
}

function scaledVectorPolicy({ state, phase }: ResizePolicyContext): SolveResult {
  return solveScaledVector(state, phase.vector);
}

function sequentialPriorityPolicy(context: ResizePolicyContext): SolveResult {
  return solveScaledVector(context.state, context.phase.vector);
}

export function createPolicyRegistry(entries: [string, ResizePolicy][] = []): PolicyRegistry {
  return new Map<string, ResizePolicy>([
    ['scaled-vector', scaledVectorPolicy],
    ['atomic-vector', scaledVectorPolicy],
    ['independent-axis', independentAxisPolicy],
    ['sequential-priority', sequentialPriorityPolicy],
    ...entries,
  ]);
}

export function createResizeProgram(
  graph: ResizeGraph,
  handleId: string,
  delta: { x: number; y: number },
  registry = createBehaviorRegistry(),
): ResizeProgram {
  const handle = graph.handles.find((item) => item.id === handleId);

  if (!handle) {
    throw new Error(`Unknown resize handle "${handleId}".`);
  }

  const behavior = registry.get(handle.behavior ?? 'junction-propagate');

  if (!behavior) {
    throw new Error(`Unknown resize behavior "${handle.behavior ?? 'junction-propagate'}".`);
  }

  return behavior({ graph, handle, delta });
}

export function executeResizeProgram(
  state: ResizeState,
  program: ResizeProgram,
  registry = createPolicyRegistry(),
): ResizeProgramResult {
  let nextState: ResizeState = {
    variables: Object.fromEntries(
      Object.entries(state.variables).map(([id, variable]) => [id, { ...variable }]),
    ),
    constraints: state.constraints?.map((constraint) => ({ ...constraint })),
  };
  let residualVector: DeltaVector = {};
  const phaseResults: SolveResult[] = [];

  [...program.phases]
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || a.id.localeCompare(b.id))
    .forEach((phase) => {
      const policy = registry.get(phase.policy ?? 'scaled-vector') ?? registry.get('scaled-vector');
      const result = policy
        ? policy({ state: nextState, phase, previousResidual: residualVector })
        : zeroResult(nextState, phase);

      nextState = result.nextState;
      residualVector = mergeVectors([residualVector, result.residualVector]);
      phaseResults.push(result);
    });

  return {
    state: nextState,
    phaseResults,
    residualVector,
    diagnostics: [
      ...validateResizeState(nextState),
      ...phaseResults.flatMap((result) => result.diagnostics),
    ],
  };
}

function pointAxisForVariable(graph: ResizeGraph, variable: string): 'x' | 'y' | null {
  const point = graph.points.find((item) => item.x === variable || item.y === variable);

  if (!point) {
    return null;
  }

  return point.x === variable ? 'x' : 'y';
}

function pointsForVariable(graph: ResizeGraph, variable: string): GraphPoint[] {
  return graph.points.filter((point) => point.x === variable || point.y === variable);
}

function eligibleEdges(
  graph: ResizeGraph,
  pointId: string,
  options: ResidualRerouteOptions,
): GraphEdge[] {
  return graph.edges.filter((edge) => {
    if (edge.from !== pointId && edge.to !== pointId) {
      return false;
    }

    if (edge.propagate === false) {
      return false;
    }

    if (options.allowedEdgeKinds && !options.allowedEdgeKinds.includes(edge.kind ?? '')) {
      return false;
    }

    if (options.group && edge.group && edge.group !== options.group) {
      return false;
    }

    return true;
  });
}

function residualTargets(
  graph: ResizeGraph,
  sourceVariable: string,
  options: ResidualRerouteOptions,
): string[] {
  const axis = pointAxisForVariable(graph, sourceVariable);
  const start = pointsForVariable(graph, sourceVariable);
  const visited = new Set(start.map((point) => point.id));
  const queue = start.map((point) => ({ point, depth: 0 }));
  const targets: string[] = [];
  const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;

  if (!axis) {
    return [];
  }

  while (queue.length > 0) {
    const item = options.traversal === 'depth-first' ? queue.pop() : queue.shift();

    if (!item || item.depth >= maxDepth) {
      continue;
    }

    eligibleEdges(graph, item.point.id, options).forEach((edge) => {
      const nextPointId = edge.from === item.point.id ? edge.to : edge.from;
      const nextPoint = graph.points.find((point) => point.id === nextPointId);

      if (!nextPoint || visited.has(nextPoint.id)) {
        return;
      }

      if (options.group && nextPoint.group && nextPoint.group !== options.group) {
        return;
      }

      visited.add(nextPoint.id);
      targets.push(axis === 'x' ? nextPoint.x : nextPoint.y);
      queue.push({ point: nextPoint, depth: item.depth + 1 });
    });
  }

  return [...new Set(targets)].filter((target) => target !== sourceVariable);
}

function rerouteDiagnostic(code: string, path: string, message: string): ResizeDiagnostic {
  return { code, path, message, severity: 'warning' };
}

export function executeResizeProgramWithResidualRerouting(
  graph: ResizeGraph,
  state: ResizeState,
  program: ResizeProgram,
  options: ResidualRerouteOptions = {},
  registry = createPolicyRegistry(),
): ResizeProgramResult {
  const primary = executeResizeProgram(state, program, registry);
  let nextState = primary.state;
  const phaseResults = [...primary.phaseResults];
  const diagnostics = [...primary.diagnostics];
  const finalResidual: DeltaVector = {};

  Object.entries(primary.residualVector).forEach(([sourceVariable, delta]) => {
    let remaining = delta;

    residualTargets(graph, sourceVariable, options).forEach((targetVariable) => {
      if (Math.abs(remaining) <= 1e-9) {
        return;
      }

      const result = solveScaledVector(nextState, { [targetVariable]: remaining });

      phaseResults.push(result);
      nextState = result.nextState;
      remaining = result.residualVector[targetVariable] ?? 0;
      diagnostics.push(
        rerouteDiagnostic(
          'residual_rerouted',
          `reroute.${sourceVariable}.${targetVariable}`,
          `Rerouted residual movement from "${sourceVariable}" to "${targetVariable}".`,
        ),
      );
    });

    if (Math.abs(remaining) > 1e-9) {
      finalResidual[sourceVariable] = remaining;
      diagnostics.push(
        rerouteDiagnostic(
          'residual_unapplied',
          `reroute.${sourceVariable}`,
          `Residual movement for "${sourceVariable}" could not be fully applied.`,
        ),
      );
    }
  });

  return {
    state: nextState,
    phaseResults,
    residualVector: finalResidual,
    diagnostics,
  };
}
