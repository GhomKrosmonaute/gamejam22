import * as PIXI from "pixi.js";
import * as _ from "underscore";
import * as entity from "booyah/src/entity";
import * as game from "../game";
import Nucleotide from "./Nucleotide";
import Level from "../scenes/Level";

/**
 * Represent the user path to validate sequences
 * Emits:
 * - updated
 * */
export default class Path extends entity.EntityBase {
  public items: Nucleotide[] = [];
  public graphics = new PIXI.Graphics();
  public isValidSequence = false;

  // TODO: refactor these to use the same as Grid
  public x = game.width * 0.09;
  public y = game.height * 0.4;

  // TODO: remove dependency on Level
  constructor(public level: Level) {
    super();
  }

  _setup() {
    this.graphics.x = this.x;
    this.graphics.y = this.y;
    this._entityConfig.container.addChild(this.graphics);
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.graphics);
  }

  get signature(): string {
    return this.nucleotides.map((n) => n.toString()).join("");
  }

  /** The real length without cuts */
  get length(): number {
    return this.nucleotides.length;
  }

  /** only nucleotides */
  get nucleotides(): Nucleotide[] {
    return this.items.filter((n) => n.type !== "scissors");
  }

  get scissors(): Nucleotide[] {
    return this.items.filter((n) => n.type === "scissors");
  }

  get maxLength(): number {
    return Math.max(
      ...this.level.sequenceManager.sequences.map((s) => s.baseLength)
    );
  }

  get first(): Nucleotide | null {
    return this.items[0];
  }

  get last(): Nucleotide | null {
    return this.items[this.items.length - 1];
  }

  correctlyContainsScissors(): boolean {
    return (
      this.scissors.length > 0 &&
      this.last.type !== "scissors" &&
      this.first.type !== "scissors"
    );
  }

  startAt(n: Nucleotide): boolean {
    if (n.state === "missing") return false;

    // check the cancellation & cancel to previous nucleotide
    const index = this.items.indexOf(n);
    if (index === 0) {
      // Clear path
      this.items = [];
    } else if (index > -1) {
      // Return to previous step in the path
      this.items = this.items.slice(0, index + 1);
    } else {
      // Try adding to the path
      if (this.add(n)) return true;

      // Otherwise, start path anew
      this.items = [n];
    }

    this.emit("updated");
    this.refresh();
    return true;
  }

  add(n: Nucleotide): boolean {
    // not add scissors on first position
    if (this.first && this.first.type === "scissors") {
      this.remove();
      return false;
    }

    // Ignore holes
    if (n.state === "missing") return false;

    // Don't start new paths
    if (this.items.length === 0) return false;

    // If the nucleotide is already in the path, stop
    if (_.contains(this.items, n)) return false;

    // If the nucleotide is not a neighbor of the last one, stop
    if (this.level.grid.getNeighborIndex(n, this.last) === -1) return false;

    // Add to the path
    this.items.push(n);

    this.emit("updated");
    this.refresh();
    return true;
  }

  remove() {
    this.items = [];
    this.emit("updated");
    this.refresh();
  }

  refresh() {
    let last: Nucleotide = null;
    let color = this.isValidSequence ? 0xffffff : 0x000000;

    this.graphics.clear();

    // for each nucleotide in path
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
    this.items.forEach((n) => (n.state = "missing"));
    this.emit("updated");
    this.refresh();
  }

  toString(reverse = false) {
    return (reverse ? this.nucleotides.reverse() : this.nucleotides).join(",");
  }
}
