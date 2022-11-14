import { animationFrameScheduler, merge, Subject } from 'rxjs';
import { filter, map, observeOn, share, tap } from 'rxjs/operators';

import { BarAction, BarActionType, ItemType, ResizerItem, SizeRelatedInfo } from './types';
import { Resizer } from './resizer';
import { BarController, SectionController, DispatchBarAction } from './item-controllers';
import {
  parseResizerItems,
  isSolidItem,
  isDisabledResponsive,
  calculateCoordinateOffset,
  collectSizeRelatedInfo,
  BarActionScanResult,
  scanBarAction,
} from './utils';
import { watchItemEvent } from './item-events';

export type ColumnResizerConfig = {
  vertical: boolean;
  onActivate?: () => void;
  beforeApplyResizer?: (resizer: Resizer) => void;
  afterResizing?: () => void;
};

type ResizerItems = ReadonlyArray<Readonly<ResizerItem>>;

export class ColumnResizer {
  private items: ResizerItems = [];
  private readonly barActions$ = new Subject<BarAction>();
  private readonly sizeRelatedInfoAction$ = new Subject<SizeRelatedInfo>();

  constructor(public readonly config: Readonly<ColumnResizerConfig>) {}

  refresh(container: HTMLElement | null) {
    this.items.forEach((item) => item.controller.destroy());

    if (container) {
      this.items = parseResizerItems(container).map((item) => {
        switch (item.type) {
          case ItemType.BAR:
            return { ...item, controller: new BarController(item.elm, this.dispatchBarAction) };
          case ItemType.SECTION:
            return { ...item, controller: new SectionController(this, item.elm, item.config) };
        }
      });

      this.sizeRelatedInfoAction$.next(this.makeSizeInfos());
    }
  }

  on = watchItemEvent;

  private dispatchBarAction: DispatchBarAction = (elm, action) => {
    const barIndex = this.items.findIndex((item) => item.elm === elm);
    this.barActions$.next({ ...action, barIndex });
  };

  readonly sizeRelatedInfo$ = merge(
    this.sizeRelatedInfoAction$,
    this.barActions$.pipe(
      scanBarAction({
        calculateOffset: (current, original) =>
          calculateCoordinateOffset(current, original)[this.axis],
        getSizeRelatedInfo: () => this.makeSizeInfos(),
      }),
      tap((scanResult) => this.monitorBarStatusChanges(scanResult)),
    ),
  ).pipe(
    filter(({ discard }) => !discard),
    map((resizeResult) => {
      if (typeof this.config.beforeApplyResizer === 'function') {
        const resizer = new Resizer(resizeResult);
        this.config.beforeApplyResizer(resizer);
        return resizer.getResult();
      } else {
        return resizeResult;
      }
    }),
    filter(({ discard }) => !discard),
    observeOn(animationFrameScheduler),
    share(),
  );

  getResizer(): Resizer {
    return new Resizer(this.makeSizeInfos());
  }

  applyResizer(resizer: Resizer): void {
    this.sizeRelatedInfoAction$.next(resizer.getResult());
  }

  private get axis() {
    return this.config.vertical ? 'y' : 'x';
  }

  private get dimension() {
    return this.config.vertical ? 'height' : 'width';
  }

  private monitorBarStatusChanges({ type }: BarActionScanResult) {
    switch (type) {
      case BarActionType.ACTIVATE:
        this.config.onActivate?.();
        return;
      case BarActionType.DEACTIVATE:
        this.config.afterResizing?.();
        return;
      default:
        return;
    }
  }

  private makeSizeInfos(): SizeRelatedInfo {
    const { collect, getResult } = collectSizeRelatedInfo();

    this.items.forEach(({ config, elm }) => {
      collect({
        elm,
        maxSize: config.maxSize,
        minSize: config.minSize,
        disableResponsive: isDisabledResponsive(config),
        isSolid: isSolidItem(config),
        currentSize: elm.getBoundingClientRect()[this.dimension],
      });
    });

    return getResult();
  }
}
