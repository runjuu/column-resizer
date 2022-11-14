import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { ResizerItemConfig, SizeInfo, ResizerItemController } from '../types';
import { isValidNumber } from '../utils';
import { ColumnResizer } from '../column-resizer';
import { dispatchItemEvent } from '../item-events';

export type SectionControllerConfig = ResizerItemConfig;

export class SectionController implements ResizerItemController {
  private sizeInfo: SizeInfo | null = null;
  private flexGrowRatio = 0;
  private subscription = new Subscription();

  constructor(
    private readonly controller: ColumnResizer,
    private readonly container: HTMLElement,
    private readonly config: SectionControllerConfig,
  ) {
    this.subscription.add(
      this.controller.sizeRelatedInfo$
        .pipe(
          map(({ sizeInfoArray, flexGrowRatio }) => ({
            sizeInfo: sizeInfoArray.find((info) => info.elm === this.container),
            flexGrowRatio,
          })),
        )
        .subscribe(({ sizeInfo, flexGrowRatio }) => {
          if (!sizeInfo) return;

          this.sizeInfo = sizeInfo;
          this.flexGrowRatio = flexGrowRatio;

          this.updateStyle();
          dispatchItemEvent(container, 'section:size-change', { size: sizeInfo.currentSize });
        }),
    );

    this.updateStyle();
  }

  destroy() {
    this.subscription.unsubscribe();
  }

  private updateStyle() {
    const { flexGrow, flexShrink, flexBasis } = this.getStyle();
    this.container.style.flexGrow = `${flexGrow}`;
    this.container.style.flexShrink = `${flexShrink}`;
    this.container.style.flexBasis = `${flexBasis}px`;
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
