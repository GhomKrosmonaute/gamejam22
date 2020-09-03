import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as bonus from "./bonus";

export default class Inventory extends entity.CompositeEntity {
  public container: PIXI.Container;
  public bonuses: bonus.Bonus[] = [];
  public counts: { [k: string]: number } = {};
  public sprites: { [k: string]: PIXI.Sprite | PIXI.AnimatedSprite } = {};

  constructor() {
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

  _onBonusUsed(name: string) {
    this.remove(name);
  }

  get selected(): bonus.Bonus | null {
    return this.bonuses.find((b) => b.selected);
  }

  add(bonus: bonus.Bonus, count = 1) {
    if (this.bonuses.includes(bonus)) {
      this.counts[bonus.name] += count;
      return;
    }
    this.sprites[bonus.name] = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        `images/bonus_${bonus.name}.png`
      ].texture
    );
    this.sprites[bonus.name].scale.set(0.5);
    this.sprites[bonus.name].anchor.set(0.5);
    this.sprites[bonus.name].position.set(
      160 + this.bonuses.length * 190,
      this._entityConfig.app.view.height * 0.935
    );
    this.counts[bonus.name] = count;

    this._on(this.sprites[bonus.name], "pointerup", () =>
      this.selection(bonus.name)
    );

    this.bonuses.push(bonus);
    this._activateChildEntity(
      bonus,
      entity.extendConfig({
        container: this.container,
      })
    );
  }

  remove(name: string) {
    const bonus = this.bonuses.find((b) => b.name === name);
    this._off(bonus);
    this.bonuses = this.bonuses.filter((b) => b !== bonus);
    this.container.removeChild(this.sprites[name]);
    this._deactivateChildEntity(bonus);
  }

  selection(name: string) {
    if (this._entityConfig.level.isGuiLocked) return;

    const bonus = this.bonuses.find((b) => b.name === name);

    if (bonus && bonus.selected) {
      bonus.selected = false;
    } else {
      for (const b of this.bonuses) {
        b.selected = b === bonus;
      }
    }
  }
}
