import * as React from 'react';

import {
  ResizeDomController,
  ResizeDomControllerOptions,
  ResizeDomEvent,
  createResizeDomController,
} from '@column-resizer/resize-dom';
import type { ResizeGraph } from '@column-resizer/resize-graph';

type ResizeGraphContextValue = {
  controller: ResizeDomController;
  subscribe: (listener: (event: ResizeDomEvent) => void) => () => void;
};

const ResizeGraphContext = React.createContext<ResizeGraphContextValue | null>(null);

export type ResizeGraphProviderProps = React.PropsWithChildren<
  Omit<ResizeDomControllerOptions, 'graph' | 'onEvent'> & {
    graph: ResizeGraph;
    onEvent?: (event: ResizeDomEvent) => void;
  }
>;

export function ResizeGraphProvider({
  children,
  graph,
  onEvent,
  behaviorRegistry,
  policyRegistry,
  rtl,
}: ResizeGraphProviderProps) {
  const listenersRef = React.useRef(new Set<(event: ResizeDomEvent) => void>());
  const onEventRef = React.useRef(onEvent);

  React.useLayoutEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const controller = React.useMemo(
    () =>
      createResizeDomController({
        graph,
        behaviorRegistry,
        policyRegistry,
        rtl,
        onEvent: (event) => {
          onEventRef.current?.(event);
          listenersRef.current.forEach((listener) => listener(event));
        },
      }),
    [behaviorRegistry, graph, policyRegistry, rtl],
  );

  React.useLayoutEffect(() => () => controller.dispose(), [controller]);
  React.useLayoutEffect(() => {
    controller.writeStyles();
  });

  const value = React.useMemo<ResizeGraphContextValue>(
    () => ({
      controller,
      subscribe(listener) {
        listenersRef.current.add(listener);
        return () => listenersRef.current.delete(listener);
      },
    }),
    [controller],
  );

  return <ResizeGraphContext.Provider value={value}>{children}</ResizeGraphContext.Provider>;
}

export function useResizeGraph(): ResizeDomController {
  const context = React.useContext(ResizeGraphContext);

  if (!context) {
    throw new Error('useResizeGraph must be used inside ResizeGraphProvider.');
  }

  return context.controller;
}

export function useResizeEvents(listener: (event: ResizeDomEvent) => void): void {
  const context = React.useContext(ResizeGraphContext);

  if (!context) {
    throw new Error('useResizeEvents must be used inside ResizeGraphProvider.');
  }

  React.useEffect(() => context.subscribe(listener), [context, listener]);
}

function useRegisteredElement(
  register: (element: HTMLElement | null) => () => void,
): React.RefCallback<HTMLElement> {
  const cleanupRef = React.useRef<(() => void) | null>(null);

  return React.useCallback(
    (element: HTMLElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current = register(element);
    },
    [register],
  );
}

export function useResizeRegion(regionId: string): React.RefCallback<HTMLElement> {
  const controller = useResizeGraph();
  return useRegisteredElement(
    React.useCallback(
      (element) => controller.registerRegion(regionId, element),
      [controller, regionId],
    ),
  );
}

export function useResizeEdge(edgeId: string): React.RefCallback<HTMLElement> {
  const controller = useResizeGraph();
  return useRegisteredElement(
    React.useCallback((element) => controller.registerEdge(edgeId, element), [controller, edgeId]),
  );
}

export function useResizeHandle(handleId: string): React.RefCallback<HTMLElement> {
  const controller = useResizeGraph();
  return useRegisteredElement(
    React.useCallback(
      (element) => controller.registerHandle(handleId, element),
      [controller, handleId],
    ),
  );
}

export type ResizeRegionProps = React.HTMLAttributes<HTMLDivElement> & {
  regionId: string;
};

export const ResizeRegion = React.forwardRef<HTMLDivElement, ResizeRegionProps>(
  function ResizeRegion({ regionId, ...props }, ref) {
    const registerRef = useResizeRegion(regionId);
    const mergedRef = useMergedRefs(ref, registerRef);
    return <div {...props} ref={mergedRef} />;
  },
);

export type ResizeEdgeProps = React.HTMLAttributes<HTMLDivElement> & {
  edgeId: string;
};

export const ResizeEdge = React.forwardRef<HTMLDivElement, ResizeEdgeProps>(function ResizeEdge(
  { edgeId, ...props },
  ref,
) {
  const registerRef = useResizeEdge(edgeId);
  const mergedRef = useMergedRefs(ref, registerRef);
  return <div {...props} ref={mergedRef} />;
});

export type ResizeHandleProps = React.HTMLAttributes<HTMLDivElement> & {
  handleId: string;
};

export const ResizeHandle = React.forwardRef<HTMLDivElement, ResizeHandleProps>(
  function ResizeHandle({ handleId, ...props }, ref) {
    const registerRef = useResizeHandle(handleId);
    const mergedRef = useMergedRefs(ref, registerRef);
    return <div {...props} ref={mergedRef} />;
  },
);

function useMergedRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return React.useCallback((value: T) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
        return;
      }

      if (ref && 'current' in ref) {
        ref.current = value;
      }
    });
  }, refs);
}

export type { ResizeDomController, ResizeDomEvent, ResizeGraph };
