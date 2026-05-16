import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBehaviorRegistry } from '@column-resizer/resize-graph';
import { crossJunctionFixture } from '@column-resizer/resize-testing';

import {
  ResizeDomController,
  ResizeEdge,
  ResizeGraphProvider,
  ResizeHandle,
  ResizeRegion,
  useResizeEvents,
  useResizeGraph,
} from '../src';

type TestRoot = {
  container: HTMLElement;
  render: (children: React.ReactNode) => void;
  unmount: () => void;
};

function createTestRoot(): TestRoot {
  const container = document.createElement('div');
  const root = createRoot(container);

  document.body.append(container);

  return {
    container,
    render(children) {
      act(() => root.render(children));
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function pointer(type: string, init: Partial<PointerEvent> = {}): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const defaults = {
    button: 0,
    clientX: 0,
    clientY: 0,
    isPrimary: true,
    pointerId: 1,
  };

  Object.entries({ ...defaults, ...init }).forEach(([key, value]) => {
    Object.defineProperty(event, key, { configurable: true, value });
  });

  return event;
}

function byTestId(container: HTMLElement, testId: string): HTMLElement {
  const elm = container.querySelector(`[data-testid="${testId}"]`);

  if (elm instanceof HTMLElement) {
    return elm;
  }

  throw new Error(`Missing ${testId}`);
}

function ExposeController({
  onController,
}: { onController: (controller: ResizeDomController) => void }) {
  const controller = useResizeGraph();

  React.useEffect(() => {
    onController(controller);
  }, [controller, onController]);

  return null;
}

function EventSubscriber({ onEvent }: { onEvent: (eventType: string) => void }) {
  useResizeEvents(React.useCallback((event) => onEvent(event.type), [onEvent]));
  return null;
}

function GraphView({
  onController,
  onEvent,
}: {
  onController?: (controller: ResizeDomController) => void;
  onEvent?: (eventType: string) => void;
}) {
  return (
    <>
      {onController ? <ExposeController onController={onController} /> : null}
      {onEvent ? <EventSubscriber onEvent={onEvent} /> : null}
      <ResizeRegion data-testid="region" regionId="top-left" />
      <ResizeEdge data-testid="edge" edgeId="top-arm" />
      <ResizeHandle data-testid="handle" handleId="J" />
    </>
  );
}

let root: TestRoot;

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  root = createTestRoot();
});

