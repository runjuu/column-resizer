import { ItemType } from '../types';

import { isValidType } from './is-valid-type';

export type ParseResizerItemsResult = {
  type: ItemType;
  elm: HTMLElement;
  config: Record<string, unknown>;
}[];

export function resizerItemAttributes<T>(type: ItemType) {
  return (config: T) => ({
    'data-item-type': type,
    'data-item-config': JSON.stringify(config),
  });
}

export function parseResizerItems(container: HTMLElement): ParseResizerItemsResult {
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

  function parseConfig(elm: HTMLElement) {
    try {
      const config = JSON.parse(elm.getAttribute('data-item-config') ?? '');
      return config && typeof config === 'object' ? config : {};
    } catch {
      return {};
    }
  }
}
