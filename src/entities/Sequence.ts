import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as game from "../game";
import * as utils from "../utils";
import Party from "../scenes/Party";
import Nucleotide from "./Nucleotide";

export default class Sequence extends entity.ParallelEntity {
  public nucleotides: Nucleotide[];
  public length: number;
  public x: number = game.width / 2;
  public y: number = game.height * 0.16;
  public angle: number;
  public nucleotideRadius = game.width * 0.05;

  constructor(
    public party: Party,
    public baseLength: number,
    public pivot: pixi.Point
  ) {
    super();
  }

  _setup() {
    this.length = this.baseLength;
    this.generate();
  }

  _update() {}

  _teardown() {
    for (const nucleotide of this.nucleotides) {
      this.container.removeChild(nucleotide.container);
    }
  }

  get container(): pixi.Container {
    return this.entityConfig.container;
  }

  generate() {
    this.nucleotides = [];
    for (let i = 0; i < this.length; i++) {
      const n = new Nucleotide(this.nucleotideRadius, new pixi.Point(), i - 5);
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

  step(stepCount: number = 1) {
    for (const nucleotide of this.nucleotides)
      this.stepOf(nucleotide, stepCount);
  }

  stepOf(n: Nucleotide, stepCount: number = 1) {
    n.index += stepCount;
    while (n.index > 8 * n.stage) {
      n.stage++;
    }
    if (n.stage > 4) n._teardown();
    else {
      this.calcAngle(n);
      n.refresh();
    }
  }

  calcAngle(n: Nucleotide) {
    this.angle =
      utils.getIsoceleAngle(
        new pixi.Point(0, n.getRelativeHeight(this.pivot.y)),
        new pixi.Point(n.width, n.getRelativeHeight(this.pivot.y)),
        this.pivot
      ) * n.index;
  }

  refresh() {
    for (const nucleotide of this.nucleotides) nucleotide.refresh();
  }

  toString() {
    return this.nucleotides.map((n) => n.colorName).join(",");
  }
}
