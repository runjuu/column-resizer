import { ResizerItemConfig } from '../types';

import { isValidNumber } from './is-valid-number';

export function isSolidItem({ size }: ResizerItemConfig): boolean {
  return isValidNumber(size);
}
