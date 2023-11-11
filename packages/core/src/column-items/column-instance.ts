import { ItemType } from '../types';

export abstract class ColumnInstance<Config = unknown> {
  private _config: Config;
  private _observer: MutationObserver;

  get config(): Config {
    return this._config;
  }

  protected constructor(
    public readonly type: ItemType,
    public readonly elm: HTMLElement,
    private readonly getConfig: () => Config,
  ) {
    this._config = this.getConfig();
    this._observer = new MutationObserver(() => (this._config = this.getConfig()));
    this._observer.observe(elm, { attributes: true, attributeFilter: ['data-item-config'] });
  }

  destroy() {
    this._observer.disconnect();
  }
}
