import { SectionController, ItemType } from '@column-resizer/core';
import * as React from 'react';

import { ChildProps } from '../types';
import { useIsomorphicLayoutEffect, useForwardedRef, useColumnResizer } from '../hooks';

export type SectionProps = Omit<ChildProps, 'context'> &
  React.HTMLAttributes<HTMLDivElement> & {
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
  ...props
}: SectionProps) {
  const ref = useForwardedRef<HTMLDivElement | null>(null, innerRef);
  const columnResizer = useColumnResizer();

  useIsomorphicLayoutEffect(() => {
    const elm = ref.current;

    return new SectionController(columnResizer, {
      defaultSize,
      size,
      disableResponsive,
      minSize,
      maxSize,
      onSizeChanged,
    }).setup(elm, ({ flexGrow, flexShrink, flexBasis }) => {
      if (elm) {
        elm.style.flexGrow = `${flexGrow}`;
        elm.style.flexShrink = `${flexShrink}`;
        elm.style.flexBasis = `${flexBasis}px`;
      }
    });
  }, [columnResizer, defaultSize, size, disableResponsive, minSize, maxSize, onSizeChanged, ref]);

  return (
    <div
      ref={ref}
      data-item-type={ItemType.SECTION}
      data-item-config={JSON.stringify({ defaultSize, size, disableResponsive, minSize, maxSize })}
      {...props}
      style={{
        overflow: 'hidden',
        [columnResizer.config.vertical ? 'maxHeight' : 'maxWidth']: maxSize,
        [columnResizer.config.vertical ? 'minHeight' : 'minWidth']: minSize,
        ...props.style,
      }}
    />
  );
}
