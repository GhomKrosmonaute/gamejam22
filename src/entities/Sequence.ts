import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as game from "../game";
import * as utils from "../utils";
import Nucleotide from "./Nucleotide";

/** Represent a sequence dropped by virus */
export default class Sequence extends entity.ParallelEntity {
  public nucleotides: Nucleotide[] = [];
  public length: number;
  public container: pixi.Container;
  public nucleotideRadius = game.width * 0.05;

  constructor(public baseLength: number, public position = new pixi.Point()) {
    super();
  }

  _setup() {
    this.container = new pixi.Container();
    this.container.position.copyFrom(this.position);
    this.entityConfig.container.addChild(this.container);
    this.length = this.baseLength;
    const { width, height } = Nucleotide.getNucleotideDimensionsByRadius(
      this.nucleotideRadius
    );
    for (let i = 0; i < this.length; i++) {
      const n = new Nucleotide(
        this.nucleotideRadius,
        new pixi.Point(i * width * 0.8, utils.approximate(height * 0.1)),
        Math.random()
      );
      n.setFloating();
      this.addEntity(
        n,
        entity.extendConfig({
          container: this.container,
        })
      );
      this.nucleotides.push(n);
    }
    this.refresh();
  }

  _teardown() {
    for (const n of this.nucleotides) this.container.removeChild(n.sprite);
    this.entityConfig.container.removeChild(this.container);
    this.container = null;
    this.nucleotides = [];
  }

  validate(signature: string): boolean {
    return signature === this.toString() || signature === this.toString(true);
  }

  refresh() {
    this.container.position.copyFrom(this.position);
    for (const nucleotide of this.nucleotides) nucleotide.refresh();
  }

  toString(reverse = false) {
    return (!!reverse ? this.nucleotides.reverse() : this.nucleotides)
      .map((n) => n.colorName)
      .join(",");
  }
}
