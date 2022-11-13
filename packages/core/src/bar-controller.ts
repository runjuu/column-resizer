import { BarActionType, Coordinate } from './types';
import { DISABLE_PASSIVE, noop } from './utils';

import { ResizerController } from './resizer-controller';

export type BarControllerConfig = {
  onClick?: () => void;
  onStatusChanged?: (isActive: boolean) => void;
};

export class BarController {
  private isActivated = false;
  private isValidClick = true;

  constructor(
    private readonly controller: ResizerController,
    private readonly config: BarControllerConfig,
  ) {}

  watchEvents(container: HTMLElement | null) {
    if (!container) return noop;

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

    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      container.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
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
    if (this.isActivated || type === BarActionType.ACTIVATE) {
      event.preventDefault();
    }
  }

  private triggerAction(elm: HTMLElement, type: BarActionType, coordinate: Coordinate) {
    if (this.isActivated || type === BarActionType.ACTIVATE) {
      this.controller.triggerBarAction(elm, { type, coordinate });
    }

    if (this.isActivated && this.isValidClick && type === BarActionType.DEACTIVATE) {
      this.isValidClick = false; // avoid trigger twice on mobile.
      // touch and click
      this.config.onClick?.();
    }

    this.updateStatusIfNeed(type);
    this.updateClickStatus(type);
  }

  private updateStatusIfNeed(type: BarActionType) {
    const onStatusChanged = (isActivated: boolean) => {
      if (this.isActivated !== isActivated) {
        this.isActivated = isActivated;
        this.config.onStatusChanged?.(isActivated);
      }
    };

    if (type === BarActionType.ACTIVATE) {
      onStatusChanged(true);
    } else if (type === BarActionType.DEACTIVATE) {
      onStatusChanged(false);
    }
  }

  private updateClickStatus(type: BarActionType) {
    if (this.isActivated) {
      if (type === BarActionType.ACTIVATE) {
        this.isValidClick = true;
      } else if (type === BarActionType.MOVE) {
        this.isValidClick = false;
      }
    }
  }
}
