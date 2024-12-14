import { ColumnBarConfig } from '@column-resizer/core';

import * as React from 'react';

import { useColumnResizer, useColumnResizerEvent, useForwardedRef } from '../hooks';
import { ExpandInteractiveArea, StyledInteractiveArea } from './styled';

export type { ExpandInteractiveArea };

export type BarProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> &
  Partial<ColumnBarConfig> & {
    expandInteractiveArea?: ExpandInteractiveArea;
    onClick?: () => void;
    onStatusChanged?: (isActive: boolean) => void;
  };

export const Bar = React.forwardRef<HTMLDivElement, BarProps>(
  (
    { children, onClick, expandInteractiveArea, onStatusChanged, style, size = 10, ...props },
    innerRef,
  ) => {
    const columnResizer = useColumnResizer();
    const ref = useForwardedRef<HTMLDivElement | null>(null, innerRef);
    const config = { size };

    useColumnResizerEvent(ref, 'bar:click', () => onClick?.());
    useColumnResizerEvent(ref, 'bar:status-change', (e) => onStatusChanged?.(e.detail.isActive));

    return (
      <div
        ref={ref}
        {...props}
        style={columnResizer.styles.bar(config, { ...style, position: 'relative' })}
        {...columnResizer.attributes.bar(config)}
      >
        {children}
        <StyledInteractiveArea
          {...expandInteractiveArea}
          vertical={columnResizer.config.vertical}
        />
      </div>
    );
  },
);
