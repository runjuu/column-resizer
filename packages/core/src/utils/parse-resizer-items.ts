import { ResizerItem, ResizerItemConfig } from '../types';

import { isValidType } from './is-valid-type';

export function parseResizerItems(container: HTMLElement): Omit<ResizerItem, 'controller'>[] {
  return Array.from(container.childNodes)
    .map((elm) => {
      if (!(elm instanceof HTMLElement)) return null;

      const type = elm.getAttribute('data-item-type');

      if (isValidType(type)) {
        return { type, elm, config: parseConfig(elm) };
      } else {
        return null;
      }
    })
    .filter(<T>(item: T): item is Exclude<T, null> => !!item);

  function parseConfig(elm: HTMLElement): ResizerItemConfig {
    try {
      const config = elm.getAttribute('data-item-config') ?? '';
      return JSON.parse(config);
    } catch {
      return {};
    }
  }
}
