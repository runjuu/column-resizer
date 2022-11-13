import { BarID, SectionID, ResizerItem } from './types';

const idRegex = /^SR_(BAR|SECTION)_(\d+)$/;

export function isValidNumber(num?: number): num is number {
  return typeof num === 'number' && num === num;
}

export const generateId = (() => {
  let index = 0;

  return generateId;

  function generateId(type: 'BAR'): BarID;
  function generateId(type: 'SECTION'): SectionID;
  function generateId(type: 'BAR' | 'SECTION'): BarID | SectionID {
    index += 1;
    return `SR_${type}_${index}`;
  }
})();

export function isValidId(id: string | null): id is BarID | SectionID {
  return !!id && idRegex.test(id);
}

export function parseResizerItems(
  container: HTMLElement,
  configMap: Map<ResizerItem['id'], ResizerItem['config']>,
): ResizerItem[] {
  return Array.from(container.childNodes)
    .map((elm): ResizerItem | null => {
      if (!(elm instanceof HTMLElement)) return null;

      const id = elm.getAttribute('data-id');

      if (isValidId(id)) {
        return { id, elm, config: configMap.get(id) ?? {} };
      } else {
        return null;
      }
    })
    .filter(<T>(item: T): item is Exclude<T, null> => !!item);
}

export let DISABLE_PASSIVE: boolean | AddEventListenerOptions = true;

try {
  // @ts-ignore
  window.addEventListener('test', null, {
    get passive() {
      DISABLE_PASSIVE = { passive: false };
      return true;
    },
  });
} catch {}
