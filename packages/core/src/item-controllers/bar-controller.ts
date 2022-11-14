import { Subscription } from 'rxjs';

import { BarAction, BarActionType, Coordinate, ResizerItemController } from '../types';
import { DISABLE_PASSIVE } from '../utils';

import { dispatchItemEvent } from '../item-events';

export type DispatchBarAction = (elm: HTMLElement, action: Omit<BarAction, 'barIndex'>) => void;

export class BarController implements ResizerItemController {
  private isActive = false;
  private isValidClick = true;
  private subscription = new Subscription();

  constructor(container: HTMLElement, private readonly dispatchBarAction: DispatchBarAction) {
    const onMouseDown = this.triggerMouseAction(container, BarActionType.ACTIVATE);
    const onMouseMove = this.triggerMouseAction(container, BarActionType.MOVE);
    const onMouseUp = this.triggerMouseAction(container, BarActionType.DEACTIVATE);

    const onTouchStart = this.triggerTouchAction(container, BarActionType.ACTIVATE);
    const onTouchMove = this.triggerTouchAction(container, BarActionType.MOVE);
    const onTouchEnd = this.triggerTouchAction(container, BarActionType.DEACTIVATE);
    const onTouchCancel = this.triggerTouchAction(container, BarActionType.DEACTIVATE);

    container.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    container.addEventListener('touchstart', onTouchStart, DISABLE_PASSIVE);
    document.addEventListener('touchmove', onTouchMove, DISABLE_PASSIVE);
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchCancel);

    this.subscription.add(() => {
      container.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      container.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    });
  }

  destroy() {
    this.subscription.unsubscribe();
  }

  private triggerMouseAction(elm: HTMLElement, type: BarActionType) {
    return (event: MouseEvent) => {
      this.disableUserSelectIfResizing(event, type);
      const { clientX: x, clientY: y } = event;
      this.triggerAction(elm, type, { x, y });
    };
  }

  private triggerTouchAction(elm: HTMLElement, type: BarActionType) {
    return (event: TouchEvent) => {
      this.disableUserSelectIfResizing(event, type);
      const touch = event.touches[0] || { clientX: 0, clientY: 0 };
      const { clientX: x, clientY: y } = touch;
      this.triggerAction(elm, type, { x, y });
    };
  }

  private disableUserSelectIfResizing(event: MouseEvent | TouchEvent, type: BarActionType) {
    if (this.isActive || type === BarActionType.ACTIVATE) {
      event.preventDefault();
    }
  }

  private triggerAction(elm: HTMLElement, type: BarActionType, coordinate: Coordinate) {
    if (this.isActive || type === BarActionType.ACTIVATE) {
      this.dispatchBarAction(elm, { type, coordinate });
    }

    if (this.isActive && this.isValidClick && type === BarActionType.DEACTIVATE) {
      this.isValidClick = false; // avoid trigger twice on mobile.
      // touch and click
      dispatchItemEvent(elm, 'bar:click', null);
    }

    this.updateStatusIfNeed(elm, type);
    this.updateClickStatus(type);
  }

  private updateStatusIfNeed(elm: HTMLElement, type: BarActionType) {
    const onStatusChanged = (isActive: boolean) => {
      if (this.isActive !== isActive) {
        this.isActive = isActive;
        dispatchItemEvent(elm, 'bar:status-change', { isActive });
      }
    };

    if (type === BarActionType.ACTIVATE) {
      onStatusChanged(true);
    } else if (type === BarActionType.DEACTIVATE) {
      onStatusChanged(false);
    }
  }

  private updateClickStatus(type: BarActionType) {
    if (this.isActive) {
      if (type === BarActionType.ACTIVATE) {
        this.isValidClick = true;
      } else if (type === BarActionType.MOVE) {
        this.isValidClick = false;
      }
    }
  }
}
