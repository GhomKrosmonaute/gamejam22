// une sequence que le virus tient (il peut y en avoir plusieurs)

import { Entity } from "booyah/src/entity";
import { ColorName, getRandomColorName } from "../utils";

export default class Sequence extends Entity {
  public colorNames: ColorName[];
  public length: number;

  constructor(public baseLength: number) {
    super();
  }

  _setup() {
    this.length = this.baseLength;
  }

  _update() {}

  _teardown() {
    this.colorNames = null;
  }

  generate() {
    this.colorNames = [];
    for (let i = 0; i < this.length; i++)
      this.colorNames.push(getRandomColorName());
  }

  toString() {
    return this.colorNames.join(",");
  }
}
