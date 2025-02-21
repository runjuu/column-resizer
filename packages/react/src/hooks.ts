import { ColumnResizer, ColumnResizerConfig, ColumnResizerEventMap } from '@column-resizer/core';
import React, { MutableRefObject, Ref } from 'react';

import { ColumnResizerContext } from './context';

export const useIsomorphicLayoutEffect =
  typeof window === 'object' ? React.useLayoutEffect : React.useEffect;

export function useInitColumnResizer({
  vertical,
  rtl,
  beforeApplyResizer: beforeApplyResizer_,
}: ColumnResizerConfig) {
  const beforeApplyResizer = useRefCallback(beforeApplyResizer_);

  return React.useMemo(
    () => new ColumnResizer({ vertical, beforeApplyResizer, rtl }),
    [vertical, beforeApplyResizer, rtl],
  );
}

export function useColumnResizer() {
  return React.useContext(ColumnResizerContext)!;
}

export function useColumnResizerEvent<E extends Element, K extends keyof ColumnResizerEventMap>(
  elmRef: React.RefObject<E | null>,
  key: K,
  callback?: (event: CustomEvent<ColumnResizerEventMap[K]>) => void,
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

type AnyFunc = (...params: any[]) => any;
export function useRefCallback<T extends AnyFunc>(callback?: T): T;
export function useRefCallback(callback?: AnyFunc): AnyFunc {
  const callbackRef = React.useRef(callback);

  callbackRef.current = callback;

  return React.useCallback(
    (...params: unknown[]) => callbackRef.current?.(...params),
    [callbackRef],
  );
}
