import { afterEach, describe, expect, it, vi } from 'vitest';

import { ColumnBarConfig, ColumnSectionConfig } from '../src/column-items';
import { ColumnResizer } from '../src/column-resizer';
import { ItemType } from '../src/types';

const columnResizers: ColumnResizer[] = [];

function createColumnResizer(config: ConstructorParameters<typeof ColumnResizer>[0]) {
  const columnResizer = new ColumnResizer(config);
  columnResizers.push(columnResizer);
  return columnResizer;
}

function setAttributes(elm: HTMLElement, attrs: Record<string, unknown>) {
  Object.entries(attrs).forEach(([key, value]) => elm.setAttribute(key, String(value)));
}

function mockRect(elm: HTMLElement, size: number, vertical = false) {
  vi.spyOn(elm, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: vertical ? 0 : size,
    bottom: vertical ? size : 0,
    width: vertical ? 0 : size,
    height: vertical ? size : 0,
    toJSON: () => ({}),
  } as DOMRect);
}

function appendSection(
  columnResizer: ColumnResizer,
  container: HTMLElement,
  config: ColumnSectionConfig,
  size: number,
) {
  const elm = document.createElement('div');
  setAttributes(elm, columnResizer.attributes.section(config));
  mockRect(elm, size, columnResizer.config.vertical);
  container.append(elm);
  return elm;
}

function appendBar(
  columnResizer: ColumnResizer,
  container: HTMLElement,
  config: ColumnBarConfig,
  size: number,
) {
  const elm = document.createElement('div');
  setAttributes(elm, columnResizer.attributes.bar(config));
  mockRect(elm, size, columnResizer.config.vertical);
  container.append(elm);
  return elm;
}

function mouse(type: string, clientX: number, clientY = 0) {
  return new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY });
}

