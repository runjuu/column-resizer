import { animationFrameScheduler, merge, Subject } from 'rxjs';
import { filter, map, observeOn, share, tap } from 'rxjs/operators';

import { BarAction, BarActionType, BarID, ResizerItem, SizeRelatedInfo } from '../types';

import { Resizer } from './resizer';
import { BarActionScanResult, scanBarAction } from './operators';
import {
  calculateCoordinateOffset,
  collectSizeRelatedInfo,
  isDisabledResponsive,
  isSolid,
} from './utils';
import { parseResizerItems } from '../utils';

export type ResizerControllerConfig = {
  vertical: boolean;
  onActivate?: () => void;
  beforeApplyResizer?: (resizer: Resizer) => void;
  afterResizing?: () => void;
};

type ResizerItems = ReadonlyArray<Readonly<ResizerItem>>;

export class ResizerController {
  private itemConfigMap = new Map<ResizerItem['id'], ResizerItem['config']>();
  private items: ResizerItems = [];
  private readonly barActions$ = new Subject<BarAction>();
  private readonly sizeRelatedInfoAction$ = new Subject<SizeRelatedInfo>();

  constructor(public readonly config: Readonly<ResizerControllerConfig>) {}

  refresh(container: HTMLElement) {
    this.items = parseResizerItems(container, this.itemConfigMap);
    this.sizeRelatedInfoAction$.next(this.makeSizeInfos());
  }

  reportItemConfig(id: ResizerItem['id'], config: ResizerItem['config']) {
    this.itemConfigMap.set(id, config);

    return () => {
      this.itemConfigMap.delete(id);
    };
  }

  triggerBarAction(id: BarID, action: Omit<BarAction, 'barIndex'>) {
    this.barActions$.next({
      ...action,
      barIndex: this.items.findIndex((item) => item.id === id),
    });
  }

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

    this.items.forEach(({ config, id, elm }) => {
      collect({
        id: id,
        maxSize: config.maxSize,
        minSize: config.minSize,
        disableResponsive: isDisabledResponsive(config),
        isSolid: isSolid(config),
        currentSize: elm.getBoundingClientRect()[this.dimension],
      });
    });

    return getResult();
  }
}
