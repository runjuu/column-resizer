import React from 'react';

import { Badge, BadgeProps } from '../badge';

export type BadgesProps = {
  items: BadgeProps[];
};

export function Badges({ items }: BadgesProps) {
  return (
    <div className="flex items-center gap-2 mt-2">
      {items.map((item) => (
        <Badge {...item} key={item.href} />
      ))}
    </div>
  );
}
