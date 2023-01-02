import { ColumnResizerEventMap } from '../types';

export function watchResizerEvent<E extends Element, K extends keyof ColumnResizerEventMap>(
  elm: E | null,
  key: K,
  callback: (event: CustomEvent<ColumnResizerEventMap[K]>) => void,
) {
  elm?.addEventListener(key, callback as EventListener);

  return () => elm?.removeEventListener(key, callback as EventListener);
}

export function dispatchResizerEvent<E extends Element, K extends keyof ColumnResizerEventMap>(
  elm: E | null,
  key: K,
  detail: ColumnResizerEventMap[K],
) {
  elm?.dispatchEvent(new CustomEvent(key, { detail }));
}
