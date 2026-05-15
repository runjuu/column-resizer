import { SizeRelatedInfo } from './types';
import { BarActionScanResult, getNextSizeRelatedInfo } from './utils';

type ResizeResult = SizeRelatedInfo | BarActionScanResult;

function getBarIndex(indexOfBar: number): number {
  return indexOfBar * 2 + 1;
}

function getSectionIndex(indexOfSection: number): number {
  return indexOfSection * 2;
}

export class Resizer {
  private isDiscarded = false;

  constructor(private resizeResult: ResizeResult) {}

  resizeSection(indexOfSection: number, config: { toSize: number; preferMoveLeftBar?: boolean }) {
    if (this.isDiscarded) {
      return;
    }

    if (!Number.isInteger(indexOfSection) || !Number.isFinite(config.toSize) || config.toSize < 0) {
      return;
    }

    const sectionID = getSectionIndex(indexOfSection);
    const currentSize = this.getSize(sectionID);

    if (currentSize >= 0) {
      const offset = config.toSize - currentSize;
      const rightBar = { indexOfBar: indexOfSection, withOffset: offset };
      const leftBar = { indexOfBar: indexOfSection - 1, withOffset: -offset };
      const shouldPreferLeft =
        sectionID === this.resizeResult.sizeInfoArray.length - 1 || config.preferMoveLeftBar;

      const bar = (shouldPreferLeft ? [leftBar, rightBar] : [rightBar, leftBar]).find(
        ({ indexOfBar }) => this.getValidBarIndex(indexOfBar) !== null,
      );

      if (bar) this.moveBar(bar.indexOfBar, { withOffset: bar.withOffset });
    }
  }

  moveBar(indexOfBar: number, config: { withOffset: number }) {
    if (this.isDiscarded) {
      return;
    }

    const barIndex = this.getValidBarIndex(indexOfBar);

    if (barIndex === null) {
      return;
    }

    this.resizeResult = getNextSizeRelatedInfo(
      barIndex,
      config.withOffset,
      this.resizeResult.sizeInfoArray,
      undefined,
    );
  }

  discard() {
    this.isDiscarded = true;
  }

  isSectionResized(indexOfSection: number): boolean {
    const sectionID = getSectionIndex(indexOfSection);

    if ('defaultSizeInfoArray' in this.resizeResult) {
      const defaultSizeInfo = this.resizeResult.defaultSizeInfoArray[sectionID];

      return defaultSizeInfo ? this.getSize(sectionID) !== defaultSizeInfo.currentSize : false;
    } else {
      return false;
    }
  }

  isBarActivated(indexOfBar: number): boolean {
    if ('barIndex' in this.resizeResult) {
      return this.resizeResult.barIndex === getBarIndex(indexOfBar);
    } else {
      return false;
    }
  }

  getSectionSize(indexOfSection: number) {
    return this.getSize(getSectionIndex(indexOfSection));
  }

  getResult(): SizeRelatedInfo {
    return { ...this.resizeResult, discard: this.isDiscarded };
  }

  getTotalSize(): number {
    return this.resizeResult.sizeInfoArray
      .filter((sizeInfo, index) => sizeInfo && index % 2 === 0)
      .reduce((total, { currentSize }) => total + currentSize, 0);
  }

  private getSize(index: number): number | -1 {
    const sizeInfo = this.resizeResult.sizeInfoArray[index];
    return sizeInfo ? sizeInfo.currentSize : -1;
  }

  private getValidBarIndex(indexOfBar: number): number | null {
    if (!Number.isInteger(indexOfBar)) {
      return null;
    }

    const barIndex = getBarIndex(indexOfBar);

    if (barIndex > 0 && barIndex < this.resizeResult.sizeInfoArray.length - 1) {
      return this.resizeResult.sizeInfoArray[barIndex] ? barIndex : null;
    } else {
      return null;
    }
  }
}
