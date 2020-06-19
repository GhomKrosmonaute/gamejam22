import * as PIXI from "pixi.js";
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
  public container: PIXI.Container;
  public pivot = new PIXI.Point(game.width * 0.5, game.height * 0.8);

  constructor(public party: Party, public baseLength: number) {
    super();
  }

  _setup() {
    this.container = new PIXI.Container();
    this.container.position.set(this.x, this.y);
    this.length = this.baseLength;
    this.nucleotides = [];
    for (let i = 0; i < this.length; i++) {
      const n = new Nucleotide(this.nucleotideRadius, new PIXI.Point(), i - 5);
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
      n.refresh(this.pivot);
    }
  }

  calcAngle(n: Nucleotide) {
    this.angle =
      utils.getIsoceleAngle(
        new PIXI.Point(0, n.getRelativeHeight(this.pivot.y)),
        new PIXI.Point(n.width, n.getRelativeHeight(this.pivot.y)),
        this.pivot
      ) * n.index;
  }

  refresh() {
    for (const nucleotide of this.nucleotides) nucleotide.refresh(this.pivot);
  }

  toString() {
    return this.nucleotides.map((n) => n.colorName).join(",");
  }
}
