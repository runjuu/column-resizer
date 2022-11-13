import { ResizerController, ResizerControllerConfig } from '@column-resizer/core';
import * as React from 'react';

import { ResizerControllerContext } from '../context';
import { useIsomorphicLayoutEffect } from '../hooks';

import { StyledContainer } from './styled';

export type ContainerProps = React.HTMLAttributes<HTMLDivElement> &
  Partial<ResizerControllerConfig> & {
    controllerRef?: React.RefObject<ResizerController>;
  };

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    { vertical = false, onActivate, beforeApplyResizer, afterResizing, controllerRef, ...props },
    ref,
  ) => {
    const controller = React.useMemo(
      () => new ResizerController({ vertical, onActivate, beforeApplyResizer, afterResizing }),
      [vertical, onActivate, beforeApplyResizer, afterResizing],
    );

    const containerRef = React.useRef<HTMLDivElement>(null);

    useIsomorphicLayoutEffect(() => {
      if (containerRef.current) {
        controller.refresh(containerRef.current);
      }
    }, [controller]);

    React.useImperativeHandle(ref, () => containerRef.current!);
    React.useImperativeHandle(controllerRef, () => controller, [controller]);

    return (
      <ResizerControllerContext.Provider value={controller}>
        <StyledContainer ref={containerRef} vertical={controller.config.vertical} {...props} />
      </ResizerControllerContext.Provider>
    );
  },
);
