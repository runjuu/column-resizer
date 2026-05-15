import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Bar, ColumnResizer, Container, Section } from '../src';

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

function mouse(type: string, clientX: number, clientY = 0) {
  return new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY });
}

function getByTestId(container: HTMLElement, testId: string): HTMLElement {
  const elm = container.querySelector(`[data-testid="${testId}"]`);

  if (elm instanceof HTMLElement) {
    return elm;
  }

  throw new Error(`Unable to find element with data-testid="${testId}"`);
}

function ResizableColumns({
  extraSection,
  columnResizerRef,
  onRightSizeChanged,
}: {
  extraSection: boolean;
  columnResizerRef?: React.RefObject<ColumnResizer | null>;
  onRightSizeChanged?: (size: number) => void;
}) {
  return (
    <Container columnResizerRef={columnResizerRef}>
      <Section data-testid="left" />
      <Bar data-testid="first-bar" size={10} />
      <Section data-testid="middle" />
      {extraSection ? (
        <>
          <Bar data-testid="second-bar" size={10} />
          <Section data-testid="right" onSizeChanged={onRightSizeChanged} />
        </>
      ) : null}
    </Container>
  );
}

let root: TestRoot;

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    const sizeByTestId: Record<string, number> = {
      left: 100,
      middle: 200,
      right: 300,
      'first-bar': 10,
      'second-bar': 10,
    };
    const size = sizeByTestId[this.getAttribute('data-testid') ?? ''] ?? 0;

    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: size,
      bottom: 0,
      width: size,
      height: 0,
      toJSON: () => ({}),
    } as DOMRect;
  });

  root = createTestRoot();
});

afterEach(() => {
  root.unmount();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('Container dynamic children', () => {
  it('updates the core item cache when a section is added after mount', () => {
    const columnResizerRef = React.createRef<ColumnResizer>();

    root.render(<ResizableColumns extraSection={false} columnResizerRef={columnResizerRef} />);
    root.render(<ResizableColumns extraSection columnResizerRef={columnResizerRef} />);

    expect(columnResizerRef.current?.getResizer().getSectionSize(2)).toBe(300);
  });

  it('wires bar listeners when a bar is added after mount', () => {
    const onRightSizeChanged = vi.fn();

    root.render(<ResizableColumns extraSection={false} />);
    root.render(<ResizableColumns extraSection onRightSizeChanged={onRightSizeChanged} />);

    getByTestId(root.container, 'second-bar').dispatchEvent(mouse('mousedown', 0));
    document.dispatchEvent(mouse('mousemove', 25));
    document.dispatchEvent(mouse('mouseup', 25));

    expect(onRightSizeChanged).toHaveBeenCalledWith(275);
  });
});
