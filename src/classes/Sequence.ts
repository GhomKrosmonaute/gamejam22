import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import SequenceNucleotide from "./SequenceNucleotide";
import Party from "../states/Party";

export default class Sequence extends entity.ParallelEntity {
  public nucleotides: SequenceNucleotide[];
  public length: number;
  public x: number = 600;
  public y: number = 50;
  public nucleotideRadius = 25;

  constructor(
    public party: Party,
    public baseLength: number,
    public zigzag?: boolean
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
      const position = new pixi.Point();
      if (this.zigzag) {
        position.y = Math.floor(i * 0.5);
        position.x = i % 2 ? 0 : 1;
      } else {
        position.y = i;
      }
      const n = new SequenceNucleotide(this, position);
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

  render() {
    for (const nucleotide of this.nucleotides) nucleotide.render();
  }

  toString() {
    return this.nucleotides.map((n) => n.colorName).join(",");
  }
}
