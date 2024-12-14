import { ColumnResizer, ColumnResizerConfig } from '@column-resizer/core';
import * as React from 'react';

import { ColumnResizerContext } from '../context';
import { useIsomorphicLayoutEffect, useForwardedRef, useInitColumnResizer } from '../hooks';
import { HooksRenderer } from '../hooks-renderer';

import { useWatchColumnEvents, UseWatchColumnEventsConfig } from './use-watch-column-events';

export type ContainerProps = React.HTMLAttributes<HTMLDivElement> &
  UseWatchColumnEventsConfig &
  Partial<ColumnResizerConfig> & {
    columnResizerRef?: React.RefObject<ColumnResizer | null>;
  };

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      vertical = false,
      onActivate,
      beforeApplyResizer,
      afterResizing,
      columnResizerRef,
      style,
      ...props
    },
    ref,
  ) => {
    const containerRef = useForwardedRef<HTMLDivElement | null>(null, ref);
    const columnResizer = useInitColumnResizer({
      vertical,
      beforeApplyResizer,
    });

    useIsomorphicLayoutEffect(() => {
      columnResizer.init(containerRef.current);
      return () => columnResizer.dispose();
    }, [columnResizer]);

    React.useImperativeHandle(columnResizerRef, () => columnResizer, [columnResizer]);

    return (
      <ColumnResizerContext.Provider value={columnResizer}>
        <HooksRenderer
          hooks={useWatchColumnEvents}
          params={[containerRef, { onActivate, afterResizing }]}
        >
          {() => (
            <div ref={containerRef} {...props} style={columnResizer.styles.container(style)} />
          )}
        </HooksRenderer>
      </ColumnResizerContext.Provider>
    );
  },
);
