import React, { MutableRefObject, Ref } from 'react';
import { ItemEventMap, ColumnResizer, ColumnResizerConfig } from '@column-resizer/core';

import { AnyFunc } from './types';
import { ColumnResizerContext } from './context';

export const useIsomorphicLayoutEffect =
  typeof window === 'object' ? React.useLayoutEffect : React.useEffect;

export function useInitColumnResizer({
  vertical,
  afterResizing: afterResizing_,
  onActivate: onActivate_,
  beforeApplyResizer: beforeApplyResizer_,
}: ColumnResizerConfig) {
  const afterResizing = useRefCallback(afterResizing_);
  const onActivate = useRefCallback(onActivate_);
  const beforeApplyResizer = useRefCallback(beforeApplyResizer_);

  return React.useMemo(
    () => new ColumnResizer({ vertical, onActivate, beforeApplyResizer, afterResizing }),
    [vertical, onActivate, beforeApplyResizer, afterResizing],
  );
}

export function useColumnResizer() {
  return React.useContext(ColumnResizerContext)!;
}

export function useColumnResizerEvent<E extends Element, K extends keyof ItemEventMap>(
  elmRef: React.RefObject<E>,
  key: K,
  callback?: (event: CustomEvent<ItemEventMap[K]>) => void,
) {
  const columnResizer = useColumnResizer();
  const refCallback = useRefCallback(callback);

  React.useEffect(
    () => columnResizer.on(elmRef.current, key, (event) => refCallback(event)),
    [columnResizer, key, elmRef, refCallback],
  );
}

export function useForwardedRef<T>(
  initialValue: T,
  refToForward: Ref<T> | undefined,
): MutableRefObject<T> {
  const ref = React.useRef(initialValue);

  React.useImperativeHandle(refToForward, () => ref.current!);

  return ref;
}

export function useRefCallback<T extends AnyFunc>(callback?: T): T;
export function useRefCallback(callback?: AnyFunc): AnyFunc {
  const callbackRef = React.useRef(callback);

  callbackRef.current = callback;

  return React.useCallback(
    (...params: unknown[]) => callbackRef.current?.(...params),
    [callbackRef],
  );
}
