import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import Nucleotide from "./Nucleotide";

export default class Bonus extends entity.Entity {
  public args: Nucleotide[];

  constructor(public effectCallback: (...args: Nucleotide[]) => void) {
    super();
  }

  _setup() {}

  _update() {}

  _teardown() {}

  use(n: Nucleotide) {
    const requiredArgsCount = this.effectCallback.length;
    this.args.push(n);
    if (this.args.length === requiredArgsCount)
      this.effectCallback(...this.args);
  }
}
