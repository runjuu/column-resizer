import { ItemType } from '../types';

import { isValidType } from './is-valid-type';

export type ParsedResizerItem = {
  type: ItemType;
  elm: HTMLElement;
};

export type ParsedResizerItems = ParsedResizerItem[];

export function resizerItemAttributes<T>(type: ItemType) {
  return (config: T) => ({
    'data-item-type': type,
    'data-item-config': JSON.stringify(config),
  });
}

export function parseResizerItems(container: HTMLElement): ParsedResizerItems {
  return Array.from(container.childNodes)
    .map((elm) => {
      if (!(elm instanceof HTMLElement)) return null;

      const type = elm.getAttribute('data-item-type');

      if (isValidType(type)) {
        return { type, elm };
      } else {
        return null;
      }
    })
    .filter(<T>(item: T): item is Exclude<T, null> => !!item);
}

export function parseItemConfig({ elm }: { elm: HTMLElement }): Record<string, unknown> {
  try {
    const config = JSON.parse(elm.getAttribute('data-item-config') ?? '');
    return config && typeof config === 'object' ? config : {};
  } catch {
    return {};
  }
}
