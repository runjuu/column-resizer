import { ColumnSectionConfig } from '../column-items';

import { isValidNumber } from './is-valid-number';

export function isSolidItem({ size }: ColumnSectionConfig): boolean {
  return isValidNumber(size);
}
