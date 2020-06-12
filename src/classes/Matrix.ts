import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as utils from "../utils";
import Nucleotide from "./Nucleotide";
import Party from "../states/Party";

export default class Matrix extends entity.ParallelEntity {
  public nucleotides: Nucleotide[] = [];

  constructor(
    public party: Party,
    public colCount: number,
    public rowCount: number,
    public cutCount: number,
    public nucleotideRadius: number
  ) {
    super();
  }

  _setup() {
    this.generate();
    this.render();
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
    for (let x = 0; x < this.colCount; x++) {
      for (let y = 0; y < this.rowCount; y++) {
        const n = new Nucleotide(this, new pixi.Point(x, y));
        this.addEntity(
          n,
          entity.extendConfig({
            container: this.container,
          })
        );
        this.nucleotides.push(n);
      }
    }

    this.addCuts();
  }

  getHovered(): Nucleotide | null {
    return this.nucleotides.find((nucleotide) => nucleotide.isHovered);
  }

  slide(neighborIndex: number) {
    const opposedNeighborIndex = utils.opposedIndexOf(neighborIndex);
    for (const nucleotide of this.nucleotides)
      if (nucleotide.state === "hole") {
        nucleotide.generate();
        nucleotide.recursiveSwap(opposedNeighborIndex);
      }
    this.addCuts();
    this.party.state = "crunch";
    this.party.stateSwitch.text = "mode: crunch";
  }

  addCuts() {
    while (
      this.nucleotides.filter((n) => n.state === "cut").length < this.cutCount
    ) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * this.nucleotides.length);
      } while (this.nucleotides[randomIndex].state === "cut");
      this.nucleotides[randomIndex].state = "cut";
      this.nucleotides[randomIndex].render();
    }
  }

  render() {
    for (const nucleotide of this.nucleotides) nucleotide.render();
  }
}
