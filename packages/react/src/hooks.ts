import React from 'react';
import { ResizerControllerContext } from './context';

export const useIsomorphicLayoutEffect =
  typeof window === 'object' ? React.useLayoutEffect : React.useEffect;

export function useResizerController() {
  return React.useContext(ResizerControllerContext)!;
}
