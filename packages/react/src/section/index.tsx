import { ColumnSectionConfig } from '@column-resizer/core';
import * as React from 'react';

import { useForwardedRef, useColumnResizer, useColumnResizerEvent } from '../hooks';
import { RefObject } from 'react';

export type SectionProps = React.HTMLAttributes<HTMLDivElement> &
  ColumnSectionConfig & {
    innerRef?: RefObject<HTMLDivElement>;
    onSizeChanged?: (currentSize: number) => void;
  };

export function Section({
  defaultSize,
  size,
  disableResponsive,
  minSize,
  maxSize,
  innerRef,
  onSizeChanged,
  style,
  ...props
}: SectionProps) {
  const ref = useForwardedRef<HTMLDivElement | null>(null, innerRef);
  const columnResizer = useColumnResizer();
  const config = { defaultSize, size, disableResponsive, minSize, maxSize };

  useColumnResizerEvent(ref, 'section:size-change', (e) => onSizeChanged?.(e.detail.size));

  return (
    <div
      ref={ref}
      {...props}
      style={columnResizer.styles.section(config, style)}
      {...columnResizer.attributes.section(config)}
    />
  );
}
