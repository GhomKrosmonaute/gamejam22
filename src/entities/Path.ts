import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import Nucleotide from "./Nucleotide";
import Sequence from "./Sequence";
import Party from "../scenes/Party";
import * as game from "../game";

export default class Path extends entity.Entity {
  public items: Nucleotide[] = [];
  public graphics = new PIXI.Graphics();
  public isValidSequence = false;

  // TODO: refactor these to use the same as Grid
  public x = game.width * 0.09;
  public y = game.height * 0.4;

  // TODO: remove dependency on Party
  constructor(public party: Party) {
    super();
  }

  _setup() {
    this.graphics.x = this.x;
    this.graphics.y = this.y;
    this.entityConfig.container.addChild(this.graphics);
  }

  _teardown() {
    this.entityConfig.container.removeChild(this.graphics);
  }

  /** The real length without scissors */
  get length(): number {
    return this.nucleotides.length;
  }

  /** only nucleotides */
  get nucleotides(): Nucleotide[] {
    return this.items.filter((n) => n.state !== "scissors");
  }

  get scissors(): Nucleotide[] {
    return this.items.filter((n) => n.state === "scissors");
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

  checkValidSequence(sequence: Sequence): boolean {
    const signature = this.nucleotides.map((n) => n.colorName).join(",");
    const isValidSequence =
      this.scissors.length >= 1 &&
      (signature === sequence.toString() ||
        signature === sequence.toString().split(",").reverse().join(","));
    return isValidSequence;
  }

  calc(n: Nucleotide): void {
    if (!n.isHovered || !this.party.mouseIsDown) return;

    if (n.state === "hole") return;

    if (this.items.length === 0 && n.state === "normal") {
      this.items.push(n);
      this.refresh();
      return;
    }

    // check the cancellation & cancel to previous nucleotide
    const index = this.items.indexOf(n);
    if (index === 0 && this.items.length > 1) {
      this.items = [];
      this.refresh();
      return;
    } else if (index > -1 && index !== this.items.length - 1) {
      this.items = this.items.slice(0, index + 1);
      this.refresh();
      return;
    }

    // check if nucleotide is already in this path
    if (this.items.includes(n)) return;

    // check if the current nucleotide is a neighbor of the last checked nucleotide
    if (this.last && this.party.grid.getNeighborIndex(this.last, n) === -1) {
      return;
    }

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
    this.items.forEach((n) => (n.state = "hole"));
  }
}
