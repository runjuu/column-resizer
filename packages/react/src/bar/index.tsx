import { BarController, BarControllerConfig, ItemType } from '@column-resizer/core';
import * as React from 'react';

import { ChildProps, ExpandInteractiveArea } from '../types';
import { ResizerControllerContext } from '../context';

import { StyledBar, StyledInteractiveArea } from './styled';

type Props = React.HTMLAttributes<HTMLDivElement> &
  Pick<ChildProps, 'innerRef'> &
  BarControllerConfig & {
    size: number;
    expandInteractiveArea?: ExpandInteractiveArea;
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
  const controller = React.useContext(ResizerControllerContext)!; // TODO: - handle null.
  const ref = React.useRef<HTMLDivElement>(null);
  const config = React.useMemo(() => ({ onClick, onStatusChanged }), [onClick, onStatusChanged]);
  const barController = React.useMemo(
    () => new BarController(controller, config),
    [controller, config],
  );

  React.useEffect(() => controller.reportItemConfig(ref.current, { size }), [controller, size]);
  React.useEffect(() => barController.watchEvents(ref.current), [barController]);

  React.useImperativeHandle(innerRef, () => ref.current!);

  return (
    <StyledBar data-item-type={ItemType.BAR} size={size} {...props} ref={ref}>
      {children}
      <StyledInteractiveArea {...expandInteractiveArea} vertical={controller.config.vertical} />
    </StyledBar>
  );
}
