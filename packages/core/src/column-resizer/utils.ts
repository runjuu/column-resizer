import { Coordinate, ResizerItemConfig, SizeInfo, SizeRelatedInfo, Trend } from '../types';
import { isValidNumber } from '../utils';

export const DEFAULT_COORDINATE_OFFSET: Coordinate = { x: 0, y: 0 };

function filterSize(
  nextSize: number,
  { maxSize, minSize = 0 }: SizeInfo,
): { nextSize: number; remainingOffset: number } {
  if (nextSize < minSize) {
    return {
      nextSize: minSize,
      remainingOffset: nextSize - minSize,
    };
  }

  if (isValidNumber(maxSize) && nextSize > maxSize) {
    return {
      nextSize: maxSize,
      remainingOffset: nextSize - maxSize,
    };
  }

  return {
    nextSize,
    remainingOffset: 0,
  };
}

export function isSolid({ size }: ResizerItemConfig): boolean {
  return isValidNumber(size);
}

export function isDisabledResponsive(resizerItemConfig: ResizerItemConfig): boolean {
  const { disableResponsive } = resizerItemConfig;

  if (isSolid(resizerItemConfig) && disableResponsive === undefined) {
    return true;
  } else {
    return !!disableResponsive;
  }
}

export function calculateCoordinateOffset(
  current: Coordinate,
  previous: Coordinate | null,
): Coordinate {
  if (previous) {
    return {
      x: current.x - previous.x,
      y: current.y - previous.y,
    };
  } else {
    return DEFAULT_COORDINATE_OFFSET;
  }
}

export function collectSizeRelatedInfo() {
  const sizeInfoArray: SizeInfo[] = [];
  let responsiveChildCount = 0;
  let responsiveContainerSize = 0;

  return {
    collect(sizeInfo: SizeInfo) {
      sizeInfoArray.push(sizeInfo);

      if (!sizeInfo.disableResponsive) {
        responsiveChildCount += 1;
        responsiveContainerSize += sizeInfo.currentSize;
      }
    },

    getResult(): SizeRelatedInfo {
      return {
        sizeInfoArray,
        flexGrowRatio: responsiveChildCount / responsiveContainerSize,
      };
    },
  };
}

function doResize(
  offset: number,
  sizeInfo: SizeInfo,
): { remainingOffset: number; sizeInfo: SizeInfo } {
  if (sizeInfo.isSolid) {
    return {
      remainingOffset: offset,
      sizeInfo,
    };
  }

  const { nextSize, remainingOffset } = filterSize(sizeInfo.currentSize + offset, sizeInfo);

  return {
    sizeInfo: { ...sizeInfo, currentSize: nextSize },
    remainingOffset,
  };
}

function resize(
  barIndex: number,
  offset: number,
  trend: Trend,
  sizeInfoArray: SizeInfo[],
): { sizeInfoArray: SizeInfo[]; remainingOffset: number } {
  const newSizeInfoArray: SizeInfo[] = [];
  let prevRemainingOffset = offset;

  for (
    let sectionIndex = barIndex + trend;
    isValidSectionIndex(sectionIndex);
    sectionIndex += trend
  ) {
    if (prevRemainingOffset) {
      const { sizeInfo, remainingOffset } = doResize(
        prevRemainingOffset,
        sizeInfoArray[sectionIndex],
      );

      prevRemainingOffset = remainingOffset;
      collect(sizeInfo);
    } else {
      collect(sizeInfoArray[sectionIndex]);
    }
  }

  function collect(sizeInfo: SizeInfo) {
    if (trend === -1) {
      newSizeInfoArray.unshift(sizeInfo);
    } else {
      newSizeInfoArray.push(sizeInfo);
    }
  }

  function isValidSectionIndex(sectionID: number): boolean {
    if (trend === -1) {
      return sectionID >= 0;
    } else {
      return sectionID <= sizeInfoArray.length - 1;
    }
  }

  return {
    sizeInfoArray: newSizeInfoArray,
    remainingOffset: prevRemainingOffset,
  };
}

export function getNextSizeRelatedInfo(
  barIndex: number,
  offset: number,
  sizeInfoArray: SizeInfo[],
): SizeRelatedInfo {
  const { collect, getResult } = collectSizeRelatedInfo();

  const leftResult = resize(barIndex, offset, -1, sizeInfoArray);
  const rightResult = resize(barIndex, -offset, 1, sizeInfoArray);

  const leftUsedOffset = offset - leftResult.remainingOffset;
  const rightUsedOffset = -offset - rightResult.remainingOffset;

  function collectAll(left: SizeInfo[], right: SizeInfo[]) {
    left.forEach(collect);
    collect(sizeInfoArray[barIndex]);
    right.forEach(collect);
  }

  if (leftUsedOffset === -rightUsedOffset) {
    collectAll(leftResult.sizeInfoArray, rightResult.sizeInfoArray);
  } else if (Math.abs(leftUsedOffset) < Math.abs(rightUsedOffset)) {
    // left side sections was limited
    const newRightResult = resize(barIndex, -leftUsedOffset, 1, sizeInfoArray);
    collectAll(leftResult.sizeInfoArray, newRightResult.sizeInfoArray);
  } else {
    // right side sections was limited
    const newLeftResult = resize(barIndex, -rightUsedOffset, -1, sizeInfoArray);
    collectAll(newLeftResult.sizeInfoArray, rightResult.sizeInfoArray);
  }

  return getResult();
}
