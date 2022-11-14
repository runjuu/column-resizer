import { BarActionType, ItemType, SizeRelatedInfo } from './types';
import { Resizer } from './resizer';
import { ColumnSection, ColumnBar, DispatchBarAction } from './column-items';
import {
  parseResizerItems,
  isSolidItem,
  isDisabledResponsive,
  calculateCoordinateOffset,
  collectSizeRelatedInfo,
  BarActionScanResult,
  ColumnItemsCache,
  watchResizerEvent,
  createBarStore,
} from './utils';

export type ColumnResizerConfig = {
  vertical: boolean;
  onActivate?: () => void;
  beforeApplyResizer?: (resizer: Resizer) => void;
  afterResizing?: () => void;
};

export class ColumnResizer {
  private itemsCache = new ColumnItemsCache();

  private barStore = createBarStore({
    calculateOffset: (current, original) => calculateCoordinateOffset(current, original)[this.axis],
    getSizeRelatedInfo: () => this.makeSizeInfos(),
  });

  constructor(public readonly config: Readonly<ColumnResizerConfig>) {
    this.barStore.subscribe((state) => {
      this.monitorBarStatusChanges(state);
      this.sizeRelatedInfoChange(state);
    });
  }

  on = watchResizerEvent;

  refresh(container: HTMLElement | null) {
    if (container) {
      this.itemsCache.update(
        parseResizerItems(container).map((item) => {
          switch (item.type) {
            case ItemType.BAR:
              return new ColumnBar(item.elm, this.dispatchBarAction);
            case ItemType.SECTION:
              return new ColumnSection(item.elm, item.config);
          }
        }),
      );

      this.sizeRelatedInfoChange(this.makeSizeInfos());
    }
  }

  destroy() {
    this.itemsCache.reset();
    this.barStore.clearSubscription();
  }

  getResizer(): Resizer {
    return new Resizer(this.makeSizeInfos());
  }

  applyResizer(resizer: Resizer): void {
    this.sizeRelatedInfoChange(resizer.getResult());
  }

  private get axis() {
    return this.config.vertical ? 'y' : 'x';
  }

  private get dimension() {
    return this.config.vertical ? 'height' : 'width';
  }

  private dispatchBarAction: DispatchBarAction = (elm, action) => {
    const barIndex = this.itemsCache.getItemIndex(elm);

    if (barIndex) {
      this.barStore.dispatch({ ...action, barIndex });
    }
  };

  private sizeRelatedInfoChange(info: SizeRelatedInfo | BarActionScanResult) {
    if (info.discard) return;

    info = (() => {
      if (typeof this.config.beforeApplyResizer === 'function') {
        const resizer = new Resizer(info);
        this.config.beforeApplyResizer(resizer);
        return resizer.getResult();
      } else {
        return info;
      }
    })();

    if (info.discard) return;

    info.sizeInfoArray.forEach((sizeInfo) => {
      const item = this.itemsCache.getItem(sizeInfo.elm);

      if (item instanceof ColumnSection) {
        item.update({ sizeInfo, flexGrowRatio: info.flexGrowRatio });
      }
    });
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

    this.itemsCache.getItems().forEach(({ config, elm }) => {
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
