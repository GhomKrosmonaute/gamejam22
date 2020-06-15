import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as game from "../game";
import SequenceNucleotide from "./SequenceNucleotide";
import Party from "../states/Party";

export default class Sequence extends entity.ParallelEntity {
  public nucleotides: SequenceNucleotide[];
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
      const n = new SequenceNucleotide(this, i - 5);
      this.addEntity(
        n,
        entity.extendConfig({
          container: this.container,
        })
      );
      this.nucleotides.push(n);
    }
    this.render();
  }

  step() {
    for (const nucleotide of this.nucleotides) nucleotide.step();
  }

  render() {
    for (const nucleotide of this.nucleotides) nucleotide.render();
  }

  toString() {
    return this.nucleotides.map((n) => n.colorName).join(",");
  }
}
