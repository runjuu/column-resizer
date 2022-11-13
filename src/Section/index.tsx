import * as React from 'react';
import { filter, map, tap } from 'rxjs/operators';

import { ChildProps, SizeInfo } from '../types';
import { ResizerContext } from '../context';
import { isValidNumber } from '../utils';
import { StyledSection } from './Section.styled';

export type SectionProps = Omit<ChildProps, 'context'> &
  React.HTMLAttributes<HTMLDivElement> & {
    onSizeChanged?: (currentSize: number) => void;
  };

export function Section(props_: SectionProps) {
  const { defaultSize, size, disableResponsive, innerRef, onSizeChanged, ...props } = props_;
  const defaultInnerRef = React.useRef<HTMLDivElement>(null);
  const ref = innerRef || defaultInnerRef;
  const context = React.useContext(ResizerContext);
  const [id] = React.useState(() => context.createID({ ...props_, context }));

  React.useLayoutEffect(() => {
    context.populateInstance(id, ref);
  }, [id, context, ref]);

  const sizeInfoRef = React.useRef<SizeInfo | null>(null);
  const flexGrowRatioRef = React.useRef(0);

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
    const subscription = context.sizeRelatedInfo$
      .pipe(
        map(({ sizeInfoArray, flexGrowRatio }) => ({
          sizeInfo: sizeInfoArray[id],
          flexGrowRatio,
        })),
        filter(({ sizeInfo }) => !!sizeInfo),
        tap(({ sizeInfo, flexGrowRatio }) => {
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
  }, [context, id, ref, sizeInfoRef, flexGrowRatioRef, onSizeChanged, getStyle]);

  return <StyledSection {...props} {...getStyle()} context={context} ref={ref} />;
}
