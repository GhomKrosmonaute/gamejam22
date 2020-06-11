// une sequence que le virus tient (il peut y en avoir plusieurs)

import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as utils from "../utils";

export default class Sequence extends entity.Entity {
  public colorNames: utils.ColorName[];
  public length: number;

  constructor(public baseLength: number) {
    super();
  }

  _setup() {
    this.length = this.baseLength;
    this.generate();
  }

  _update() {}

  _teardown() {
    this.colorNames = null;
  }

  get container(): pixi.Container {
    return this.entityConfig.container;
  }

  generate() {
    this.colorNames = [];
    for (let i = 0; i < this.length; i++)
      this.colorNames.push(utils.getRandomColorName());
  }

  toString() {
    return this.colorNames.join(",");
  }
}
