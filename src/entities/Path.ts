import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import Nucleotide from "./Nucleotide";
import Party from "../scenes/Party";

export default class Path extends entity.Entity {
  public items: Nucleotide[] = [];
  public graphics = new pixi.Graphics();
  public isValidSequence = false;

  constructor(public party: Party) {
    super();
  }

  _setup() {
    this.container.addChild(this.graphics);
  }

  _update() {
    this.checkValidSequence();
  }

  _teardown() {
    this.container.removeChild(this.graphics);
  }

  get container(): pixi.Container {
    return this.entityConfig.container;
  }

  get length(): number {
    return this.nucleotides.length;
  }

  get nucleotides(): Nucleotide[] {
    return this.items.filter((n) => n.state !== "cut");
  }

  get cuts(): Nucleotide[] {
    return this.items.filter((n) => n.state === "cut");
  }

  get maxLength(): number {
    return this.party.sequence.length;
  }

  get first(): Nucleotide | null {
    return this.items[0];
  }

  get last(): Nucleotide | null {
    return this.items[this.items.length - 1];
  }

  checkValidSequence(): boolean {
    const signature = this.nucleotides.map((n) => n.colorName).join(",");
    const isValidSequence =
      this.cuts.length >= 1 &&
      (signature === this.party.sequence.toString() ||
        signature ===
          this.party.sequence.toString().split(",").reverse().join(","));

    if (this.isValidSequence !== isValidSequence) {
      this.isValidSequence = isValidSequence;
      this.emit("validSequenceChange", isValidSequence);
      this.refresh();
    }
    return isValidSequence;
  }

  calc(nucleotide: Nucleotide): void {
    if (!nucleotide.isHovered || !this.party.mouseIsDown) return;

    if (this.items.length === 0) {
      this.items.push(nucleotide);
      this.refresh();
      return;
    }

    // in crunch path case
    if (this.party.state === "crunch") {
      // check if the current nucleotide is a wall/hole/cut
      if (this.length > 0 && nucleotide.state === "hole") return;
      if (this.first.state === "hole") return;
    }

    // check the cancellation & cancel to previous nucleotide
    if (
      this.items[this.items.length - 2] &&
      this.items[this.items.length - 2] === nucleotide
    ) {
      this.items.pop();
      this.refresh();
      return;
    }

    // check if this path is terminated or not
    if (this.length >= (this.party.state === "crunch" ? this.maxLength : 2))
      return;

    // check if nucleotide is already in this path
    if (this.items.includes(nucleotide)) return;

    // check if the current nucleotide is a neighbor of the last checked nucleotide
    if (
      this.items[this.items.length - 1] &&
      this.party.grid.getNeighborIndex(
        this.items[this.items.length - 1],
        nucleotide
      ) === -1
    )
      return null;

    // push in this path the checked nucleotide
    this.items.push(nucleotide);
    this.refresh();
  }

  remove() {
    this.items = [];
    this.refresh();
  }

  refresh() {
    let last: Nucleotide = null;
    let color = this.isValidSequence ? 0xffffff : 0x000000;

    this.graphics.clear();

    // for all nucleotide in path
    for (const n of this.items) {
      this.graphics
        .beginFill(color)
        .drawEllipse(n.position.x, n.position.y, n.width * 0.2, n.height * 0.2);

      if (last)
        this.graphics
          .lineStyle(5, color)
          .moveTo(last.position.x, last.position.y)
          .lineTo(n.position.x, n.position.y);

      last = n;
    }
  }

  crunch() {
    if (this.isValidSequence) {
      this.items.forEach((n) => (n.state = "hole"));
      this.party.sequence.generate();
      this.party.grid.refresh();
    }
  }

  slide() {
    if (!this.items[1]) return;
    const neighborIndex = this.party.grid.getNeighborIndex(
      this.items[0],
      this.items[1]
    );
    this.party.grid.slide(neighborIndex);
  }
}
