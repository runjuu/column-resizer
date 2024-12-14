import { BarAction, BarActionType, Coordinate, ItemType } from '../types';
import {
  DISABLE_PASSIVE,
  ParsedResizerItem,
  dispatchResizerEvent,
  isValidNumber,
  parseItemConfig,
} from '../utils';

import { ColumnInstance } from './column-instance';

export type DispatchBarAction = (elm: HTMLElement, action: Omit<BarAction, 'barIndex'>) => void;

export type ColumnBarConfig = {
  size: number;
};

type ValidElmEventKey = {
  [K in keyof HTMLElementEventMap]: K extends `${'touch' | 'mouse'}${string}` ? K : never;
}[keyof HTMLElementEventMap];

type ValidElm = {
  addEventListener<K extends ValidElmEventKey>(
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends ValidElmEventKey>(
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | EventListenerOptions,
  ): void;
};

export class ColumnBar extends ColumnInstance<ColumnBarConfig> {
  static getStyle({ size }: ColumnBarConfig) {
    return {
      flex: `0 0 ${size}px`,
    };
  }

  private isActive = false;
  private isValidClick = true;

  constructor(
    item: ParsedResizerItem,
    private readonly dispatchBarAction: DispatchBarAction,
  ) {
    super(ItemType.BAR, item.elm, () => getConfig(item));

    const disposeList = [
      this.attachListener(this.elm, 'mousedown', BarActionType.ACTIVATE),
      this.attachListener(document, 'mousemove', BarActionType.MOVE),
      this.attachListener(document, 'mouseup', BarActionType.DEACTIVATE),

      this.attachListener(this.elm, 'touchstart', BarActionType.ACTIVATE, DISABLE_PASSIVE),
      this.attachListener(document, 'touchmove', BarActionType.MOVE, DISABLE_PASSIVE),
      this.attachListener(document, 'touchend', BarActionType.DEACTIVATE),
      this.attachListener(document, 'touchcancel', BarActionType.DEACTIVATE),
    ];

    this.destroy = () => {
      super.destroy();
      disposeList.forEach((dispose) => dispose());
    };
  }

  private attachListener<K extends ValidElmEventKey>(
    elm: ValidElm,
    event: K,
    type: BarActionType,
    options?: boolean | AddEventListenerOptions,
  ) {
    const handler = (event: MouseEvent | TouchEvent) => {
      this.disableUserSelectIfResizing(event, type);
      const { clientX: x, clientY: y } = ('touches' in event ? event.touches[0] : event) || {
        clientX: 0,
        clientY: 0,
      };
      this.triggerAction(this.elm, type, { x, y });
    };

    elm.addEventListener(event, handler, options);

    return () => elm.removeEventListener(event, handler, options);
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
      dispatchResizerEvent(elm, 'bar:click', null);
    }

    this.updateStatusIfNeed(elm, type);
    this.updateClickStatus(type);
  }

  private updateStatusIfNeed(elm: HTMLElement, type: BarActionType) {
    const onStatusChanged = (isActive: boolean) => {
      if (this.isActive !== isActive) {
        this.isActive = isActive;
        dispatchResizerEvent(elm, 'bar:status-change', { isActive });
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

function getConfig(item: Pick<ParsedResizerItem, 'elm'>): ColumnBarConfig {
  const { size } = parseItemConfig(item);

  return {
    size: isValidNumber(size) ? size : 10,
  };
}
