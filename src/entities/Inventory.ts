import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import Bonus from "./Bonus";

export default class Inventory extends entity.ParallelEntity {
  public container: PIXI.Container;

  _setup() {
    this.container = new PIXI.Container();
  }

  _update() {}

  _teardown() {
    this.container = null;
  }

  add(bonus: Bonus) {
    this.addEntity(
      bonus,
      entity.extendConfig({
        container: this.container,
      })
    );
  }

  remove(bonus: Bonus) {
    this.removeEntity(bonus);
  }
}
