import * as React from 'react';

import { ChildProps } from '../types';

export type StyledSectionProps = React.HTMLAttributes<HTMLDivElement> &
  Pick<ChildProps, 'maxSize' | 'minSize'> & {
    vertical: boolean;
    flexGrow: number;
    flexShrink: number;
    flexBasis: number;
  };

export const StyledSection = React.forwardRef<HTMLDivElement, StyledSectionProps>(
  ({ vertical, maxSize, minSize, flexGrow, flexShrink, flexBasis, style, ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      style={{
        overflow: 'hidden',
        [vertical ? 'maxHeight' : 'maxWidth']: maxSize,
        [vertical ? 'minHeight' : 'minWidth']: minSize,
        flexGrow,
        flexShrink,
        flexBasis,
        ...style,
      }}
    />
  ),
);
