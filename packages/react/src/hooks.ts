import React, { MutableRefObject, Ref } from 'react';
import { ColumnResizerContext } from './context';

export const useIsomorphicLayoutEffect =
  typeof window === 'object' ? React.useLayoutEffect : React.useEffect;

export function useColumnResizer() {
  return React.useContext(ColumnResizerContext)!;
}

export function useForwardedRef<T>(
  initialValue: T,
  refToForward: Ref<T> | undefined,
): MutableRefObject<T> {
  const ref = React.useRef(initialValue);

  React.useImperativeHandle(refToForward, () => ref.current!);

  return ref;
}
