import { BarActionType, ItemType, SizeRelatedInfo, ResizerItemConfig } from './types';
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
  isValidNumber,
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

  styles = {
    container: <T>(style?: T) =>
      ({
        display: 'flex',
        flexDirection: this.config.vertical ? 'column' : 'row',
        ...style,
      } as const),

    section: <T>({ maxSize, minSize }: ResizerItemConfig, style?: T) => {
      const toCSSSize = (size?: number) => (isValidNumber(size) ? `${size}px` : undefined);

      return {
        overflow: 'hidden',
        [this.config.vertical ? 'maxHeight' : 'maxWidth']: toCSSSize(maxSize),
        [this.config.vertical ? 'minHeight' : 'minWidth']: toCSSSize(minSize),
        ...style,
      };
    },

    bar: <T>({ size }: ResizerItemConfig, style?: T) => ({
      flex: `0 0 ${size}px`,
      ...style,
    }),
  };

  attributes = {
    bar(config: Pick<Required<ResizerItemConfig>, 'size'>) {
      return {
        'data-item-type': ItemType.BAR,
        'data-item-config': JSON.stringify(config),
      };
    },

    section(config: ResizerItemConfig) {
      return {
        'data-item-type': ItemType.SECTION,
        'data-item-config': JSON.stringify(config),
      };
    },
  };

  on = watchResizerEvent;

  constructor(public readonly config: Readonly<ColumnResizerConfig>) {
    this.barStore.subscribe((state) => {
      this.monitorBarStatusChanges(state);
      this.sizeRelatedInfoChange(state);
    });
  }

  refresh(container: HTMLElement | null) {
    if (container) {
      Object.assign(container.style, this.styles.container());

      this.itemsCache.update(
        parseResizerItems(container).map((item) => {
          switch (item.type) {
            case ItemType.BAR:
              Object.assign(item.elm.style, this.styles.bar(item.config));
              return new ColumnBar(item.elm, this.dispatchBarAction);
            case ItemType.SECTION:
              Object.assign(item.elm.style, this.styles.section(item.config));
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
