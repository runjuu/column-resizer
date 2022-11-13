import * as React from 'react';

import { BarActionType, BarID, ChildProps, Coordinate, ExpandInteractiveArea } from '../types';
import { ResizerControllerContext } from '../context';
import { ResizerController } from '../core';
import { generateId, DISABLE_PASSIVE } from '../utils';

import { StyledBar, StyledInteractiveArea } from './styled';

type Props = React.HTMLAttributes<HTMLDivElement> &
  Pick<ChildProps, 'innerRef'> & {
    size: number;
    onClick?: () => void;
    expandInteractiveArea?: ExpandInteractiveArea;
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
}: Props) {
  const defaultInnerRef = React.useRef<HTMLDivElement>(null);
  const ref = innerRef || defaultInnerRef;
  const controller = React.useContext(ResizerControllerContext)!; // TODO: - handle null.
  const interactiveAreaRef = React.useRef<HTMLDivElement>(null);
  const barID = React.useMemo(() => generateId('BAR'), []);

  React.useEffect(() => controller.reportItemConfig(barID, { size }), [controller, size]);

  useWatchEvents({
    barID,
    controller,
    interactiveAreaRef,
    onClickFromProps: onClick,
    onStatusChangedFromProps: onStatusChanged,
  });

  return (
    <StyledBar data-id={barID} size={size} {...props} ref={ref}>
      {children}
      <StyledInteractiveArea
        {...expandInteractiveArea}
        ref={interactiveAreaRef}
        vertical={controller.config.vertical}
      />
    </StyledBar>
  );
}

type WatchEventsParams = {
  barID: BarID;
  controller: ResizerController;
  interactiveAreaRef: React.RefObject<HTMLElement>;
  onClickFromProps: Props['onClick'];
  onStatusChangedFromProps: Props['onStatusChanged'];
};

function useWatchEvents({
  barID,
  controller,
  interactiveAreaRef,
  onClickFromProps,
  onStatusChangedFromProps,
}: WatchEventsParams) {
  const isActivatedRef = React.useRef(false);
  const isValidClickRef = React.useRef(true);

  const updateStatusIfNeed = React.useCallback(
    (type: BarActionType) => {
      const onStatusChanged = (isActivated: boolean) => {
        if (isActivatedRef.current !== isActivated) {
          isActivatedRef.current = isActivated;
          onStatusChangedFromProps?.(isActivated);
        }
      };

      if (type === BarActionType.ACTIVATE) {
        onStatusChanged(true);
      } else if (type === BarActionType.DEACTIVATE) {
        onStatusChanged(false);
      }
    },
    [isActivatedRef, onStatusChangedFromProps],
  );

  const updateClickStatus = React.useCallback(
    (type: BarActionType) => {
      if (isActivatedRef.current) {
        if (type === BarActionType.ACTIVATE) {
          isValidClickRef.current = true;
        } else if (type === BarActionType.MOVE) {
          isValidClickRef.current = false;
        }
      }
    },
    [isActivatedRef],
  );

  React.useEffect(() => {
    const onMouseDown = triggerMouseAction(BarActionType.ACTIVATE);
    const onMouseMove = triggerMouseAction(BarActionType.MOVE);
    const onMouseUp = triggerMouseAction(BarActionType.DEACTIVATE);

    const onTouchStart = triggerTouchAction(BarActionType.ACTIVATE);
    const onTouchMove = triggerTouchAction(BarActionType.MOVE);
    const onTouchEnd = triggerTouchAction(BarActionType.DEACTIVATE);
    const onTouchCancel = triggerTouchAction(BarActionType.DEACTIVATE);

    interactiveAreaRef.current?.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    interactiveAreaRef.current?.addEventListener('touchstart', onTouchStart, DISABLE_PASSIVE);
    document.addEventListener('touchmove', onTouchMove, DISABLE_PASSIVE);
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchCancel);

    return () => {
      interactiveAreaRef.current?.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      interactiveAreaRef.current?.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };

    function disableUserSelectIfResizing(
      event: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent,
      type: BarActionType,
    ) {
      if (isActivatedRef.current || type === BarActionType.ACTIVATE) {
        event.preventDefault();
      }
    }

    function triggerAction(type: BarActionType, coordinate: Coordinate) {
      if (isActivatedRef.current || type === BarActionType.ACTIVATE) {
        controller.triggerBarAction(barID, { type, coordinate });
      }

      if (isActivatedRef.current && isValidClickRef.current && type === BarActionType.DEACTIVATE) {
        isValidClickRef.current = false; // avoid trigger twice on mobile.
        // touch and click
        onClickFromProps?.();
      }

      updateStatusIfNeed(type);
      updateClickStatus(type);
    }

    function triggerMouseAction(type: BarActionType) {
      return (event: React.MouseEvent | MouseEvent) => {
        disableUserSelectIfResizing(event, type);
        const { clientX: x, clientY: y } = event;
        triggerAction(type, { x, y });
      };
    }

    function triggerTouchAction(type: BarActionType) {
      return (event: React.TouchEvent | TouchEvent) => {
        disableUserSelectIfResizing(event, type);
        const touch = event.touches[0] || { clientX: 0, clientY: 0 };
        const { clientX: x, clientY: y } = touch;
        triggerAction(type, { x, y });
      };
    }
  }, [barID, controller, interactiveAreaRef, onClickFromProps, isActivatedRef, updateStatusIfNeed]);
}
