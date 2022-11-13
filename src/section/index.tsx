import * as React from 'react';

import { ChildProps } from '../types';
import { ResizerControllerContext } from '../context';
import { generateId } from '../utils';
import { SectionController } from '../core';

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
  const sectionID = React.useMemo(() => generateId('SECTION'), []);

  const config = React.useMemo(
    () => ({ defaultSize, size, disableResponsive, minSize, maxSize, onSizeChanged }),
    [defaultSize, size, disableResponsive, minSize, maxSize, onSizeChanged],
  );

  const sectionController = React.useMemo(
    () => new SectionController(sectionID, controller, config),
    [sectionID, controller, config],
  );

  React.useEffect(
    () => controller.reportItemConfig(sectionID, config),
    [controller, sectionID, config],
  );

  React.useLayoutEffect(
    () =>
      sectionController.onStyleChange(({ flexGrow, flexShrink, flexBasis }) => {
        if (ref.current) {
          ref.current.style.flexGrow = `${flexGrow}`;
          ref.current.style.flexShrink = `${flexShrink}`;
          ref.current.style.flexBasis = `${flexBasis}px`;
        }
      }),
    [sectionController, ref],
  );

  React.useImperativeHandle(innerRef, () => ref.current!);

  return (
    <div
      ref={ref}
      data-id={sectionID}
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
