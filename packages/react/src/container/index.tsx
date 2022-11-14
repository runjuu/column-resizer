import { ColumnResizer, ColumnResizerConfig } from '@column-resizer/core';
import * as React from 'react';

import { ColumnResizerContext } from '../context';
import { useIsomorphicLayoutEffect, useForwardedRef } from '../hooks';

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
    const controller = React.useMemo(
      () => new ColumnResizer({ vertical, onActivate, beforeApplyResizer, afterResizing }),
      [vertical, onActivate, beforeApplyResizer, afterResizing],
    );

    useIsomorphicLayoutEffect(() => controller.refresh(containerRef.current), [controller]);
    React.useImperativeHandle(controllerRef, () => controller, [controller]);

    return (
      <ColumnResizerContext.Provider value={controller}>
        <StyledContainer ref={containerRef} vertical={controller.config.vertical} {...props} />
      </ColumnResizerContext.Provider>
    );
  },
);
