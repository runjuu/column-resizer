import { ColumnResizer, ColumnResizerConfig } from '@column-resizer/core';
import * as React from 'react';

import { ColumnResizerContext } from '../context';
import { useIsomorphicLayoutEffect, useForwardedRef, useInitColumnResizer } from '../hooks';

import { StyledContainer } from './styled';

export type ContainerProps = React.HTMLAttributes<HTMLDivElement> &
  Partial<ColumnResizerConfig> & {
    controllerRef?: React.RefObject<ColumnResizer>;
  };

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    { vertical = false, onActivate, beforeApplyResizer, afterResizing, controllerRef, ...props },
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
        <StyledContainer ref={containerRef} vertical={columnResizer.config.vertical} {...props} />
      </ColumnResizerContext.Provider>
    );
  },
);
