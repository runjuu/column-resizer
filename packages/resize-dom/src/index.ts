import {
  BehaviorRegistry,
  PolicyRegistry,
  ResizeGraph,
  createBehaviorRegistry,
  createPolicyRegistry,
  createResizeProgram,
  executeResizeProgram,
  graphToResizeState,
} from '@column-resizer/resize-graph';
import type { ResizeState } from '@column-resizer/resize-kernel';
import { createSession } from '@column-resizer/resize-kernel';

export type ResizeDomEventName = 'activate' | 'preview' | 'commit' | 'cancel' | 'deactivate';

export type ResizeDomEvent = {
  type: ResizeDomEventName;
  handleId: string;
  state: ResizeState;
};

export type ResizeDomControllerOptions = {
  graph: ResizeGraph;
  rtl?: boolean;
  behaviorRegistry?: BehaviorRegistry;
  policyRegistry?: PolicyRegistry;
  onEvent?: (event: ResizeDomEvent) => void;
};

export type RegisteredElements = {
  regions: Map<string, HTMLElement>;
  edges: Map<string, HTMLElement>;
  handles: Map<string, HTMLElement>;
};

type PointerLike = PointerEvent & {
  isPrimary?: boolean;
};

type ActivePointerSession = {
  pointerId: number;
  handleId: string;
  element: HTMLElement;
  startX: number;
  startY: number;
  session: ReturnType<typeof createSession>;
  previewState: ResizeState | null;
};

function cloneState(state: ResizeState): ResizeState {
  return {
    variables: Object.fromEntries(
      Object.entries(state.variables).map(([id, variable]) => [id, { ...variable }]),
    ),
    constraints: state.constraints?.map((constraint) => ({ ...constraint })),
  };
}

function value(state: ResizeState, variable: string): number | null {
  return state.variables[variable]?.value ?? null;
}

function setStyle(
  elm: HTMLElement,
  property: keyof CSSStyleDeclaration,
  nextValue: string,
): boolean {
  if (elm.style[property] === nextValue) {
    return false;
  }

  elm.style[property] = nextValue;
  return true;
}

function px(valueToFormat: number): string {
  return `${valueToFormat}px`;
}

export type StyleWriteResult = {
  writes: number;
  missing: string[];
};

export function writeGraphStyles(
  graph: ResizeGraph,
  state: ResizeState,
  elements: RegisteredElements,
): StyleWriteResult {
  let writes = 0;
  const missing: string[] = [];
  const set = (elm: HTMLElement, property: keyof CSSStyleDeclaration, nextValue: string) => {
    writes += setStyle(elm, property, nextValue) ? 1 : 0;
  };

  graph.regions.forEach((region) => {
    const elm = elements.regions.get(region.id);

    if (!elm) {
      return;
    }

    const left = value(state, region.left);
    const right = value(state, region.right);
    const top = value(state, region.top);
    const bottom = value(state, region.bottom);

    if (left === null || right === null || top === null || bottom === null) {
      missing.push(region.id);
      return;
    }

    set(elm, 'position', 'absolute');
    set(elm, 'left', px(left));
    set(elm, 'top', px(top));
    set(elm, 'width', px(right - left));
    set(elm, 'height', px(bottom - top));
  });

  graph.edges.forEach((edge) => {
    const elm = elements.edges.get(edge.id);
    const from = graph.points.find((point) => point.id === edge.from);
    const to = graph.points.find((point) => point.id === edge.to);

    if (!elm || !from || !to) {
      return;
    }

    const x1 = value(state, from.x);
    const y1 = value(state, from.y);
    const x2 = value(state, to.x);
    const y2 = value(state, to.y);

    if (x1 === null || y1 === null || x2 === null || y2 === null) {
      missing.push(edge.id);
      return;
    }

    set(elm, 'position', 'absolute');
    set(elm, 'left', px(Math.min(x1, x2)));
    set(elm, 'top', px(Math.min(y1, y2)));
    set(elm, 'width', px(Math.abs(x2 - x1)));
    set(elm, 'height', px(Math.abs(y2 - y1)));
  });

  graph.handles.forEach((handle) => {
    const elm = elements.handles.get(handle.id);
    const point = graph.points.find((item) => item.id === handle.point);

    if (!elm || !point) {
      return;
    }

    const left = value(state, point.x);
    const top = value(state, point.y);

    if (left === null || top === null) {
      missing.push(handle.id);
      return;
    }

    set(elm, 'position', 'absolute');
    set(elm, 'left', px(left));
    set(elm, 'top', px(top));
  });

  return { writes, missing };
}

function eventPointerId(event: PointerLike): number {
  return typeof event.pointerId === 'number' ? event.pointerId : 1;
}

export class ResizeDomController {
  readonly elements: RegisteredElements = {
    regions: new Map(),
    edges: new Map(),
    handles: new Map(),
  };

  private state: ResizeState;
  private activeSession: ActivePointerSession | null = null;
  private readonly behaviorRegistry: BehaviorRegistry;
  private readonly policyRegistry: PolicyRegistry;

  constructor(private readonly options: ResizeDomControllerOptions) {
    this.state = graphToResizeState(options.graph);
    this.behaviorRegistry = options.behaviorRegistry ?? createBehaviorRegistry();
    this.policyRegistry = options.policyRegistry ?? createPolicyRegistry();
  }

