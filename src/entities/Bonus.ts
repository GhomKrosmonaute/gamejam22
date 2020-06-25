import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import Nucleotide from "./Nucleotide";

export default class Bonus extends entity.Entity {
  public args: Nucleotide[] = [];

  private isFocused = false;

  constructor(public effectCallback: (...args: Nucleotide[]) => void) {
    super();
  }

  _setup() {
    // todo: add a sprite and make it interactive
  }

  _update() {}

  _teardown() {}

  get focused(): boolean {
    return this.isFocused;
  }

  set focused(isFocused: boolean) {
    // todo: add glow filter id true
    this.isFocused = isFocused;
  }

  use(n: Nucleotide) {
    const requiredArgsCount = this.effectCallback.length;
    this.args.push(n);
    if (this.args.length === requiredArgsCount)
      this.effectCallback(...this.args);
  }
}
