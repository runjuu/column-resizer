import * as React from 'react';

import {
  BarActionType,
  ChildProps,
  Coordinate,
  ExpandInteractiveArea,
  ResizerContextType,
} from '../types';
import { ResizerContext } from '../context';
import { StyledBar, StyledInteractiveArea } from './Bar.styled';
import { disablePassive } from './disablePassive';

type Props = React.HTMLAttributes<HTMLDivElement> &
  Pick<ChildProps, 'innerRef'> & {
    size: number;
    onClick?: () => void;
    expandInteractiveArea?: ExpandInteractiveArea;
    onStatusChanged?: (isActive: boolean) => void;
  };

export function Bar(props_: Props) {
  const { children, onClick, innerRef, expandInteractiveArea, onStatusChanged, ...props } = props_;
  const defaultInnerRef = React.useRef<HTMLDivElement>(null);
  const ref = innerRef || defaultInnerRef;
  const context = React.useContext(ResizerContext);
  const [id] = React.useState(() => context.createID({ ...props_, context }));
  const interactiveAreaRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    context.populateInstance(id, ref);
  }, [id, context, ref]);

  useWatchEvents({
    id,
    context,
    interactiveAreaRef,
    onClickFromProps: onClick,
    onStatusChangedFromProps: onStatusChanged,
  });

  return (
    <StyledBar {...props} ref={ref}>
      {children}
      <StyledInteractiveArea
        {...expandInteractiveArea}
        ref={interactiveAreaRef}
        vertical={context.vertical}
      />
    </StyledBar>
  );
}

type WatchEventsParams = {
  id: number;
  context: ResizerContextType;
  interactiveAreaRef: React.RefObject<HTMLElement>;
  onClickFromProps: Props['onClick'];
  onStatusChangedFromProps: Props['onStatusChanged'];
};

function useWatchEvents({
  id,
  context,
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

    interactiveAreaRef.current?.addEventListener('touchstart', onTouchStart, disablePassive);
    document.addEventListener('touchmove', onTouchMove, disablePassive);
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
        context.triggerBarAction({ type, coordinate, barID: id });
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
  }, [id, context, interactiveAreaRef, onClickFromProps, isActivatedRef, updateStatusIfNeed]);
}
