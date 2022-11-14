import { ResizerItemConfig, SizeInfo, ColumnInstance, ItemType } from '../types';
import { isValidNumber } from '../utils';
import { dispatchResizerEvent } from '../utils/column-events';

export class ColumnSection extends ColumnInstance {
  private sizeInfo: SizeInfo | null = null;
  private flexGrowRatio = 0;

  constructor(public readonly elm: HTMLElement, public readonly config: ResizerItemConfig) {
    super(ItemType.SECTION, elm, config);
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
