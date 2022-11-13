import * as React from 'react';
import { map, tap } from 'rxjs/operators';

import { ChildProps, SizeInfo } from '../types';
import { ResizerControllerContext } from '../context';
import { generateId, isValidNumber } from '../utils';
import { StyledSection } from './styled';

export type SectionProps = Omit<ChildProps, 'context'> &
  React.HTMLAttributes<HTMLDivElement> & {
    onSizeChanged?: (currentSize: number) => void;
  };

export function Section({
  defaultSize,
  size,
  disableResponsive,
  minSize,
  maxSize,
  innerRef,
  onSizeChanged,
  ...props
}: SectionProps) {
  const defaultInnerRef = React.useRef<HTMLDivElement>(null);
  const ref = innerRef || defaultInnerRef;
  const controller = React.useContext(ResizerControllerContext)!; // TODO: - handle null;
  const sectionID = React.useMemo(() => generateId('SECTION'), []);

  const sizeInfoRef = React.useRef<SizeInfo | null>(null);
  const flexGrowRatioRef = React.useRef(0);

  React.useEffect(
    () =>
      controller.reportItemConfig(sectionID, {
        defaultSize,
        size,
        disableResponsive,
        minSize,
        maxSize,
      }),
    [controller, sectionID, defaultSize, size, disableResponsive, minSize, maxSize],
  );

  const getStyle = React.useCallback(
    (sizeInfo = sizeInfoRef.current, flexGrowRatio = flexGrowRatioRef.current) => {
      const flexShrink = getFlexShrink();

      if (sizeInfo) {
        const { disableResponsive, currentSize } = sizeInfo;

        return {
          flexShrink,
          flexGrow: disableResponsive ? 0 : flexGrowRatio * currentSize,
          flexBasis: disableResponsive ? currentSize : 0,
        };
      } else {
        const s = size || defaultSize;

        if (isValidNumber(s)) {
          return { flexShrink, flexGrow: 0, flexBasis: s };
        } else {
          return { flexShrink, flexGrow: 1, flexBasis: 0 };
        }
      }

      function getFlexShrink() {
        if (isValidNumber(size)) {
          return 0;
        } else {
          return disableResponsive ? 1 : 0;
        }
      }
    },
    [sizeInfoRef, flexGrowRatioRef, size, disableResponsive],
  );

  React.useEffect(() => {
    const subscription = controller.sizeRelatedInfo$
      .pipe(
        map(({ sizeInfoArray, flexGrowRatio }) => ({
          sizeInfo: sizeInfoArray.find(({ id }) => id === sectionID),
          flexGrowRatio,
        })),
        tap(({ sizeInfo, flexGrowRatio }) => {
          if (!sizeInfo) return;

          sizeInfoRef.current = sizeInfo;
          flexGrowRatioRef.current = flexGrowRatio;

          if (ref.current) {
            const { flexGrow, flexShrink, flexBasis } = getStyle(sizeInfo, flexGrowRatio);

            ref.current.style.flexGrow = `${flexGrow}`;
            ref.current.style.flexShrink = `${flexShrink}`;
            ref.current.style.flexBasis = `${flexBasis}px`;

            onSizeChanged?.(sizeInfo.currentSize);
          }
        }),
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [controller, sectionID, ref, sizeInfoRef, flexGrowRatioRef, onSizeChanged, getStyle]);

  return (
    <StyledSection
      data-id={sectionID}
      {...props}
      {...getStyle()}
      vertical={controller.config.vertical}
      ref={ref}
    />
  );
}
