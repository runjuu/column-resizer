import { ResizerItemConfig } from '../types';

import { isSolidItem } from './is-solid-item';

export function isDisabledResponsive(resizerItemConfig: ResizerItemConfig): boolean {
  const { disableResponsive } = resizerItemConfig;

  if (isSolidItem(resizerItemConfig) && disableResponsive === undefined) {
    return true;
  } else {
    return !!disableResponsive;
  }
}
