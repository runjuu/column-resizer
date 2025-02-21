import { SizeInfo, SizeRelatedInfo, Trend } from '../types';

import { collectSizeRelatedInfo } from './collect-size-related-info';
import { isValidNumber } from './is-valid-number';

export function getNextSizeRelatedInfo(
  barIndex: number,
  offset: number,
  sizeInfoArray: SizeInfo[],
  flipResizeMoveDirection: boolean | undefined,
): SizeRelatedInfo {
  const { collect, getResult } = collectSizeRelatedInfo();

  const leftResult = resize(barIndex, offset, flipResizeMoveDirection ? 1 : -1, sizeInfoArray);
  const rightResult = resize(barIndex, -offset, flipResizeMoveDirection ? -1 : 1, sizeInfoArray);

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
