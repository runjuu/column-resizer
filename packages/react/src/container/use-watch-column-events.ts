import * as React from 'react';
import { useColumnResizerEvent } from '../hooks';

export type UseWatchColumnEventsConfig = {
  onActivate?: () => void;
  afterResizing?: () => void;
};

export function useWatchColumnEvents(
  ref: React.MutableRefObject<HTMLDivElement | null>,
  { onActivate, afterResizing }: UseWatchColumnEventsConfig,
) {
  useColumnResizerEvent(ref, 'column:activate', onActivate);
  useColumnResizerEvent(ref, 'column:after-resizing', afterResizing);
}
