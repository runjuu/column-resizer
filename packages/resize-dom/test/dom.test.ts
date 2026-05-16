import { describe, expect, it, vi } from 'vitest';

import { createPolicyRegistry } from '@column-resizer/resize-graph';
import { ResizeState, solveScaledVector } from '@column-resizer/resize-kernel';
import { crossJunctionFixture, cyclicGraphFixture } from '@column-resizer/resize-testing';

import { createResizeDomController, writeGraphStyles } from '../src';

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

function makeElement() {
  const elm = document.createElement('div');
  elm.setPointerCapture = vi.fn();
  elm.releasePointerCapture = vi.fn();
  document.body.append(elm);
  return elm;
}

describe('ResizeDomController pointer interaction', () => {
  it('creates an active session on pointerdown and ignores invalid pointers', () => {
    const graph = crossJunctionFixture();
    const controller = createResizeDomController({ graph });
    const handle = makeElement();

    controller.registerHandle('J', handle);

    handle.dispatchEvent(pointer('pointerdown', { isPrimary: false }));
    expect(controller.getActiveSession()).toBeNull();

    handle.dispatchEvent(pointer('pointerdown', { button: 2 }));
    expect(controller.getActiveSession()).toBeNull();

    handle.dispatchEvent(pointer('pointerdown', { pointerId: 12 }));
    expect(controller.getActiveSession()?.pointerId).toBe(12);
    expect(handle.setPointerCapture).toHaveBeenCalledWith(12);
  });

  it('previews graph state, ignores wrong pointer ids, commits, and releases capture', () => {
    const events: string[] = [];
    const graph = crossJunctionFixture();
    const controller = createResizeDomController({
      graph,
      onEvent: (event) => events.push(event.type),
    });
    const handle = makeElement();
    const region = makeElement();

    controller.registerHandle('J', handle);
    controller.registerRegion('top-left', region);

    handle.dispatchEvent(pointer('pointerdown', { pointerId: 4, clientX: 0, clientY: 0 }));
    handle.dispatchEvent(pointer('pointermove', { pointerId: 99, clientX: 200, clientY: 150 }));
    expect(region.style.width).toBe('');

    handle.dispatchEvent(pointer('pointermove', { pointerId: 4, clientX: 200, clientY: 150 }));
    expect(region.style.width).toBe('400px');
    expect(region.style.height).toBe('300px');

    handle.dispatchEvent(pointer('pointerup', { pointerId: 4 }));
    expect(controller.getActiveSession()).toBeNull();
    expect(controller.getState().variables.x1.value).toBe(400);
    expect(handle.releasePointerCapture).toHaveBeenCalledWith(4);
    expect(events).toEqual(['activate', 'preview', 'commit', 'deactivate']);
  });

  it('clears and restores DOM on pointercancel and lostpointercapture', () => {
    const graph = crossJunctionFixture();
    const controller = createResizeDomController({ graph });
    const handle = makeElement();
    const region = makeElement();

    controller.registerHandle('J', handle);
    controller.registerRegion('top-left', region);

    handle.dispatchEvent(pointer('pointerdown'));
    handle.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 150 }));
    expect(region.style.width).toBe('400px');

    handle.dispatchEvent(pointer('pointercancel'));
    expect(controller.getActiveSession()).toBeNull();
    expect(region.style.width).toBe('250px');

    handle.dispatchEvent(pointer('pointerdown'));
    handle.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 150 }));
    handle.dispatchEvent(pointer('lostpointercapture'));
    expect(controller.getActiveSession()).toBeNull();
    expect(region.style.width).toBe('250px');
  });

  it('normalizes RTL by flipping horizontal movement only', () => {
    const graph = crossJunctionFixture();
    const controller = createResizeDomController({ graph, rtl: true });
    const handle = makeElement();

    controller.registerHandle('J', handle);
    handle.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }));
    handle.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 50 }));
    handle.dispatchEvent(pointer('pointerup'));

    expect(controller.getState().variables.x1.value).toBe(200);
    expect(controller.getState().variables.y1.value).toBe(250);
  });

  it('honors x-only, y-only, and both-axis handles without layout reads during pointermove', () => {
    const graph = crossJunctionFixture();
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    const handle = makeElement();

    graph.handles[0] = { ...graph.handles[0], axis: 'x' };
    const xController = createResizeDomController({ graph });
    xController.registerHandle('J', handle);
    handle.dispatchEvent(pointer('pointerdown'));
    handle.dispatchEvent(pointer('pointermove', { clientX: 10, clientY: 20 }));
    handle.dispatchEvent(pointer('pointerup'));
    expect(xController.getState().variables.x1.value).toBe(260);
    expect(xController.getState().variables.y1.value).toBe(200);

    graph.handles[0] = { ...graph.handles[0], axis: 'y' };
    const yController = createResizeDomController({ graph });
    yController.registerHandle('J', handle);
    handle.dispatchEvent(pointer('pointerdown'));
    handle.dispatchEvent(pointer('pointermove', { clientX: 10, clientY: 20 }));
    handle.dispatchEvent(pointer('pointerup'));
    expect(yController.getState().variables.x1.value).toBe(250);
    expect(yController.getState().variables.y1.value).toBe(220);

    expect(rectSpy).not.toHaveBeenCalled();
  });

  it('does not mutate DOM for discarded preview movement', () => {
    const graph = crossJunctionFixture();
    const controller = createResizeDomController({
      graph,
      policyRegistry: createPolicyRegistry([
        ['discard', ({ state }) => solveScaledVector(state, {})],
      ]),
    });
    const handle = makeElement();
    const region = makeElement();

    graph.handles[0] = { ...graph.handles[0], vectorPolicy: 'discard' as never };
    controller.registerHandle('J', handle);
    controller.registerRegion('top-left', region);
    controller.writeStyles();

    handle.dispatchEvent(pointer('pointerdown'));
    handle.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 150 }));

    expect(region.style.width).toBe('250px');
    expect(region.style.height).toBe('200px');
  });
});

describe('writeGraphStyles', () => {
  it('derives region, edge, and handle geometry with fractional pixels', () => {
    const graph = crossJunctionFixture();
    graph.variables.x1.value = 250.5;
    const state = {
      variables: graph.variables,
      constraints: [],
    } satisfies ResizeState;
    const region = makeElement();
    const edge = makeElement();
    const handle = makeElement();
    const elements = {
      regions: new Map([['top-left', region]]),
      edges: new Map([['top-arm', edge]]),
      handles: new Map([['J', handle]]),
    };

    const first = writeGraphStyles(graph, state, elements);
    const second = writeGraphStyles(graph, state, elements);

    expect(region.style.left).toBe('0px');
    expect(region.style.width).toBe('250.5px');
    expect(edge.style.left).toBe('250.5px');
    expect(handle.style.top).toBe('200px');
    expect(first.writes).toBeGreaterThan(0);
    expect(second.writes).toBe(0);
  });

  it('has deterministic missing-variable fallback behavior and renders fixture geometry', () => {
    const graph = cyclicGraphFixture();
    const region = makeElement();
    const elements = {
      regions: new Map([['loop', region]]),
      edges: new Map<string, HTMLElement>(),
      handles: new Map<string, HTMLElement>(),
    };

    expect(writeGraphStyles(graph, { variables: {}, constraints: [] }, elements)).toEqual({
      writes: 0,
      missing: ['loop'],
    });
    expect(
      writeGraphStyles(graph, { variables: graph.variables, constraints: [] }, elements).missing,
    ).toEqual([]);
    expect(region.style.width).toBe('100px');
    expect(region.style.height).toBe('100px');
  });
});
