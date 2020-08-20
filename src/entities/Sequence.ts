import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as game from "../game";
import * as utils from "../utils";
import Nucleotide from "./Nucleotide";

/** Represent a sequence dropped by virus */
export default class Sequence extends entity.CompositeEntity {
  public nucleotides: Nucleotide[] = [];
  public container: PIXI.Container;
  public nucleotideRadius = game.width * 0.04;

  constructor(
    public readonly baseLength: number,
    public position = new PIXI.Point()
  ) {
    super();
  }

  _setup() {
    this.container = new PIXI.Container();
    this.container.position.copyFrom(this.position);
    this._entityConfig.container.addChild(this.container);
    const { width, height } = Nucleotide.getNucleotideDimensionsByRadius(
      this.nucleotideRadius
    );
    for (let i = 0; i < this.baseLength; i++) {
      const n = new Nucleotide(
        this.nucleotideRadius,
        new PIXI.Point(i * width * 0.8, utils.approximate(height * 0.05)),
        Math.random()
      );
      n.setFloating("y");
      this._activateChildEntity(
        n,
        entity.extendConfig({
          container: this.container,
        })
      );
      n.state = "present";
      this.nucleotides.push(n);
    }
    this.refresh();
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
    this.container = null;
    this.nucleotides = [];
  }

  validate(
    signature: string,
    validationMode: "full" | "partial" = "full"
  ): boolean {
    // if(validationMode === "full") {
    return signature === this.toString() || signature === this.toString(true);
    // } else {
    //   const thisSignature = this.toString();

    // }
  }

  refresh() {
    this.container.position.copyFrom(this.position);
  }

  // TODO: use single letters, without comma
  toString(reverse = false): string {
    return (!!reverse
      ? this.nucleotides.slice(0).reverse()
      : this.nucleotides
    ).join(",");
  }
}
