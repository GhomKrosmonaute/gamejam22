import { Container, Point, Renderer, interaction } from "pixi.js";
import { Entity } from "booyah/src/entity";
import Nucleotide from "./Nucleotide";
import { opposedIndexOf } from "../utils";
import Party from "../states/Party";
import Path from "./Path";

export default class Matrix extends Entity {
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
    for (const nucleotide of this.nucleotides) {
      nucleotide._setup();
      this.container.addChild(nucleotide.container);
    }
  }

  _update() {
    for (const nucleotide of this.nucleotides) nucleotide._update();
  }

  _teardown() {
    for (const nucleotide of this.nucleotides) {
      nucleotide._teardown();
      this.container.removeChild(nucleotide.container);
    }
  }

  get container(): Container {
    return this.entityConfig.container;
  }

  get renderer(): Renderer {
    return this.party.entityConfig.app.renderer;
  }

  get mouse(): interaction.InteractionData {
    return this.renderer.plugins.interaction.mouse;
  }

  generate() {
    for (let x = 0; x < this.colCount; x++)
      for (let y = 0; y < this.rowCount; y++)
        this.nucleotides.push(new Nucleotide(this, new Point(x, y)));

    this.addCuts();
  }

  getHovered(): Nucleotide | null {
    return this.nucleotides.find((nucleotide) => nucleotide.isHovered);
  }

  slide(neighborIndex: number) {
    const opposedNeighborIndex = opposedIndexOf(neighborIndex);
    for (const nucleotide of this.nucleotides)
      if (nucleotide.state === "hole") {
        nucleotide.generate();
        nucleotide.recursiveSwap(opposedNeighborIndex);
      }
    this.addCuts();
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
    }
  }

  render() {
    for (const nucleotide of this.nucleotides) nucleotide.render();
  }
}