afterEach(() => {
  columnResizers.splice(0).forEach((columnResizer) => columnResizer.dispose());
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('ColumnResizer styles and attributes', () => {
  it('creates horizontal and vertical container styles', () => {
    expect(createColumnResizer({ vertical: false }).styles.container({ color: 'red' })).toEqual({
      color: 'red',
      display: 'flex',
      flexDirection: 'row',
    });
    expect(createColumnResizer({ vertical: true }).styles.container()).toEqual({
      display: 'flex',
      flexDirection: 'column',
    });
  });

  it('creates section and bar styles from config', () => {
    const horizontal = createColumnResizer({ vertical: false });
    const vertical = createColumnResizer({ vertical: true });

    expect(horizontal.styles.section({ minSize: 40, maxSize: 120 }, { color: 'red' })).toEqual({
      color: 'red',
      overflow: 'hidden',
      maxWidth: '120px',
      minWidth: '40px',
    });
    expect(vertical.styles.section({ minSize: 40, maxSize: 120 })).toEqual({
      overflow: 'hidden',
      maxHeight: '120px',
      minHeight: '40px',
    });
    expect(horizontal.styles.bar({ size: 8 }, { cursor: 'col-resize' })).toEqual({
      cursor: 'col-resize',
      flex: '0 0 8px',
    });
  });

  it('serializes item metadata into DOM attributes', () => {
    const columnResizer = createColumnResizer({ vertical: false });

    expect(columnResizer.attributes.section({ defaultSize: 100 })).toEqual({
      'data-item-type': ItemType.SECTION,
      'data-item-config': '{"defaultSize":100}',
    });
    expect(columnResizer.attributes.bar({ size: 10 })).toEqual({
      'data-item-type': ItemType.BAR,
      'data-item-config': '{"size":10}',
    });
  });
});

describe('ColumnResizer DOM behavior', () => {
  it('initializes item styles and emits section size changes from measured DOM sizes', () => {
    const columnResizer = createColumnResizer({ vertical: false });
    const container = document.createElement('div');
    const leftSection = appendSection(columnResizer, container, { defaultSize: 100 }, 100);
    const bar = appendBar(columnResizer, container, { size: 10 }, 10);
    const rightSection = appendSection(columnResizer, container, {}, 200);
    const onLeftSizeChanged = vi.fn();

    leftSection.addEventListener('section:size-change', (event) => {
      onLeftSizeChanged((event as CustomEvent<{ size: number }>).detail.size);
    });

    columnResizer.init(container);

    expect(container.style.display).toBe('flex');
    expect(container.style.flexDirection).toBe('row');
    expect(leftSection.style.overflow).toBe('hidden');
    expect(bar.style.flex).toBe('0 0 10px');
    expect(onLeftSizeChanged).toHaveBeenCalledWith(100);
    expect(leftSection.style.flexBasis).toBe('0px');
    expect(Number(leftSection.style.flexGrow)).toBeCloseTo(2 / 3);
    expect(rightSection.style.flexBasis).toBe('0px');
    expect(Number(rightSection.style.flexGrow)).toBeCloseTo(4 / 3);
  });

  it('drags a bar to resize neighboring sections and emit lifecycle events', () => {
    const columnResizer = createColumnResizer({ vertical: false });
    const container = document.createElement('div');
    const leftSection = appendSection(columnResizer, container, {}, 100);
    const bar = appendBar(columnResizer, container, { size: 10 }, 10);
    const rightSection = appendSection(columnResizer, container, {}, 200);
    const onActivate = vi.fn();
    const afterResizing = vi.fn();
    const onBarStatusChanged = vi.fn();
    const onBarClick = vi.fn();

    columnResizer.init(container);
    columnResizer.on(container, 'column:activate', onActivate);
    columnResizer.on(container, 'column:after-resizing', afterResizing);
    columnResizer.on(bar, 'bar:status-change', (event) => {
      onBarStatusChanged((event as CustomEvent<{ isActive: boolean }>).detail.isActive);
    });
    columnResizer.on(bar, 'bar:click', onBarClick);

    bar.dispatchEvent(mouse('mousedown', 0));
    document.dispatchEvent(mouse('mousemove', 25));
    document.dispatchEvent(mouse('mouseup', 25));

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(afterResizing).toHaveBeenCalledTimes(1);
    expect(onBarStatusChanged).toHaveBeenNthCalledWith(1, true);
    expect(onBarStatusChanged).toHaveBeenNthCalledWith(2, false);
    expect(onBarClick).not.toHaveBeenCalled();
    expect(Number(leftSection.style.flexGrow)).toBeCloseTo(5 / 6);
    expect(Number(rightSection.style.flexGrow)).toBeCloseTo(7 / 6);
  });

  it('emits a bar click when activation ends without movement', () => {
    const columnResizer = createColumnResizer({ vertical: false });
    const container = document.createElement('div');
    appendSection(columnResizer, container, {}, 100);
    const bar = appendBar(columnResizer, container, { size: 10 }, 10);
    appendSection(columnResizer, container, {}, 200);
    const onBarClick = vi.fn();

    columnResizer.init(container);
    columnResizer.on(bar, 'bar:click', onBarClick);

    bar.dispatchEvent(mouse('mousedown', 0));
    document.dispatchEvent(mouse('mouseup', 0));

    expect(onBarClick).toHaveBeenCalledTimes(1);
  });

  it('lets beforeApplyResizer discard an initial size application', () => {
    const beforeApplyResizer = vi.fn((resizer) => resizer.discard());
    const columnResizer = createColumnResizer({
      vertical: false,
      beforeApplyResizer,
    });
    const container = document.createElement('div');
    const leftSection = appendSection(columnResizer, container, { defaultSize: 100 }, 100);
    appendBar(columnResizer, container, { size: 10 }, 10);
    appendSection(columnResizer, container, {}, 200);
    const onLeftSizeChanged = vi.fn();

    leftSection.addEventListener('section:size-change', onLeftSizeChanged);

    columnResizer.init(container);

    expect(beforeApplyResizer).toHaveBeenCalledTimes(1);
    expect(onLeftSizeChanged).not.toHaveBeenCalled();
    expect(leftSection.style.flexBasis).toBe('100px');
  });
});
