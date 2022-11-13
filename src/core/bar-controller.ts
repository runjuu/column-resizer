import * as React from 'react';

import { BarActionType, BarID, Coordinate } from '../types';
import { DISABLE_PASSIVE, noop } from '../utils';

import { ResizerController } from './resizer-controller';

export type BarControllerConfig = {
  onClick?: () => void;
  onStatusChanged?: (isActive: boolean) => void;
};

export class BarController {
  private isActivated = false;
  private isValidClick = true;

  private onMouseDown = this.triggerMouseAction(BarActionType.ACTIVATE);
  private onMouseMove = this.triggerMouseAction(BarActionType.MOVE);
  private onMouseUp = this.triggerMouseAction(BarActionType.DEACTIVATE);

  private onTouchStart = this.triggerTouchAction(BarActionType.ACTIVATE);
  private onTouchMove = this.triggerTouchAction(BarActionType.MOVE);
  private onTouchEnd = this.triggerTouchAction(BarActionType.DEACTIVATE);
  private onTouchCancel = this.triggerTouchAction(BarActionType.DEACTIVATE);

  constructor(
    private readonly barID: BarID,
    private readonly controller: ResizerController,
    private readonly config: BarControllerConfig,
  ) {}

  watchEvents(container: HTMLElement | null) {
    if (!container) return noop;

    container.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);

    container.addEventListener('touchstart', this.onTouchStart, DISABLE_PASSIVE);
    document.addEventListener('touchmove', this.onTouchMove, DISABLE_PASSIVE);
    document.addEventListener('touchend', this.onTouchEnd);
    document.addEventListener('touchcancel', this.onTouchCancel);

    return () => {
      container.removeEventListener('mousedown', this.onMouseDown);
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);

      container.removeEventListener('touchstart', this.onTouchStart);
      document.removeEventListener('touchmove', this.onTouchMove);
      document.removeEventListener('touchend', this.onTouchEnd);
      document.removeEventListener('touchcancel', this.onTouchCancel);
    };
  }

  private triggerMouseAction(type: BarActionType) {
    return (event: React.MouseEvent | MouseEvent) => {
      this.disableUserSelectIfResizing(event, type);
      const { clientX: x, clientY: y } = event;
      this.triggerAction(type, { x, y });
    };
  }

  private triggerTouchAction(type: BarActionType) {
    return (event: React.TouchEvent | TouchEvent) => {
      this.disableUserSelectIfResizing(event, type);
      const touch = event.touches[0] || { clientX: 0, clientY: 0 };
      const { clientX: x, clientY: y } = touch;
      this.triggerAction(type, { x, y });
    };
  }

  private disableUserSelectIfResizing(
    event: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent,
    type: BarActionType,
  ) {
    if (this.isActivated || type === BarActionType.ACTIVATE) {
      event.preventDefault();
    }
  }

  private triggerAction(type: BarActionType, coordinate: Coordinate) {
    if (this.isActivated || type === BarActionType.ACTIVATE) {
      this.controller.triggerBarAction(this.barID, { type, coordinate });
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
