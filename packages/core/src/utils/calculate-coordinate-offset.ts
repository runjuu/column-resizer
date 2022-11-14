import { Coordinate } from '../types';

export const DEFAULT_COORDINATE_OFFSET: Coordinate = { x: 0, y: 0 };

export function calculateCoordinateOffset(
  current: Coordinate,
  previous: Coordinate | null,
): Coordinate {
  if (previous) {
    return {
      x: current.x - previous.x,
      y: current.y - previous.y,
    };
  } else {
    return DEFAULT_COORDINATE_OFFSET;
  }
}
