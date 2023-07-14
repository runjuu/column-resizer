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
  dispatchResizerEvent,
  isDisabledResponsive,
  isSolidItem,
  parseResizerItems,
  resizerItemAttributes,
  ResizerItems,
  ResizerEventHub,
} from './utils';

export type { ColumnSectionConfig, ColumnBarConfig };

export type ColumnResizerConfig = {
  vertical: boolean;
  beforeApplyResizer?: (resizer: Resizer) => void;
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

  private itemsCache = new ColumnItemsCache();
  private eventHub = new ResizerEventHub();

  private container: HTMLElement | null = null;

  private barStore: ReturnType<typeof createBarStore>;

  private get axis() {
    return this.config.vertical ? 'y' : 'x';
  }

  private get dimension() {
    return this.config.vertical ? 'height' : 'width';
  }

  private get direction() {
    return this.config.vertical ? 'column' : 'row';
  }

  get on() {
    return this.eventHub.watchResizerEvent;
  }

  constructor(public readonly config: Readonly<ColumnResizerConfig>) {
    this.barStore = createBarStore({
      calculateOffset: (current, original) =>
        calculateCoordinateOffset(current, original)[this.axis],
      getSizeRelatedInfo: () => this.makeSizeInfos(),
    });
  }

  init(container: HTMLElement | null) {
    this.dispose();
    this.container = container;

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

      this.barStore.subscribe((state) => {
        this.monitorBarStatusChanges(state);
        this.sizeRelatedInfoChange(state);
      });
    }
  }

  dispose() {
    this.container = null;
    this.itemsCache.reset();
    this.barStore.unsubscribeAll();
    this.eventHub.reset();
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
        return dispatchResizerEvent(this.container, 'column:activate', null);
      case BarActionType.DEACTIVATE:
        return dispatchResizerEvent(this.container, 'column:after-resizing', null);
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
