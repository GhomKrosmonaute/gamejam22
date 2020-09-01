import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as game from "../game";
import Bonus from "./Bonus";

export default class Inventory extends entity.CompositeEntity {
  public container: PIXI.Container;
  public sprite: PIXI.Sprite;
  public arrowButton: PIXI.Container;
  public bonuses: Bonus[] = [];
  public isOpened = false;

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

  get focused(): Bonus | null {
    return this.bonuses.find((b) => b.focused);
  }

  add(bonus: Bonus) {
    if (this.bonuses.includes(bonus)) {
      bonus.count++;
      return;
    }
    bonus.sprite.scale.set(0.75);
    bonus.sprite.anchor.set(0.5);
    bonus.sprite.position.set(
      130 + this.bonuses.length * 100,
      this._entityConfig.app.view.height * 0.93
    );

    this._on(bonus.sprite, "pointerup", () => this.focus(bonus));
    this._on(bonus, "trigger", () => {
      this.focus();
      bonus.count--;
      if (bonus.count === 0) {
        this.remove(bonus);
      }
    });
    this.bonuses.push(bonus);
    this._activateChildEntity(
      bonus,
      entity.extendConfig({
        container: this.container,
      })
    );
  }

  remove(bonus: Bonus) {
    this._off(bonus);
    this.bonuses = this.bonuses.filter((b) => b !== bonus);
    this.container.removeChild(bonus.sprite);
    this._deactivateChildEntity(bonus);
  }

  focus(bonus?: Bonus) {
    if (bonus && bonus.focused) bonus.focused = false;
    else for (const b of this.bonuses) b.focused = b === bonus;
  }
}
