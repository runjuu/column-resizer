import { afterEach, describe, expect, it, vi } from 'vitest';

import { BarActionType, ItemType, SizeInfo } from '../src/types';
import {
  BarActionScanResult,
  ResizerEventHub,
  calculateCoordinateOffset,
  collectSizeRelatedInfo,
  createBarStore,
  getNextSizeRelatedInfo,
  isDisabledResponsive,
  isSolidItem,
  isValidNumber,
  isValidType,
  parseItemConfig,
  parseResizerItems,
  resizerItemAttributes,
} from '../src/utils';

function sizeInfo(currentSize: number, config: Partial<SizeInfo> = {}): SizeInfo {
  return {
    elm: document.createElement('div'),
    isSolid: false,
    currentSize,
    ...config,
  };
}

function currentSizes({ sizeInfoArray }: { sizeInfoArray: SizeInfo[] }) {
  return sizeInfoArray.map(({ currentSize }) => currentSize);
}

function setAttributes(elm: HTMLElement, attrs: Record<string, unknown>) {
  Object.entries(attrs).forEach(([key, value]) => elm.setAttribute(key, String(value)));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('coordinate offsets', () => {
  it('calculates x and y offsets against the previous coordinate', () => {
    expect(calculateCoordinateOffset({ x: 14, y: 7 }, { x: 4, y: -3 })).toEqual({
      x: 10,
      y: 10,
    });
  });

  it('returns a zero offset when there is no previous coordinate', () => {
    expect(calculateCoordinateOffset({ x: 14, y: 7 }, null)).toEqual({ x: 0, y: 0 });
  });
});

describe('config parsing and validation', () => {
  it('accepts only positive finite numbers as valid sizes', () => {
    expect(isValidNumber(1)).toBe(true);
    expect(isValidNumber(0)).toBe(false);
    expect(isValidNumber(-1)).toBe(false);
    expect(isValidNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidNumber(undefined)).toBe(false);
  });

  it('detects solid and disabled-responsive section config', () => {
    expect(isSolidItem({ size: 120 })).toBe(true);
    expect(isSolidItem({ defaultSize: 120 })).toBe(false);
    expect(isDisabledResponsive({ size: 120 })).toBe(true);
    expect(isDisabledResponsive({ size: 120, disableResponsive: false })).toBe(false);
    expect(isDisabledResponsive({ disableResponsive: true })).toBe(true);
  });

  it('recognizes supported item types only', () => {
    expect(isValidType(ItemType.BAR)).toBe(true);
    expect(isValidType(ItemType.SECTION)).toBe(true);
    expect(isValidType('UNKNOWN')).toBe(false);
    expect(isValidType(null)).toBe(false);
  });

  it('parses only valid resizer item elements from container children', () => {
    const container = document.createElement('div');
    const section = document.createElement('section');
    const bar = document.createElement('button');
    const invalid = document.createElement('div');

    setAttributes(section, resizerItemAttributes(ItemType.SECTION)({ defaultSize: 100 }));
    setAttributes(bar, resizerItemAttributes(ItemType.BAR)({ size: 10 }));
    invalid.setAttribute('data-item-type', 'UNKNOWN');

    container.append('text', section, invalid, bar);

    expect(parseResizerItems(container)).toEqual([
      { type: ItemType.SECTION, elm: section },
      { type: ItemType.BAR, elm: bar },
    ]);
  });

  it('parses object item config and falls back to an empty object for invalid config', () => {
    const elm = document.createElement('div');
    elm.setAttribute('data-item-config', '{"size":120}');
    expect(parseItemConfig({ elm })).toEqual({ size: 120 });

    elm.setAttribute('data-item-config', '123');
    expect(parseItemConfig({ elm })).toEqual({});

    elm.setAttribute('data-item-config', '{');
    expect(parseItemConfig({ elm })).toEqual({});
  });
});

describe('size collection and resizing', () => {
  it('calculates flex growth from responsive children only', () => {
    const { collect, getResult } = collectSizeRelatedInfo();

    collect(sizeInfo(100));
    collect(sizeInfo(10, { disableResponsive: true, isSolid: true }));
    collect(sizeInfo(300));

    expect(getResult()).toMatchObject({
      sizeInfoArray: expect.any(Array),
      flexGrowRatio: 2 / 400,
    });
  });

  it('resizes both sides of a bar and preserves total responsive size', () => {
    const result = getNextSizeRelatedInfo(
      1,
      25,
      [sizeInfo(100), sizeInfo(10, { isSolid: true, disableResponsive: true }), sizeInfo(200)],
      false,
    );

    expect(currentSizes(result)).toEqual([125, 10, 175]);
    expect(result.flexGrowRatio).toBe(2 / 300);
  });

  it('limits resize movement when one side hits its min size', () => {
    const result = getNextSizeRelatedInfo(
      1,
      30,
      [
        sizeInfo(100),
        sizeInfo(10, { isSolid: true, disableResponsive: true }),
        sizeInfo(100, { minSize: 90 }),
      ],
      false,
    );

    expect(currentSizes(result)).toEqual([110, 10, 90]);
  });

  it('flips resize direction when configured for right-to-left horizontal resizing', () => {
    const leftSection = sizeInfo(100);
    const bar = sizeInfo(10, { isSolid: true, disableResponsive: true });
    const rightSection = sizeInfo(200);
    const result = getNextSizeRelatedInfo(1, 25, [leftSection, bar, rightSection], true);

    expect(currentSizes(result)).toEqual([75, 10, 225]);
    expect(result.sizeInfoArray[0].elm).toBe(leftSection.elm);
    expect(result.sizeInfoArray[2].elm).toBe(rightSection.elm);
  });
});

describe('bar store', () => {
  it('tracks activation, movement, and deactivation states for subscribers', () => {
    const states: BarActionScanResult[] = [];
    const store = createBarStore({
      calculateOffset: (current, original) => current.x - original.x,
      getSizeRelatedInfo: () => ({
        sizeInfoArray: [
          sizeInfo(100),
          sizeInfo(10, { isSolid: true, disableResponsive: true }),
          sizeInfo(200),
        ],
        flexGrowRatio: 2 / 300,
      }),
    });

    store.subscribe((state) => states.push(state));

    store.dispatch({ type: BarActionType.ACTIVATE, barIndex: 1, coordinate: { x: 5, y: 0 } });
    store.dispatch({ type: BarActionType.MOVE, barIndex: 1, coordinate: { x: 30, y: 0 } });
    store.dispatch({ type: BarActionType.DEACTIVATE, barIndex: 1, coordinate: { x: 30, y: 0 } });

    expect(states).toHaveLength(3);
    expect(states[0]).toMatchObject({
      type: BarActionType.ACTIVATE,
      barIndex: 1,
      originalCoordinate: { x: 5, y: 0 },
      discard: true,
    });
    expect(states[1]).toMatchObject({
      type: BarActionType.MOVE,
      barIndex: 1,
      offset: 25,
      discard: false,
    });
    expect(currentSizes(states[1])).toEqual([125, 10, 175]);
    expect(states[2]).toMatchObject({
      type: BarActionType.DEACTIVATE,
      discard: true,
    });
  });
});

describe('resizer events', () => {
  it('removes disposed watchers from the reset queue', () => {
    const eventHub = new ResizerEventHub();
    const elm = document.createElement('div');
    const onClick = vi.fn();
    const removeEventListener = vi.spyOn(elm, 'removeEventListener');

    const dispose = eventHub.watchResizerEvent(elm, 'bar:click', onClick);
    dispose();
    dispose();
    eventHub.reset();

    elm.dispatchEvent(new CustomEvent('bar:click', { detail: null }));

    expect(onClick).not.toHaveBeenCalled();
    expect(removeEventListener).toHaveBeenCalledTimes(1);
  });
});
