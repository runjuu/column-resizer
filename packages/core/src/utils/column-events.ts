import { ColumnResizerEventMap } from '../types';

type DisposeFn = () => void;

export function dispatchResizerEvent<E extends Element, K extends keyof ColumnResizerEventMap>(
  elm: E | null,
  key: K,
  detail: ColumnResizerEventMap[K],
) {
  elm?.dispatchEvent(new CustomEvent(key, { detail }));
}

export class ResizerEventHub {
  private disposeFnSet = new Set<DisposeFn>();

  watchResizerEvent = <E extends Element, K extends keyof ColumnResizerEventMap>(
    elm: E | null,
    key: K,
    callback: (event: CustomEvent<ColumnResizerEventMap[K]>) => void,
  ): DisposeFn => {
    elm?.addEventListener(key, callback as EventListener);

    const disposeFn = () => elm?.removeEventListener(key, callback as EventListener);

    this.disposeFnSet.add(disposeFn);

    return disposeFn;
  };

  reset = () => {
    this.disposeFnSet.forEach((dispose) => dispose());
    this.disposeFnSet.clear();
  };
}
