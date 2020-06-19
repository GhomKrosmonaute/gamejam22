import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as game from "../game";
import * as utils from "../utils";
import Party from "../scenes/Party";
import Nucleotide from "./Nucleotide";

export default class Sequence extends entity.ParallelEntity {
  public nucleotides: Nucleotide[];
  public length: number;
  public nucleotideRadius = game.width * 0.05;
  public container: pixi.Container;

  constructor(
    public party: Party,
    public baseLength: number,
    public position: pixi.Point
  ) {
    super();
  }

  _setup() {
    this.container = new pixi.Container();
    this.container.position.copyFrom(this.position);
    this.length = this.baseLength;
    this.nucleotides = [];
    const { height } = Nucleotide.getNucleotideDimensionsByRadius(
      this.nucleotideRadius
    );
    for (let i = 0; i < this.length; i++) {
      const n = new Nucleotide(
        this.nucleotideRadius,
        new pixi.Point(utils.random(-height * 0.3, height * 0.3), i * height)
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
    this.entityConfig.container.addChild(this.container);
  }

  _update() {}

  _teardown() {
    for (const nucleotide of this.nucleotides) {
      this.container.removeChild(nucleotide.graphics);
    }
    this.entityConfig.container.removeChild(this.container);
    this.container = null;
  }

  validate(signature: string): boolean {
    return (
      signature === this.toString() ||
      signature === this.toString().split(",").reverse().join(",")
    );
  }

  refresh() {
    for (const nucleotide of this.nucleotides) nucleotide.refresh();
  }

  toString() {
    return this.nucleotides.map((n) => n.colorName).join(",");
  }
}
