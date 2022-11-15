import { SizeInfo, ColumnInstance, ItemType } from '../types';
import { isValidNumber, dispatchResizerEvent, ParseResizerItemsResult } from '../utils';

export type ColumnSectionConfig = {
  size?: number;
  defaultSize?: number;
  maxSize?: number;
  minSize?: number;
  disableResponsive?: boolean;
};

export class ColumnSection extends ColumnInstance {
  static getStyle({ maxSize, minSize }: ColumnSectionConfig, vertical: boolean) {
    const toCSSSize = (size?: number) => (isValidNumber(size) ? `${size}px` : undefined);

    return {
      overflow: 'hidden',
      [vertical ? 'maxHeight' : 'maxWidth']: toCSSSize(maxSize),
      [vertical ? 'minHeight' : 'minWidth']: toCSSSize(minSize),
    };
  }

  private sizeInfo: SizeInfo | null = null;
  private flexGrowRatio = 0;
  readonly config: ColumnSectionConfig;

  constructor(item: ParseResizerItemsResult[0]) {
    super(ItemType.SECTION, item.elm);

    this.config = getConfig(item);
    this.updateStyle();
  }

  update({ sizeInfo, flexGrowRatio }: { sizeInfo: SizeInfo; flexGrowRatio: number }) {
    this.sizeInfo = sizeInfo;
    this.flexGrowRatio = flexGrowRatio;

    this.updateStyle();
    dispatchResizerEvent(this.elm, 'section:size-change', { size: sizeInfo.currentSize });
  }

  private updateStyle() {
    const { flexGrow, flexShrink, flexBasis } = this.getStyle();
    this.elm.style.flexGrow = `${flexGrow}`;
    this.elm.style.flexShrink = `${flexShrink}`;
    this.elm.style.flexBasis = `${flexBasis}px`;
  }

  private getStyle() {
    const flexShrink = isValidNumber(this.config.size) ? 0 : this.config.disableResponsive ? 1 : 0;

    if (this.sizeInfo) {
      const { disableResponsive, currentSize } = this.sizeInfo;

      return {
        flexShrink,
        flexGrow: disableResponsive ? 0 : this.flexGrowRatio * currentSize,
        flexBasis: disableResponsive ? currentSize : 0,
      };
    } else {
      const size = this.config.size || this.config.defaultSize;

      if (isValidNumber(size)) {
        return { flexShrink, flexGrow: 0, flexBasis: size };
      } else {
        return { flexShrink, flexGrow: 1, flexBasis: 0 };
      }
    }
  }
}

function getConfig({ config }: ParseResizerItemsResult[0]): ColumnSectionConfig {
  const { size, defaultSize, maxSize, minSize, disableResponsive } = config;

  return {
    size: isValidNumber(size) ? size : undefined,
    defaultSize: isValidNumber(defaultSize) ? defaultSize : undefined,
    maxSize: isValidNumber(maxSize) ? maxSize : undefined,
    minSize: isValidNumber(minSize) ? minSize : undefined,
    disableResponsive: !!disableResponsive,
  };
}
