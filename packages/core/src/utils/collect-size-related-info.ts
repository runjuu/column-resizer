import { SizeInfo, SizeRelatedInfo } from '../types';

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
