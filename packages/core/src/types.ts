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

export type ResizerItemController = {
  destroy(): void;
};

export type ResizerItem = {
  type: ItemType;
  elm: HTMLElement;
  config: ResizerItemConfig;
  controller: ResizerItemController;
};

export type ResizerItemConfig = {
  size?: number;
  defaultSize?: number;
  maxSize?: number;
  minSize?: number;
  disableResponsive?: boolean;
};

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
