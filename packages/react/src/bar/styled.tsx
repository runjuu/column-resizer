import * as React from 'react';

export type ExpandInteractiveArea = {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};

export type StyledInteractiveAreaProps = React.HTMLAttributes<HTMLDivElement> &
  ExpandInteractiveArea & {
    vertical: boolean;
  };

export const StyledInteractiveArea = React.forwardRef<HTMLDivElement, StyledInteractiveAreaProps>(
  ({ top = 0, right = 0, bottom = 0, left = 0, vertical, style: propsStyle, ...props }, ref) => {
    const style = React.useMemo(
      (): React.CSSProperties => ({
        position: 'absolute',
        top: -top,
        left: -left,
        right: -right,
        bottom: -bottom,
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none', // disable ios long press popup
        ...propsStyle,
      }),
      [propsStyle, top, left, right, bottom, vertical],
    );

    return <div {...props} style={style} ref={ref} />;
  },
);
