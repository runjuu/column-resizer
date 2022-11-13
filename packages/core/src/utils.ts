import { ResizerItem, ItemType } from './types';

export function noop() {}

export function isValidNumber(num?: number): num is number {
  return typeof num === 'number' && num === num;
}

export function isValidType(type: string | null): type is ItemType {
  return !!type && type in ItemType;
}

export function parseResizerItems(
  container: HTMLElement,
  configMap: WeakMap<HTMLElement, ResizerItem['config']>,
): ResizerItem[] {
  return Array.from(container.childNodes)
    .map((elm): ResizerItem | null => {
      if (!(elm instanceof HTMLElement)) return null;

      const type = elm.getAttribute('data-item-type');

      if (isValidType(type)) {
        return {
          type,
          elm,
          config: configMap.get(elm) ?? {},
        };
      } else {
        return null;
      }
    })
    .filter(<T>(item: T): item is Exclude<T, null> => !!item);
}

export let DISABLE_PASSIVE: boolean | AddEventListenerOptions = true;

try {
  // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#safely_detecting_option_support
  window.addEventListener('test', null, {
    get passive() {
      DISABLE_PASSIVE = { passive: false };
      return true;
    },
  });
} catch {}
