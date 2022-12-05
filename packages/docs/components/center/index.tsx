import React from 'react';

export type CenterProps = React.PropsWithChildren;
export function Center({ children }: CenterProps) {
  return (
    <div className="flex items-center justify-center whitespace-nowrap min-h-full">{children}</div>
  );
}
