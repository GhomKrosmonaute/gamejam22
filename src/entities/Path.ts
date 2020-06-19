import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import Nucleotide from "./Nucleotide";
import Party from "../scenes/Party";
import * as game from "../game";

/** Represent the user path to validate sequences */
export default class Path extends entity.Entity {
  public items: Nucleotide[] = [];
  public graphics = new pixi.Graphics();
  public isValidSequence = false;
  public x = game.width * 0.09;
  public y = game.height * 0.47;

  constructor(public party: Party) {
    super();
  }

  _setup() {
    this.graphics.x = this.x;
    this.graphics.y = this.y;
    this.entityConfig.container.addChild(this.graphics);
  }

  _update() {
    this.checkValidSequence();
  }

  _teardown() {
    this.entityConfig.container.removeChild(this.graphics);
  }

  get signature(): string {
    return this.nucleotides.map((n) => n.colorName).join(",");
  }

  /** The real length without cuts */
  get length(): number {
    return this.nucleotides.length;
  }

  /** only nucleotides */
  get nucleotides(): Nucleotide[] {
    return this.items.filter((n) => n.state !== "cut");
  }

  get cuts(): Nucleotide[] {
    return this.items.filter((n) => n.state === "cut");
  }

  get maxLength(): number {
    return Math.max(
      ...this.party.sequenceManager.sequences.map((s) => s.length)
    );
  }

  get first(): Nucleotide | null {
    return this.items[0];
  }

  get last(): Nucleotide | null {
    return this.items[this.items.length - 1];
  }

  checkValidSequence(): boolean {
    const signature = this.signature;

    let isValidSequence = false;
    if (this.cuts.length >= 1)
      isValidSequence = this.party.sequenceManager.sequences.some((s) =>
        s.validate(signature)
      );

    if (this.isValidSequence !== isValidSequence) {
      this.isValidSequence = isValidSequence;
      this.emit("validSequenceChange", isValidSequence);
      this.refresh();
    }
    return isValidSequence;
  }

  calc(n: Nucleotide): void {
    if (!n.isHovered || !this.party.mouseIsDown) return;

    if (this.items.length === 0) {
      this.items.push(n);
      this.refresh();
      return;
    }

    // in crunch path case
    if (this.party.state === "crunch") {
      // if the no-start nucleotide is a hole, block the path
      if (this.length > 0 && n.state === "hole") return;
      // if start by hole, switch hole to nucleotide
      if (this.first.state === "hole") return;
    }

    // check the cancellation & cancel to previous nucleotide
    if (
      this.items[this.items.length - 2] &&
      this.items[this.items.length - 2] === n
    ) {
      this.items.pop();
      this.refresh();
      return;
    }

    // check if this path is terminated or not
    if (this.length >= (this.party.state === "crunch" ? this.maxLength : 2))
      return;

    // check if nucleotide is already in this path
    if (this.items.includes(n)) return;

    // check if the current nucleotide is a neighbor of the last checked nucleotide
    if (this.last && this.party.grid.getNeighborIndex(this.last, n) === -1)
      return;

    // push in this path the checked nucleotide
    this.items.push(n);
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
      this.items.forEach((n) => {
        n.state = "hole";
        n.refresh();
      });
      this.party.sequenceManager.crunch(this);
    }
  }

  slide() {
    if (!this.items[1]) return;
    const neighborIndex = this.party.grid.getNeighborIndex(
      this.items[0],
      this.items[1]
    );
    if (neighborIndex !== -1) this.party.grid.slide(neighborIndex);
  }
}