afterEach(() => {
  root.unmount();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('ResizeGraphProvider and registration', () => {
  it('creates one controller and registers/unregisters regions, edges, and handles', () => {
    const graph = crossJunctionFixture();
    let controller: ResizeDomController | null = null;
    const onController = vi.fn((nextController: ResizeDomController) => {
      controller = nextController;
    });

    root.render(
      <ResizeGraphProvider graph={graph}>
        <GraphView onController={onController} />
      </ResizeGraphProvider>,
    );
    root.render(
      <ResizeGraphProvider graph={graph}>
        <GraphView onController={onController} />
      </ResizeGraphProvider>,
    );

    expect(onController).toHaveBeenCalledTimes(1);
    expect(controller?.elements.regions.has('top-left')).toBe(true);
    expect(controller?.elements.edges.has('top-arm')).toBe(true);
    expect(controller?.elements.handles.has('J')).toBe(true);

    root.render(<ResizeGraphProvider graph={graph} />);

    expect(controller?.elements.regions.size).toBe(0);
    expect(controller?.elements.edges.size).toBe(0);
    expect(controller?.elements.handles.size).toBe(0);
  });

  it('forwards public component refs while registering elements', () => {
    const graph = crossJunctionFixture();
    const regionRef = React.createRef<HTMLDivElement>();
    const edgeRef = React.createRef<HTMLDivElement>();
    const handleRef = React.createRef<HTMLDivElement>();
    let controller: ResizeDomController | null = null;

    root.render(
      <ResizeGraphProvider graph={graph}>
        <GraphView onController={(nextController) => (controller = nextController)} />
        <ResizeRegion data-testid="ref-region" ref={regionRef} regionId="top-right" />
        <ResizeEdge data-testid="ref-edge" ref={edgeRef} edgeId="right-arm" />
        <ResizeHandle data-testid="ref-handle" ref={handleRef} handleId="J" />
      </ResizeGraphProvider>,
    );

    expect(regionRef.current).toBe(byTestId(root.container, 'ref-region'));
    expect(edgeRef.current).toBe(byTestId(root.container, 'ref-edge'));
    expect(handleRef.current).toBe(byTestId(root.container, 'ref-handle'));
    expect(controller?.elements.regions.get('top-right')).toBe(regionRef.current);
    expect(controller?.elements.edges.get('right-arm')).toBe(edgeRef.current);
    expect(controller?.elements.handles.get('J')).toBe(handleRef.current);
  });

  it('dragging a handle updates region styles and preserves an active session across rerender', () => {
    const graph = crossJunctionFixture();
    let controller: ResizeDomController | null = null;

    root.render(
      <ResizeGraphProvider graph={graph}>
        <GraphView onController={(nextController) => (controller = nextController)} />
      </ResizeGraphProvider>,
    );

    const handle = byTestId(root.container, 'handle');
    const region = byTestId(root.container, 'region');

    act(() => {
      handle.dispatchEvent(pointer('pointerdown'));
    });
    root.render(
      <ResizeGraphProvider graph={graph}>
        <GraphView onController={(nextController) => (controller = nextController)} />
      </ResizeGraphProvider>,
    );
    act(() => {
      handle.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 150 }));
    });

    expect(controller?.getActiveSession()).not.toBeNull();
    expect(region.style.width).toBe('400px');
    expect(region.style.height).toBe('300px');
  });

  it('unmount during drag cleans up the active controller', () => {
    const graph = crossJunctionFixture();
    let controller: ResizeDomController | null = null;

    root.render(
      <ResizeGraphProvider graph={graph}>
        <GraphView onController={(nextController) => (controller = nextController)} />
      </ResizeGraphProvider>,
    );

    act(() => {
      byTestId(root.container, 'handle').dispatchEvent(pointer('pointerdown'));
    });
    root.unmount();

    expect(controller?.getActiveSession()).toBeNull();
  });

  it('graph and behavior registry prop changes rebuild intentionally', () => {
    const firstGraph = crossJunctionFixture();
    const secondGraph = { ...crossJunctionFixture(), handles: [...crossJunctionFixture().handles] };
    const controllers: ResizeDomController[] = [];
    const registry = createBehaviorRegistry();

    root.render(
      <ResizeGraphProvider graph={firstGraph}>
        <GraphView onController={(controller) => controllers.push(controller)} />
      </ResizeGraphProvider>,
    );
    root.render(
      <ResizeGraphProvider graph={secondGraph}>
        <GraphView onController={(controller) => controllers.push(controller)} />
      </ResizeGraphProvider>,
    );
    root.render(
      <ResizeGraphProvider graph={secondGraph} behaviorRegistry={registry}>
        <GraphView onController={(controller) => controllers.push(controller)} />
      </ResizeGraphProvider>,
    );

    expect(new Set(controllers).size).toBe(3);
  });

  it('multiple and nested providers are isolated', () => {
    const graph = crossJunctionFixture();

    root.render(
      <>
        <ResizeGraphProvider graph={graph}>
          <ResizeRegion data-testid="outer-region" regionId="top-left" />
          <ResizeHandle data-testid="outer-handle" handleId="J" />
          <ResizeGraphProvider graph={graph}>
            <ResizeRegion data-testid="inner-region" regionId="top-left" />
            <ResizeHandle data-testid="inner-handle" handleId="J" />
          </ResizeGraphProvider>
        </ResizeGraphProvider>
        <ResizeGraphProvider graph={graph}>
          <ResizeRegion data-testid="second-region" regionId="top-left" />
          <ResizeHandle data-testid="second-handle" handleId="J" />
        </ResizeGraphProvider>
      </>,
    );

    act(() => {
      byTestId(root.container, 'inner-handle').dispatchEvent(pointer('pointerdown'));
      byTestId(root.container, 'inner-handle').dispatchEvent(
        pointer('pointermove', { clientX: 200, clientY: 150 }),
      );
    });

    expect(byTestId(root.container, 'inner-region').style.width).toBe('400px');
    expect(byTestId(root.container, 'outer-region').style.width).toBe('250px');
    expect(byTestId(root.container, 'second-region').style.width).toBe('250px');
  });

  it('invokes custom behavior and emits ordered lifecycle events without duplicate listeners', () => {
    const graph = crossJunctionFixture();
    const behavior = vi.fn(() => ({ phases: [{ id: 'custom', vector: { x1: 10 } }] }));
    const events: string[] = [];
    const registry = createBehaviorRegistry([['custom', behavior]]);
    graph.handles[0] = { ...graph.handles[0], behavior: 'custom' };

    root.render(
      <ResizeGraphProvider
        graph={graph}
        behaviorRegistry={registry}
        onEvent={(event) => events.push(event.type)}
      >
        <GraphView onEvent={(eventType) => events.push(`hook:${eventType}`)} />
      </ResizeGraphProvider>,
    );

    const handle = byTestId(root.container, 'handle');
    const addSpy = vi.spyOn(handle, 'addEventListener');

    root.render(
      <ResizeGraphProvider
        graph={graph}
        behaviorRegistry={registry}
        onEvent={(event) => events.push(event.type)}
      >
        <GraphView onEvent={(eventType) => events.push(`hook:${eventType}`)} />
      </ResizeGraphProvider>,
    );

    act(() => {
      handle.dispatchEvent(pointer('pointerdown'));
      handle.dispatchEvent(pointer('pointermove', { clientX: 10 }));
      handle.dispatchEvent(pointer('pointerup'));
    });

    expect(behavior).toHaveBeenCalledTimes(1);
    expect(events).toEqual([
      'activate',
      'hook:activate',
      'preview',
      'hook:preview',
      'commit',
      'hook:commit',
      'deactivate',
      'hook:deactivate',
    ]);
    expect(addSpy).not.toHaveBeenCalledWith('pointerdown', expect.any(Function));
  });
});
