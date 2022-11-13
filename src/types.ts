import { RefObject } from 'react';

export type Coordinate = {
  x: number;
  y: number;
};

export type Trend = -1 | 0 | 1;

export enum BarActionType {
  ACTIVATE = 'activate',
  MOVE = 'move',
  DEACTIVATE = 'deactivate',
}

export type BarID = `SR_BAR_${number}`;
export type SectionID = `SR_SECTION_${number}`;

export type ResizerItem = {
  id: BarID | SectionID;
  elm: HTMLElement;
  config: ResizerItemConfig;
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
  id: BarID | SectionID;
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

export type ChildProps = ResizerItemConfig & {
  innerRef?: RefObject<HTMLDivElement>;
};

export type ExpandInteractiveArea = {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};
