import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as game from "../game";
import * as utils from "../utils";
import Nucleotide from "./Nucleotide";

/** Represent a sequence dropped by virus */
export default class Sequence extends entity.ParallelEntity {
  public nucleotides: Nucleotide[] = [];
  public length: number;
  public nucleotideRadius = game.width * 0.04;
  public container: pixi.Container;

  constructor(public baseLength: number, public position = new pixi.Point()) {
    super();
  }

  _setup() {
    this.container = new pixi.Container();
    this.container.position.copyFrom(this.position);
    this.entityConfig.container.addChild(this.container);
    this.length = this.baseLength;
    const { height } = Nucleotide.getNucleotideDimensionsByRadius(
      this.nucleotideRadius
    );
    for (let i = 0; i < this.length; i++) {
      const n = new Nucleotide(
        this.nucleotideRadius,
        new pixi.Point(
          0,
          i * height * 2 +
            utils.approxima(
              utils.mapFromMiddle(i, 0, this.length, height, 0),
              height * 0.2
            )
        )
      );
      n.graphics.rotation = Math.random();
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

  _update() {}

  _teardown() {
    for (const n of this.nucleotides) this.container.removeChild(n.graphics);
    this.entityConfig.container.removeChild(this.container);
    this.container = null;
    this.nucleotides = [];
  }

  validate(signature: string): boolean {
    return (
      signature === this.toString() ||
      signature === this.toString().split(",").reverse().join(",")
    );
  }

  refresh() {
    this.container.position.copyFrom(this.position);
    for (const nucleotide of this.nucleotides) nucleotide.refresh();
  }

  toString() {
    return this.nucleotides.map((n) => n.colorName).join(",");
  }
}
