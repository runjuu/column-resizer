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

    const sectionID = getSectionIndex(indexOfSection);
    const currentSize = this.getSize(sectionID);

    if (currentSize >= 0 && config.toSize >= 0) {
      const offset = config.toSize - currentSize;

      if (sectionID === this.resizeResult.sizeInfoArray.length - 1 || config.preferMoveLeftBar) {
        this.moveBar(indexOfSection - 1, { withOffset: -offset });
      } else {
        this.moveBar(indexOfSection, { withOffset: offset });
      }
    }
  }

  moveBar(indexOfBar: number, config: { withOffset: number }) {
    if (this.isDiscarded) {
      return;
    }

    this.resizeResult = getNextSizeRelatedInfo(
      getBarIndex(indexOfBar),
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
      return (
        this.getSize(sectionID) !== this.resizeResult.defaultSizeInfoArray[sectionID].currentSize
      );
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
}
