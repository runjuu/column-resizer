import { map } from 'rxjs/operators';

import { ResizerItemConfig, SizeInfo } from './types';
import { isValidNumber, noop } from './utils';
import { ResizerController } from './resizer-controller';

export type SectionControllerConfig = ResizerItemConfig & {
  onSizeChanged?: (currentSize: number) => void;
};

export class SectionController {
  private sizeInfo: SizeInfo | null = null;
  private flexGrowRatio = 0;

  get style() {
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

  constructor(
    private readonly controller: ResizerController,
    private readonly config: SectionControllerConfig,
  ) {}

  setup(containerElm: HTMLElement | null, callback: (style: typeof this.style) => void) {
    if (!containerElm) return noop;

    const removeConfig = this.controller.reportItemConfig(containerElm, this.config);

    const subscription = this.controller.sizeRelatedInfo$
      .pipe(
        map(({ sizeInfoArray, flexGrowRatio }) => ({
          sizeInfo: sizeInfoArray.find((info) => info.elm === containerElm),
          flexGrowRatio,
        })),
      )
      .subscribe(({ sizeInfo, flexGrowRatio }) => {
        if (!sizeInfo) return;

        this.sizeInfo = sizeInfo;
        this.flexGrowRatio = flexGrowRatio;

        callback(this.style);

        this.config.onSizeChanged?.(sizeInfo.currentSize);
      });

    callback(this.style);

    return () => {
      removeConfig();
      subscription.unsubscribe();
    };
  }
}
