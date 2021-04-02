import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";

import * as nucleotide from "./nucleotide";

import * as level from "../scenes/level";

import * as anim from "../animations";
import * as crispr from "../crispr";

export type PathState =
  | "no match"
  | "missing scissors"
  | true
  | "crunch"
  | "matching"
  | "SKIP";

/**
 * Represent the user path to validate sequences
 * Emits:
 * - updated()
 * - crunchAnimationFinished()
 */
export class Path extends entity.CompositeEntity {
  public items: nucleotide.Nucleotide[] = [];
  public container = new PIXI.Container();
  public isValidSequence = false;
  public crunchCountBeforeSequenceDown = 0;

  protected _setup() {
    this.container.position.copyFrom(this.level.grid);

    // place the path below the grid
    this._entityConfig.container.addChildAt(
      this.container,
      this._entityConfig.container.children.indexOf(this.level.grid.container)
    );

    this._on(this, "updated", () => {
      this.level.emitLevelEvent("pathUpdated");
      this.refresh();
    });
  }

  protected _teardown() {
    this._entityConfig.container.removeChild(this.container);
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get signature(): string {
    return this.nucleotides.join("");
  }

  /** The real length without cuts */
  get length(): number {
    return this.nucleotides.length;
  }

  /** only nucleotides */
  get nucleotides(): nucleotide.Nucleotide[] {
    return this.items.filter((n) => n.type !== "scissors");
  }

  get scissors(): nucleotide.Nucleotide[] {
    return this.items.filter((n) => n.type === "scissors");
  }

  get portals(): nucleotide.Nucleotide[] {
    return this.items.filter((n) => n.type === "portal");
  }

  get maxLength(): number {
    return Math.max(
      ...[...this.level.sequenceManager.sequences].map((s) => s.baseLength)
    );
  }

  get first(): nucleotide.Nucleotide | null {
    return this.items[0];
  }

  get last(): nucleotide.Nucleotide | null {
    return this.items[this.items.length - 1];
  }

  correctlyContainsScissors(): boolean {
    return (
      this.scissors.length > 0 &&
      this.last.type !== "scissors" &&
      this.first.type !== "scissors"
    );
  }

  startAt(n: nucleotide.Nucleotide): boolean {
    if (n.state === "missing" || this.level.isDisablingAnimationInProgress)
      return false;

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
      this.items = this.items.length > 0 ? [] : [n];

      this._playNote();
    }

    return true;
  }

  add(n: nucleotide.Nucleotide): boolean {
    if (this.level.isDisablingAnimationInProgress) return false;

    // not add scissors on first position
    if (this.first && this.first.type === "scissors") {
      this.remove();
      return false;
    }

    // Ignore holes
    if (n.state === "missing") return false;

    // Don't start new paths
    if (this.items.length === 0) return false;

    const index = this.items.indexOf(n);
    // If the nucleotide is already in the path
    if (index !== -1) {
      // If the nucleotide is the previous step of path
      if (index === this.items.length - 2) {
        // Return to previous step in the path
        this.items.pop();
        this.emit("updated");
        return true;
      } else return false;
    }

    // If the nucleotide is not a neighbor of the last one
    if (this.level.grid.getNeighborIndex(n, this.last) === -1) {
      // If the last one or the current one are not portals
      if (n.type !== "portal" || this.last.type !== "portal") return false;
    } else {
      if (
        n.type !== "portal" &&
        this.last.type === "portal" &&
        this.portals.length % 2 !== 0
      )
        return false;
    }

    // Add to the path
    this.items.push(n);
    this._playNote();

    this.emit("updated");
    return true;
  }

  remove() {
    this.items = [];
    this.emit("updated");
  }

  refresh() {
    let last: nucleotide.Nucleotide = null;

    // for each nucleotide in path
    for (const n of this.level.grid.nucleotides.sort((a, b) => {
      return this.items.indexOf(a) - this.items.indexOf(b);
    })) {
      if (this.items.includes(n)) {
        n.isHighlighted = true;

        if (last) {
          this.level.grid.pointTo(
            last,
            this.level.grid.getNeighborIndex(last, n)
          );
        }

        if (this.last === n) {
          this.level.grid.pointTo(n, -1);
        }

        last = n;
      } else {
        n.isHighlighted = false;

        n.pathArrow.visible = false;
      }
    }

    // highlight portals
    if (this.last.type === "portal" && this.portals.length % 2 !== 0) {
      this.level.grid.nucleotides.forEach((n) => {
        if (n.type === "portal" && n !== this.last) {
          n.isHighlighted = true;
        }
      });
    }
  }

  crunch() {
    let infected = false;
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        this.level.disablingAnimation("path.crunch", true);

        this.items.forEach((n) => (n.type = "normal"));

        if (this.correctlyContainsScissors()) {
          this.level.scissorsWasIncludes = true;
        }
      }),
      anim.sequenced({
        items: this.items,
        timeBetween: 50,
        waitForAllSteps: true,
        callback: () => {
          this.remove();
          if (infected) {
            this.level.emitLevelEvent("cleanedInfection");
          }
          this.level.disablingAnimation("path.crunch", false);
        },
        onStep: (item, i, src, finish) => {
          this._playExplosion();
          this.level.screenShake(10, 1.02, 50);

          const score = item.infected ? 15 : 10;
          const fill = item.infected ? item.fullColorName : "#ffeccc";
          const stroke = item.infected ? "#ffc200" : "black";

          if (item.infected) infected = true;

          this.level.addScore(score);

          this._activateChildEntity(
            anim.down(
              item.infected ? item.infectionSprite : item.sprite,
              500,
              1,
              () => {
                item.once("stateChanged", finish);
                item.state = "missing";
              }
            )
          );

          if (!this.level.options.disableScore) {
            this._activateChildEntity(
              anim.textFade(
                this.level.grid.nucleotideContainer,
                crispr.makeText(`+ ${score}`, {
                  fill,
                  stroke,
                  strokeThickness: 10,
                  fontSize: 90 + score * 4,
                  dropShadow: true,
                  dropShadowBlur: 10,
                }),
                500,
                item.position.clone(),
                "up"
              )
            );
          }
        },
      }),
    ]);
  }

  toString(reverse = false) {
    return (reverse ? this.nucleotides.reverse() : this.nucleotides).join(",");
  }

  private _playNote(): void {
    if (this.items.length === 0) return;

    // There are in fact two sounds, the first is the note, and the 2nd depends on the length

    // Pick a number between 1 and 8
    const n = Math.min(8, this.items.length);
    this._entityConfig.fxMachine.play(`note_${n}`);

    const lastNucleotide = this.items[this.items.length - 1];
    let sound: string;
    if (lastNucleotide.type === "scissors") {
      sound = "tile_scissors";
    } else if (lastNucleotide.colorName === "r") {
      sound = "tile_red";
    } else if (lastNucleotide.colorName === "g") {
      sound = "tile_green";
    } else if (lastNucleotide.colorName === "b") {
      sound = "tile_blue";
    } else if (lastNucleotide.colorName === "y") {
      sound = "tile_yellow";
    }
    this._entityConfig.fxMachine.play(sound);
  }

  private _playExplosion(): void {
    const r = 1 + Math.floor(Math.random() * 3);
    this._entityConfig.fxMachine.play(`explode_${r}`);
  }
}
