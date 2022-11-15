import { BarAction, BarActionType, Coordinate, SizeInfo, SizeRelatedInfo } from '../types';

import { getNextSizeRelatedInfo } from './get-next-size-related-info';
import { DEFAULT_COORDINATE_OFFSET } from './calculate-coordinate-offset';

export interface BarActionScanResult extends SizeRelatedInfo {
  barIndex: number;
  offset: number;
  type: BarActionType;
  originalCoordinate: Coordinate;
  defaultSizeInfoArray: SizeInfo[];
}

interface ScanBarActionConfig {
  getSizeRelatedInfo: () => SizeRelatedInfo;
  calculateOffset: (current: Coordinate, original: Coordinate) => number;
}

const DEFAULT_BAR_ACTION_SCAN_RESULT: BarActionScanResult = {
  barIndex: -1,
  offset: 0,
  type: BarActionType.DEACTIVATE,
  originalCoordinate: DEFAULT_COORDINATE_OFFSET,
  defaultSizeInfoArray: [],
  sizeInfoArray: [],
  discard: true,
  flexGrowRatio: 0,
};

type Callback = (state: BarActionScanResult) => void;

export function createBarStore(config: ScanBarActionConfig) {
  let currentState = DEFAULT_BAR_ACTION_SCAN_RESULT;
  const callbackSet = new Set<Callback>();

  return {
    dispatch(action: BarAction) {
      currentState = (() => {
        const result = {
          barIndex: action.barIndex,
          type: action.type,
        };

        switch (action.type) {
          case BarActionType.ACTIVATE:
            const { sizeInfoArray, flexGrowRatio } = config.getSizeRelatedInfo();

            return {
              ...DEFAULT_BAR_ACTION_SCAN_RESULT,
              ...result,
              originalCoordinate: action.coordinate,
              defaultSizeInfoArray: sizeInfoArray,
              sizeInfoArray,
              flexGrowRatio,
            };
          case BarActionType.MOVE:
            const offset = config.calculateOffset(
              action.coordinate,
              currentState.originalCoordinate,
            );

            return {
              ...result,
              ...getNextSizeRelatedInfo(action.barIndex, offset, currentState.defaultSizeInfoArray),
              offset,
              originalCoordinate: currentState.originalCoordinate,
              defaultSizeInfoArray: currentState.defaultSizeInfoArray,
              discard: false,
            };
          case BarActionType.DEACTIVATE:
            return DEFAULT_BAR_ACTION_SCAN_RESULT;
        }
      })();

      callbackSet.forEach((callback) => callback(currentState));
    },

    subscribe(callback: Callback) {
      callbackSet.add(callback);

      return () => callbackSet.delete(callback);
    },

    unsubscribeAll() {
      callbackSet.clear();
    },
  };
}
