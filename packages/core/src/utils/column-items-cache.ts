import type { ColumnInstance } from '../column-items/column-instance';

export type ResizerItems = ReadonlyArray<ColumnInstance>;

export class ColumnItemsCache {
  private infoMap = new Map<ColumnInstance['elm'], { item: ColumnInstance; index: number }>();
  private items: ResizerItems = [];

  update(items: ResizerItems) {
    this.infoMap.clear();
    this.items.forEach((item) => item.destroy());
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

  getItemIndex(elm: ColumnInstance['elm']): number | null {
    return this.infoMap.get(elm)?.index ?? null;
  }
}
