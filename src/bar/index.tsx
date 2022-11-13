import * as React from 'react';

import { ChildProps, ExpandInteractiveArea } from '../types';
import { ResizerControllerContext } from '../context';
import { BarController, BarControllerConfig } from '../core';
import { generateId } from '../utils';

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
  const interactiveAreaRef = React.useRef<HTMLDivElement>(null);
  const barID = React.useMemo(() => generateId('BAR'), []);
  const config = React.useMemo(() => ({ onClick, onStatusChanged }), [onClick, onStatusChanged]);
  const barController = React.useMemo(
    () => new BarController(barID, controller, config),
    [barID, controller, config],
  );

  React.useEffect(() => controller.reportItemConfig(barID, { size }), [controller, size]);
  React.useEffect(() => barController.watchEvents(interactiveAreaRef.current), [barController]);

  return (
    <StyledBar data-id={barID} size={size} {...props} ref={innerRef}>
      {children}
      <StyledInteractiveArea
        {...expandInteractiveArea}
        ref={interactiveAreaRef}
        vertical={controller.config.vertical}
      />
    </StyledBar>
  );
}
