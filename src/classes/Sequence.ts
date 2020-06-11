// une sequence que le virus tient (il peut y en avoir plusieurs)

import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as utils from "../utils";

export default class Sequence extends entity.Entity {
  public colorNames: utils.ColorName[];
  public length: number;
  public x: number = 600;
  public y: number = 50;

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

  render() {
    for (let i = 0; i < this.colorNames.length; i++) {
      const color = utils.getColorByName(this.colorNames[i]);
      const graphics = new pixi.Graphics();
      graphics.beginFill(color).drawEllipse(this.x, this.y + i * 50, 25, 25);
      this.container.addChild(graphics);
    }
  }

  generate() {
    this.colorNames = [];
    for (let i = 0; i < this.length; i++)
      this.colorNames.push(utils.getRandomColorName());
    this.render();
  }

  toString() {
    return this.colorNames.join(",");
  }
}
