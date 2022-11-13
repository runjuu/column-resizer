import * as React from 'react';
import { EMPTY } from 'rxjs';

import { ChildProps, ResizerContextType } from './types';
import { noop } from './utils';

export const ResizerContext = React.createContext<ResizerContextType>({
  createID: () => -1,
  populateInstance: noop,
  triggerBarAction: noop,
  vertical: false,
  sizeRelatedInfo$: EMPTY,
});

export const withResizerContext =
  <T extends ChildProps>(Target: React.ComponentType<T>) =>
  (props: Omit<T, 'context'>) => {
    const context = React.useContext(ResizerContext);
    const propsWithContext = { ...props, context } as T;
    return <Target {...propsWithContext} />;
  };