  getState(): ResizeState {
    return cloneState(this.state);
  }

  getActiveSession(): ActivePointerSession | null {
    return this.activeSession;
  }

  registerRegion(regionId: string, element: HTMLElement | null): () => void {
    return this.register(this.elements.regions, regionId, element);
  }

  registerEdge(edgeId: string, element: HTMLElement | null): () => void {
    return this.register(this.elements.edges, edgeId, element);
  }

  registerHandle(handleId: string, element: HTMLElement | null): () => void {
    const cleanup = this.register(this.elements.handles, handleId, element);

    if (element) {
      const onPointerDown = (event: PointerEvent) =>
        this.onPointerDown(handleId, element, event as PointerLike);
      element.addEventListener('pointerdown', onPointerDown);
      return () => {
        element.removeEventListener('pointerdown', onPointerDown);
        cleanup();
      };
    }

    return cleanup;
  }

  writeStyles(): StyleWriteResult {
    return writeGraphStyles(this.options.graph, this.state, this.elements);
  }

  dispose(): void {
    this.cancelActiveSession('cancel');
    this.elements.regions.clear();
    this.elements.edges.clear();
    this.elements.handles.clear();
  }

  private register(
    map: Map<string, HTMLElement>,
    id: string,
    element: HTMLElement | null,
  ): () => void {
    if (element) {
      map.set(id, element);
    }

    return () => {
      if (element && map.get(id) === element) {
        map.delete(id);
      }
    };
  }

  private onPointerDown(handleId: string, element: HTMLElement, event: PointerLike): void {
    if (event.isPrimary === false || event.button !== 0) {
      return;
    }

    this.cancelActiveSession('cancel');

    this.activeSession = {
      pointerId: eventPointerId(event),
      handleId,
      element,
      startX: event.clientX,
      startY: event.clientY,
      session: createSession(this.state),
      previewState: null,
    };

    element.setPointerCapture?.(eventPointerId(event));
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerCancel);
    element.addEventListener('lostpointercapture', this.onLostPointerCapture);
    this.emit('activate', handleId, this.state);
  }

  private onPointerMove = (event: Event): void => {
    const pointerEvent = event as PointerLike;
    const active = this.activeSession;

    if (!active || eventPointerId(pointerEvent) !== active.pointerId) {
      return;
    }

    const dx = (pointerEvent.clientX - active.startX) * (this.options.rtl ? -1 : 1);
    const dy = pointerEvent.clientY - active.startY;
    const program = createResizeProgram(
      this.options.graph,
      active.handleId,
      { x: dx, y: dy },
      this.behaviorRegistry,
    );
    const result = executeResizeProgram(active.session.initialState, program, this.policyRegistry);

    active.previewState = result.state;
    writeGraphStyles(this.options.graph, result.state, this.elements);
    this.emit('preview', active.handleId, result.state);
  };

  private onPointerUp = (event: Event): void => {
    const pointerEvent = event as PointerLike;
    const active = this.activeSession;

    if (!active || eventPointerId(pointerEvent) !== active.pointerId) {
      return;
    }

    this.state = cloneState(active.previewState ?? active.session.initialState);
    this.cleanupActiveListeners(active, 'commit');
    this.emit('commit', active.handleId, this.state);
    this.emit('deactivate', active.handleId, this.state);
    this.activeSession = null;
  };

  private onPointerCancel = (event: Event): void => {
    const pointerEvent = event as PointerLike;
    const active = this.activeSession;

    if (!active || eventPointerId(pointerEvent) !== active.pointerId) {
      return;
    }

    this.cancelActiveSession('cancel');
  };

  private onLostPointerCapture = (event: Event): void => {
    const pointerEvent = event as PointerLike;
    const active = this.activeSession;

    if (!active || eventPointerId(pointerEvent) !== active.pointerId) {
      return;
    }

    this.cancelActiveSession('cancel');
  };

  private cancelActiveSession(type: 'cancel' | 'commit'): void {
    const active = this.activeSession;

    if (!active) {
      return;
    }

    this.cleanupActiveListeners(active, type);
    writeGraphStyles(this.options.graph, this.state, this.elements);
    this.emit('cancel', active.handleId, this.state);
    this.emit('deactivate', active.handleId, this.state);
    this.activeSession = null;
  }

  private cleanupActiveListeners(active: ActivePointerSession, type: 'cancel' | 'commit'): void {
    active.element.removeEventListener('pointermove', this.onPointerMove);
    active.element.removeEventListener('pointerup', this.onPointerUp);
    active.element.removeEventListener('pointercancel', this.onPointerCancel);
    active.element.removeEventListener('lostpointercapture', this.onLostPointerCapture);

    if (type === 'commit' || type === 'cancel') {
      active.element.releasePointerCapture?.(active.pointerId);
    }
  }

  private emit(type: ResizeDomEventName, handleId: string, state: ResizeState): void {
    this.options.onEvent?.({ type, handleId, state: cloneState(state) });
  }
}

export function createResizeDomController(
  options: ResizeDomControllerOptions,
): ResizeDomController {
  return new ResizeDomController(options);
}
