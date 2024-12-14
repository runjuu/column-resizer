import { ColumnSectionConfig } from '@column-resizer/core';
import * as React from 'react';

import { useColumnResizer, useColumnResizerEvent, useForwardedRef } from '../hooks';

export type SectionProps = React.HTMLAttributes<HTMLDivElement> &
  ColumnSectionConfig & {
    onSizeChanged?: (currentSize: number) => void;
  };

export const Section = React.forwardRef<HTMLDivElement, SectionProps>(
  (
    { defaultSize, size, disableResponsive, minSize, maxSize, onSizeChanged, style, ...props },
    innerRef,
  ) => {
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
  },
);
