import { RefObject } from 'react';
import { ResizerItemConfig } from '@column-resizer/core';

export type ChildProps = ResizerItemConfig & {
  innerRef?: RefObject<HTMLDivElement>;
};

export type ExpandInteractiveArea = {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};
