import { ColumnResizer, ColumnResizerConfig } from '@column-resizer/core';
import * as React from 'react';

import { ColumnResizerContext } from '../context';
import { useForwardedRef, useInitColumnResizer, useIsomorphicLayoutEffect } from '../hooks';
import { HooksRenderer } from '../hooks-renderer';

import { UseWatchColumnEventsConfig, useWatchColumnEvents } from './use-watch-column-events';

export type ContainerProps = React.HTMLAttributes<HTMLDivElement> &
  UseWatchColumnEventsConfig &
  Partial<ColumnResizerConfig> & {
    columnResizerRef?: React.RefObject<ColumnResizer | null>;
  };

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      vertical = false,
      rtl = false,
      onActivate,
      beforeApplyResizer,
      afterResizing,
      columnResizerRef,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const containerRef = useForwardedRef<HTMLDivElement | null>(null, ref);
    const didCommitRef = React.useRef(false);
    const columnResizer = useInitColumnResizer({
      vertical,
      rtl,
      beforeApplyResizer,
    });

    useIsomorphicLayoutEffect(() => {
      didCommitRef.current = false;
      columnResizer.init(containerRef.current);
      return () => {
        didCommitRef.current = false;
        columnResizer.dispose();
      };
    }, [columnResizer]);

    useIsomorphicLayoutEffect(() => {
      if (didCommitRef.current) {
        columnResizer.refresh();
      } else {
        didCommitRef.current = true;
      }
    }, [children, columnResizer]);

    React.useImperativeHandle(columnResizerRef, () => columnResizer, [columnResizer]);

    return (
      <ColumnResizerContext.Provider value={columnResizer}>
        <HooksRenderer
          hooks={useWatchColumnEvents}
          params={[containerRef, { onActivate, afterResizing }]}
        >
          {() => (
            <div ref={containerRef} {...props} style={columnResizer.styles.container(style)}>
              {children}
            </div>
          )}
        </HooksRenderer>
      </ColumnResizerContext.Provider>
    );
  },
);
