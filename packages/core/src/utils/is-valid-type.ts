import { ItemType } from '../types';

export function isValidType(type: string | null): type is ItemType {
  return !!type && type in ItemType;
}
