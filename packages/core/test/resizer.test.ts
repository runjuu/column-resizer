import { afterEach, describe, expect, it } from 'vitest';

import { Resizer } from '../src/resizer';
import { BarActionType, SizeInfo, SizeRelatedInfo } from '../src/types';
import { BarActionScanResult } from '../src/utils';

function sizeInfo(currentSize: number, config: Partial<SizeInfo> = {}): SizeInfo {
  return {
    elm: document.createElement('div'),
    isSolid: false,
    currentSize,
    ...config,
  };
}

function sizeResult(sizeInfoArray: SizeInfo[]): SizeRelatedInfo {
  return {
    sizeInfoArray,
    flexGrowRatio: 1,
  };
}

function currentSizes(resizer: Resizer) {
  return resizer.getResult().sizeInfoArray.map(({ currentSize }) => currentSize);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Resizer', () => {
  it('moves a bar by resizing the adjacent sections', () => {
    const resizer = new Resizer(
      sizeResult([
        sizeInfo(100),
        sizeInfo(10, { isSolid: true, disableResponsive: true }),
        sizeInfo(200),
      ]),
    );

    resizer.moveBar(0, { withOffset: 25 });

    expect(currentSizes(resizer)).toEqual([125, 10, 175]);
    expect(resizer.getSectionSize(0)).toBe(125);
    expect(resizer.getSectionSize(1)).toBe(175);
    expect(resizer.getTotalSize()).toBe(300);
  });

  it('resizes a section by moving its right bar by default', () => {
    const resizer = new Resizer(
      sizeResult([
        sizeInfo(100),
        sizeInfo(10, { isSolid: true, disableResponsive: true }),
        sizeInfo(200),
        sizeInfo(10, { isSolid: true, disableResponsive: true }),
        sizeInfo(300),
      ]),
    );

    resizer.resizeSection(0, { toSize: 130 });

    expect(currentSizes(resizer)).toEqual([130, 10, 170, 10, 300]);
  });

  it('resizes the last section by moving its left bar', () => {
    const resizer = new Resizer(
      sizeResult([
        sizeInfo(100),
        sizeInfo(10, { isSolid: true, disableResponsive: true }),
        sizeInfo(200),
        sizeInfo(10, { isSolid: true, disableResponsive: true }),
        sizeInfo(300),
      ]),
    );

    resizer.resizeSection(2, { toSize: 250 });

    expect(currentSizes(resizer)).toEqual([100, 10, 250, 10, 250]);
  });

  it('can resize a middle section by preferring its left bar', () => {
    const resizer = new Resizer(
      sizeResult([
        sizeInfo(100),
        sizeInfo(10, { isSolid: true, disableResponsive: true }),
        sizeInfo(200),
        sizeInfo(10, { isSolid: true, disableResponsive: true }),
        sizeInfo(300),
      ]),
    );

    resizer.resizeSection(1, { toSize: 250, preferMoveLeftBar: true });

    expect(currentSizes(resizer)).toEqual([50, 10, 250, 10, 300]);
  });

  it('falls back to the right bar when the first section prefers its left bar', () => {
    const resizer = new Resizer(
      sizeResult([
        sizeInfo(100),
        sizeInfo(10, { isSolid: true, disableResponsive: true }),
        sizeInfo(200),
      ]),
    );

    expect(() => resizer.resizeSection(0, { toSize: 130, preferMoveLeftBar: true })).not.toThrow();
    expect(currentSizes(resizer)).toEqual([130, 10, 170]);
  });

  it('ignores out-of-range bar movement', () => {
    const resizer = new Resizer(
      sizeResult([
        sizeInfo(100),
        sizeInfo(10, { isSolid: true, disableResponsive: true }),
        sizeInfo(200),
      ]),
    );

    expect(() => resizer.moveBar(-1, { withOffset: 25 })).not.toThrow();
    expect(() => resizer.moveBar(1, { withOffset: 25 })).not.toThrow();
    expect(currentSizes(resizer)).toEqual([100, 10, 200]);
  });

  it('ignores non-finite bar movement offsets', () => {
    const resizer = new Resizer(
      sizeResult([
        sizeInfo(100),
        sizeInfo(10, { isSolid: true, disableResponsive: true }),
        sizeInfo(200),
      ]),
    );

    expect(() => resizer.moveBar(0, { withOffset: Number.NaN })).not.toThrow();
    expect(() => resizer.moveBar(0, { withOffset: Number.POSITIVE_INFINITY })).not.toThrow();
    expect(currentSizes(resizer)).toEqual([100, 10, 200]);
  });

  it('reports resized sections and active bars from a bar action scan result', () => {
    const defaultSizeInfoArray = [
      sizeInfo(100),
      sizeInfo(10, { isSolid: true, disableResponsive: true }),
      sizeInfo(200),
    ];
    const scanResult: BarActionScanResult = {
      type: BarActionType.MOVE,
      barIndex: 1,
      offset: 20,
      originalCoordinate: { x: 0, y: 0 },
      defaultSizeInfoArray,
      sizeInfoArray: [
        sizeInfo(120, { elm: defaultSizeInfoArray[0].elm }),
        sizeInfo(10, { elm: defaultSizeInfoArray[1].elm, isSolid: true, disableResponsive: true }),
        sizeInfo(180, { elm: defaultSizeInfoArray[2].elm }),
      ],
      flexGrowRatio: 1,
    };

    const resizer = new Resizer(scanResult);

    expect(resizer.isSectionResized(0)).toBe(true);
    expect(resizer.isSectionResized(1)).toBe(true);
    expect(resizer.isBarActivated(0)).toBe(true);
    expect(resizer.isBarActivated(1)).toBe(false);
  });

  it('reports out-of-range sections as not resized', () => {
    const defaultSizeInfoArray = [
      sizeInfo(100),
      sizeInfo(10, { isSolid: true, disableResponsive: true }),
      sizeInfo(200),
    ];
    const scanResult: BarActionScanResult = {
      type: BarActionType.MOVE,
      barIndex: 1,
      offset: 20,
      originalCoordinate: { x: 0, y: 0 },
      defaultSizeInfoArray,
      sizeInfoArray: [
        sizeInfo(120, { elm: defaultSizeInfoArray[0].elm }),
        sizeInfo(10, { elm: defaultSizeInfoArray[1].elm, isSolid: true, disableResponsive: true }),
        sizeInfo(180, { elm: defaultSizeInfoArray[2].elm }),
      ],
      flexGrowRatio: 1,
    };

    const resizer = new Resizer(scanResult);

    expect(resizer.isSectionResized(99)).toBe(false);
  });

  it('does not mutate sizes after being discarded', () => {
    const resizer = new Resizer(
      sizeResult([
        sizeInfo(100),
        sizeInfo(10, { isSolid: true, disableResponsive: true }),
        sizeInfo(200),
      ]),
    );

    resizer.discard();
    resizer.moveBar(0, { withOffset: 25 });
    resizer.resizeSection(0, { toSize: 150 });

    expect(currentSizes(resizer)).toEqual([100, 10, 200]);
    expect(resizer.getResult().discard).toBe(true);
  });
});
