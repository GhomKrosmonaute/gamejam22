import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import Bonus from "./Bonus";
import Level from "../scenes/Level";

export default class Inventory extends entity.CompositeEntity {
  public container: PIXI.Container;
  public sprite: PIXI.Sprite;
  public arrowButton: PIXI.Container;
  public bonuses: Bonus<any>[] = [];
  public isOpened = false;

  constructor(public level: Level) {
    super();
  }

  _setup() {
    this.container = new PIXI.Container();
    this._entityConfig.container.addChild(this.container);
  }

  _update() {}

  _teardown() {
    this.container = null;
  }

  _onPointerUp() {
    // todo: check mouse position to focus bonus or not
  }

  get focused(): Bonus<any> | null {
    return this.bonuses.find((b) => b.focused);
  }

  add(bonus: Bonus<any>, count = 1) {
    if (this.bonuses.includes(bonus)) {
      bonus.count += count;
      return;
    }
    bonus.sprite.scale.set(0.5);
    bonus.sprite.anchor.set(0.5);
    bonus.sprite.position.set(
      160 + this.bonuses.length * 190,
      this._entityConfig.app.view.height * 0.935
    );
    bonus.count = count;

    this._on(bonus.sprite, "pointerup", () => this.focus(bonus));
    this._on(bonus, "removeFromInventory", () => {
      this.remove(bonus);
    });
    this.bonuses.push(bonus);
    this._activateChildEntity(
      bonus,
      entity.extendConfig({
        container: this.container,
      })
    );
  }

  remove(bonus: Bonus<any>) {
    this._off(bonus);
    this.bonuses = this.bonuses.filter((b) => b !== bonus);
    this.container.removeChild(bonus.sprite);
    this._deactivateChildEntity(bonus);
  }

  focus(bonus?: Bonus<any>) {
    if (this.level.goButtonLocked) return;
    if (bonus && bonus.focused) bonus.focused = false;
    else for (const b of this.bonuses) b.focused = b === bonus;
  }
}
