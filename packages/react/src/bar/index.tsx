import { BarController, BarControllerConfig, ItemType } from '@column-resizer/core';
import * as React from 'react';

import { ChildProps, ExpandInteractiveArea } from '../types';

import { StyledBar, StyledInteractiveArea } from './styled';
import { useColumnResizer, useForwardedRef } from '../hooks';

type Props = React.HTMLAttributes<HTMLDivElement> &
  BarControllerConfig & {
    size: number;
    expandInteractiveArea?: ExpandInteractiveArea;
    innerRef: ChildProps['innerRef'];
  };

export function Bar({
  children,
  onClick,
  innerRef,
  expandInteractiveArea,
  onStatusChanged,
  size,
  ...props
}: Props) {
  const columnResizer = useColumnResizer();
  const ref = useForwardedRef<HTMLDivElement | null>(null, innerRef);

  React.useEffect(
    () => new BarController(columnResizer, { onClick, onStatusChanged, size }).setup(ref.current),
    [columnResizer, onClick, onStatusChanged, size, ref],
  );

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
