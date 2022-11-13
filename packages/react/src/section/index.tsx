import { SectionController, ItemType } from '@column-resizer/core';
import * as React from 'react';

import { ChildProps } from '../types';
import { useIsomorphicLayoutEffect, useForwardedRef, useResizerController } from '../hooks';

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
  const controller = useResizerController();

  useIsomorphicLayoutEffect(() => {
    const elm = ref.current;

    return new SectionController(controller, {
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
  }, [controller, defaultSize, size, disableResponsive, minSize, maxSize, onSizeChanged, ref]);

  return (
    <div
      ref={ref}
      data-item-type={ItemType.SECTION}
      data-item-config={JSON.stringify({ defaultSize, size, disableResponsive, minSize, maxSize })}
      {...props}
      style={{
        overflow: 'hidden',
        [controller.config.vertical ? 'maxHeight' : 'maxWidth']: maxSize,
        [controller.config.vertical ? 'minHeight' : 'minWidth']: minSize,
        ...props.style,
      }}
    />
  );
}
