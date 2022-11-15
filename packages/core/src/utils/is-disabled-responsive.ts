import { ColumnSectionConfig } from '../column-items';

import { isSolidItem } from './is-solid-item';

export function isDisabledResponsive(config: ColumnSectionConfig): boolean {
  const { disableResponsive } = config;

  if (isSolidItem(config) && disableResponsive === undefined) {
    return true;
  } else {
    return !!disableResponsive;
  }
}
