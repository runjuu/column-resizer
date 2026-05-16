import type { ColumnInstance } from '../column-items/column-instance';
import type { ItemType } from '../types';

export type ResizerItems = ReadonlyArray<ColumnInstance>;

export class ColumnItemsCache {
  private infoMap = new Map<ColumnInstance['elm'], { item: ColumnInstance; index: number }>();
  private items: ResizerItems = [];

  update(items: ResizerItems) {
    const nextItems = new Set(items);

    this.infoMap.clear();
    this.items.forEach((item) => {
      if (!nextItems.has(item)) {
        item.destroy();
      }
    });
    this.items = items;

    items.forEach((item, index) => {
      this.infoMap.set(item.elm, { item, index });
    });
  }

  reset() {
    this.update([]);
  }

  getItems() {
    return this.items;
  }

  getItem(elm: ColumnInstance['elm']): ColumnInstance | null {
    return this.infoMap.get(elm)?.item ?? null;
  }

  getReusableItem({
    elm,
    type,
  }: { elm: ColumnInstance['elm']; type: ItemType }): ColumnInstance | null {
    const item = this.infoMap.get(elm)?.item;

    if (item?.type !== type) {
      return null;
    }

    item.refreshConfig();
    return item;
  }

  getItemIndex(elm: ColumnInstance['elm']): number | null {
    return this.infoMap.get(elm)?.index ?? null;
  }
}
