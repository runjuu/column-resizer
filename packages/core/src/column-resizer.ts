import { BarActionType, ItemType, SizeRelatedInfo } from './types';
import { Resizer } from './resizer';
import {
  ColumnBar,
  ColumnBarConfig,
  ColumnSection,
  ColumnSectionConfig,
  DispatchBarAction,
} from './column-items';
import {
  BarActionScanResult,
  calculateCoordinateOffset,
  collectSizeRelatedInfo,
  ColumnItemsCache,
  createBarStore,
  isDisabledResponsive,
  isSolidItem,
  parseResizerItems,
  resizerItemAttributes,
  ResizerItems,
  watchResizerEvent,
} from './utils';

export type { ColumnSectionConfig, ColumnBarConfig };

export type ColumnResizerConfig = {
  vertical: boolean;
  onActivate?: () => void;
  beforeApplyResizer?: (resizer: Resizer) => void;
  afterResizing?: () => void;
};

export class ColumnResizer {
  styles = {
    container: <T>(style?: T) =>
      ({
        ...style,
        display: 'flex',
        flexDirection: this.direction,
      } as const),

    section: <T>(config: ColumnSectionConfig, style?: T) => ({
      ...style,
      ...ColumnSection.getStyle(config, this.config.vertical),
    }),

    bar: <T>(config: ColumnBarConfig, style?: T) => ({
      ...style,
      ...ColumnBar.getStyle(config),
    }),
  };

  attributes = {
    bar: resizerItemAttributes(ItemType.BAR),
    section: resizerItemAttributes(ItemType.SECTION),
  };

  on = watchResizerEvent;

  private itemsCache = new ColumnItemsCache();

  private barStore = createBarStore({
    calculateOffset: (current, original) => calculateCoordinateOffset(current, original)[this.axis],
    getSizeRelatedInfo: () => this.makeSizeInfos(),
  });

  private get axis() {
    return this.config.vertical ? 'y' : 'x';
  }

  private get dimension() {
    return this.config.vertical ? 'height' : 'width';
  }

  private get direction() {
    return this.config.vertical ? 'column' : 'row';
  }

  constructor(public readonly config: Readonly<ColumnResizerConfig>) {
    this.barStore.subscribe((state) => {
      this.monitorBarStatusChanges(state);
      this.sizeRelatedInfoChange(state);
    });
  }

  refresh(container: HTMLElement | null) {
    if (container) {
      this.itemsCache.update(
        parseResizerItems(container).map((item) => {
          switch (item.type) {
            case ItemType.BAR:
              return new ColumnBar(item, this.dispatchBarAction);
            case ItemType.SECTION:
              return new ColumnSection(item);
          }
        }),
      );

      this.initStyles(container, this.itemsCache.getItems());
      this.sizeRelatedInfoChange(this.makeSizeInfos());
    }
  }

  destroy() {
    this.itemsCache.reset();
    this.barStore.unsubscribeAll();
  }

  getResizer(): Resizer {
    return new Resizer(this.makeSizeInfos());
  }

  applyResizer(resizer: Resizer): void {
    this.sizeRelatedInfoChange(resizer.getResult());
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

    this.itemsCache.getItems().forEach((item) => {
      if (item instanceof ColumnBar) {
        collect({
          elm: item.elm,
          disableResponsive: true,
          isSolid: true,
          currentSize: item.elm.getBoundingClientRect()[this.dimension],
        });
      }

      if (item instanceof ColumnSection) {
        collect({
          elm: item.elm,
          maxSize: item.config.maxSize,
          minSize: item.config.minSize,
          disableResponsive: isDisabledResponsive(item.config),
          isSolid: isSolidItem(item.config),
          currentSize: item.elm.getBoundingClientRect()[this.dimension],
        });
      }
    });

    return getResult();
  }

  private initStyles(container: HTMLElement, items: ResizerItems) {
    Object.assign(container.style, this.styles.container());

    items.forEach((item) => {
      if (item instanceof ColumnBar) {
        Object.assign(item.elm.style, this.styles.bar(item.config));
      }

      if (item instanceof ColumnSection) {
        Object.assign(item.elm.style, this.styles.section(item.config));
      }
    });
  }
}