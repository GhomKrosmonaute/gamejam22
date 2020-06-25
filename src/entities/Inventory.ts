import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import Bonus from "./Bonus";

export default class Inventory extends entity.ParallelEntity {
  public container: PIXI.Container;
  public bonus: Bonus[] = [];

  _setup() {
    this.container = new PIXI.Container();
  }

  _update() {}

  _teardown() {
    this.container = null;
  }

  _onPointerUp() {
    // todo: check mouse position to focus bonus or not
  }

  get focused(): Bonus | null {
    return this.bonus.find((b) => b.focused);
  }

  add(bonus: Bonus) {
    this._on(
      bonus,
      "pointerup",
      function () {
        this.that.focus(this.bonus);
      }.bind({ that: this, bonus })
    );
    this.bonus.push(bonus);
    this.addEntity(
      bonus,
      entity.extendConfig({
        container: this.container,
      })
    );
  }

  remove(bonus: Bonus) {
    this._off(bonus);
    this.bonus = this.bonus.filter((b) => b !== bonus);
    this.removeEntity(bonus);
  }

  focus(bonus?: Bonus) {
    for (const b of this.bonus) b.focused = b === bonus;
  }
}
