import { ColumnResizer, ColumnResizerConfig } from '@column-resizer/core';
import * as React from 'react';

import { ColumnResizerContext } from '../context';
import { useIsomorphicLayoutEffect, useForwardedRef, useInitColumnResizer } from '../hooks';

export type ContainerProps = React.HTMLAttributes<HTMLDivElement> &
  Partial<ColumnResizerConfig> & {
    controllerRef?: React.RefObject<ColumnResizer>;
  };

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      vertical = false,
      onActivate,
      beforeApplyResizer,
      afterResizing,
      controllerRef,
      style,
      ...props
    },
    ref,
  ) => {
    const containerRef = useForwardedRef<HTMLDivElement | null>(null, ref);
    const columnResizer = useInitColumnResizer({
      vertical,
      onActivate,
      beforeApplyResizer,
      afterResizing,
    });

    useIsomorphicLayoutEffect(() => columnResizer.refresh(containerRef.current), [columnResizer]);
    React.useImperativeHandle(controllerRef, () => columnResizer, [columnResizer]);

    return (
      <ColumnResizerContext.Provider value={columnResizer}>
        <div ref={containerRef} {...props} style={columnResizer.styles.container(style)} />
      </ColumnResizerContext.Provider>
    );
  },
);
