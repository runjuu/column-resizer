import { ColumnBarConfig } from '@column-resizer/core';

import * as React from 'react';

import { useColumnResizer, useColumnResizerEvent, useForwardedRef } from '../hooks';
import { StyledInteractiveArea, ExpandInteractiveArea } from './styled';

export type { ExpandInteractiveArea };

export type BarProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> &
  ColumnBarConfig & {
    expandInteractiveArea?: ExpandInteractiveArea;
    innerRef?: React.RefObject<HTMLDivElement>;
    onClick?: () => void;
    onStatusChanged?: (isActive: boolean) => void;
  };

export function Bar({
  children,
  onClick,
  innerRef,
  expandInteractiveArea,
  onStatusChanged,
  size,
  style,
  ...props
}: BarProps) {
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
      <StyledInteractiveArea {...expandInteractiveArea} vertical={columnResizer.config.vertical} />
    </div>
  );
}
