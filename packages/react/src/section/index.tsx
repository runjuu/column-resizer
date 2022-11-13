import { SectionController, ItemType } from '@column-resizer/core';
import * as React from 'react';

import { ChildProps } from '../types';
import { ResizerControllerContext } from '../context';
import { useIsomorphicLayoutEffect } from '../hooks';

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
  const ref = React.useRef<HTMLDivElement>(null);
  const controller = React.useContext(ResizerControllerContext)!; // TODO: - handle null;

  const config = React.useMemo(
    () => ({ defaultSize, size, disableResponsive, minSize, maxSize, onSizeChanged }),
    [defaultSize, size, disableResponsive, minSize, maxSize, onSizeChanged],
  );

  const sectionController = React.useMemo(
    () => new SectionController(controller, config),
    [controller, config],
  );

  React.useImperativeHandle(innerRef, () => ref.current!);

  useIsomorphicLayoutEffect(() => {
    controller.reportItemConfig(ref.current, config);
  }, [controller, config]);

  React.useEffect(() => {
    const elm = ref.current;

    return sectionController.onStyleChange(elm, ({ flexGrow, flexShrink, flexBasis }) => {
      if (elm) {
        elm.style.flexGrow = `${flexGrow}`;
        elm.style.flexShrink = `${flexShrink}`;
        elm.style.flexBasis = `${flexBasis}px`;
      }
    });
  }, [sectionController]);

  return (
    <div
      ref={ref}
      data-item-type={ItemType.SECTION}
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
