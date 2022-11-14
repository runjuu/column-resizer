import { ItemType } from '@column-resizer/core';
import * as React from 'react';

import { useColumnResizer, useColumnResizerEvent, useForwardedRef } from '../hooks';
import { StyledBar, StyledInteractiveArea, ExpandInteractiveArea } from './styled';

export type { ExpandInteractiveArea };

export type BarProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> & {
  size: number;
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
  ...props
}: BarProps) {
  const columnResizer = useColumnResizer();
  const ref = useForwardedRef<HTMLDivElement | null>(null, innerRef);

  useColumnResizerEvent(ref, 'bar:click', () => onClick?.());
  useColumnResizerEvent(ref, 'bar:status-change', (e) => onStatusChanged?.(e.detail.isActive));

  return (
    <StyledBar
      data-item-type={ItemType.BAR}
      data-item-config={JSON.stringify({ size })}
      size={size}
      {...props}
      ref={ref}
    >
      {children}
      <StyledInteractiveArea {...expandInteractiveArea} vertical={columnResizer.config.vertical} />
    </StyledBar>
  );
}
