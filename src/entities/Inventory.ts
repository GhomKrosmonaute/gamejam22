import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as game from "../game";
import Bonus from "./Bonus";

export default class Inventory extends entity.ParallelEntity {
  public container: PIXI.Container;
  public sprite: PIXI.Sprite;
  public arrowButton: PIXI.Container;
  public bonus: Bonus[] = [];
  public isOpened = false;

  _setup() {
    this.container = new PIXI.Container();
    this.container.x = -game.width;

    this.sprite = new PIXI.Sprite(
      this.entityConfig.app.loader.resources["images/inventory.png"].texture
    );
    this.container.addChild(this.sprite);

    this.arrowButton = new PIXI.Container();
    this.arrowButton.interactive = true;
    this.arrowButton.buttonMode = true;
    this.arrowButton.hitArea = new PIXI.Rectangle(
      game.width,
      game.height * 0.45,
      game.width / 10,
      game.height / 10
    );
    this.container.addChild(this.arrowButton);

    this.entityConfig.container.addChild(this.container);

    this._on(this.arrowButton, "pointerup", this._onSwitch);
  }

  _update() {}

  _teardown() {
    this.container = null;
  }

  _onPointerUp() {
    // todo: check mouse position to focus bonus or not
  }

  _onSwitch() {
    this.isOpened = !this.isOpened;
    if (this.isOpened) this.container.x = game.width * -0.7;
    else this.container.x = game.width * -1;
  }

  get focused(): Bonus | null {
    return this.bonus.find((b) => b.focused);
  }

  add(bonus: Bonus) {
    if (this.bonus.includes(bonus)) {
      bonus.count++;
      return;
    }
    bonus.sprite.x = game.width - 300;
    bonus.sprite.y = bonus.sprite.height * this.bonus.length + 50;
    this._on(
      bonus.sprite,
      "pointerup",
      function () {
        this.that.focus(this.bonus);
        this.that._onSwitch();
      }.bind({ that: this, bonus })
    );
    this._on(
      bonus,
      "trigger",
      function () {
        this.that.focus();
        this.bonus.count--;
        if (this.bonus.count === 0) {
          this.that.remove(this.bonus);
        }
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
    this.container.removeChild(bonus.sprite);
    this.removeEntity(bonus);
  }

  focus(bonus?: Bonus) {
    if (bonus && bonus.focused) bonus.focused = false;
    else for (const b of this.bonus) b.focused = b === bonus;
    if (bonus && bonus.focused) this.entityConfig.party.else;
  }
}
