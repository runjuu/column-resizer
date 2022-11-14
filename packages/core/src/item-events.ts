export type ItemEventMap = {
  'bar:click': null;
  'bar:status-change': { isActive: boolean };
  'section:size-change': { size: number };
};

export function watchItemEvent<E extends Element, K extends keyof ItemEventMap>(
  elm: E | null,
  key: K,
  callback: (event: CustomEvent<ItemEventMap[K]>) => void,
) {
  elm?.addEventListener(key, callback as EventListener);

  return () => elm?.removeEventListener(key, callback as EventListener);
}

export function dispatchItemEvent<E extends Element, K extends keyof ItemEventMap>(
  elm: E,
  key: K,
  detail: ItemEventMap[K],
) {
  elm.dispatchEvent(new CustomEvent(key, { detail }));
}
