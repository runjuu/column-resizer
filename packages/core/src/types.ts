export type Coordinate = {
  x: number;
  y: number;
};

export enum ItemType {
  BAR = 'BAR',
  SECTION = 'SECTION',
}

export type Trend = -1 | 0 | 1;

export enum BarActionType {
  ACTIVATE = 'activate',
  MOVE = 'move',
  DEACTIVATE = 'deactivate',
}

export abstract class ColumnInstance {
  protected constructor(public readonly type: ItemType, public readonly elm: HTMLElement) {}
  destroy() {}
}

export type BarAction = {
  type: BarActionType;
  coordinate: Coordinate;
  barIndex: number;
};

export type SizeInfo = {
  elm: HTMLElement;
  isSolid: boolean;
  currentSize: number;
  maxSize?: number;
  minSize?: number;
  disableResponsive?: boolean;
};

export type SizeRelatedInfo = {
  discard?: boolean;
  sizeInfoArray: SizeInfo[];
  flexGrowRatio: number;
};

export type ColumnResizerEventMap = {
  'bar:click': null;
  'bar:status-change': { isActive: boolean };
  'section:size-change': { size: number };
  'column:activate': null;
  'column:after-resizing': null;
};
