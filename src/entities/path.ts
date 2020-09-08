import * as PIXI from "pixi.js";
import * as _ from "underscore";
import * as entity from "booyah/src/entity";
import Nucleotide from "./nucleotide";
import Level from "../scenes/level";
import * as anim from "../animation";

/**
 * Represent the user path to validate sequences
 * Emits:
 * - updated
 * */
export default class Path extends entity.CompositeEntity {
  public items: Nucleotide[] = [];
  public isValidSequence = false;

  protected _setup() {
    this._on(this, "updated", () => {
      this.refresh();
    });
  }

  get level(): Level {
    return this._entityConfig.level;
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
    if (n.state === "missing" || this._entityConfig.level.isGuiLocked)
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
      this.items = [n];
    }

    this.emit("updated");
    return true;
  }

  add(n: Nucleotide): boolean {
    if (this._entityConfig.level.isGuiLocked) return false;

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
    return true;
  }

  remove() {
    this.items = [];
    this.emit("updated");
  }

  refresh() {
    // for each nucleotide in path
    for (const n of this.level.grid.nucleotides.sort((a, b) => {
      return this.items.indexOf(a) - this.items.indexOf(b);
    })) {
      if (this.items.includes(n)) {
        n.sprite.scale.set(1.1);
        n.shakeAmounts.path = 3;

        const neighbors = this.level.grid.getNeighbors(n);
        neighbors.forEach((nn, i) => {
          if (nn) {
            n.pointSprites[i].visible = !(
              this.items.includes(nn) &&
              (this.items.indexOf(nn) === this.items.indexOf(n) - 1 ||
                this.items.indexOf(nn) === this.items.indexOf(n) + 1)
            );
          } else {
            n.pointSprites[i].visible = true;
          }
        });
      } else {
        delete n.shakeAmounts.path;
        n.sprite.scale.set(1);
        n.pointSprites.forEach((sprite) => (sprite.visible = false));
      }
    }
  }

  crunch() {
    this.level.isGuiLocked = true;
    this._activateChildEntity(
      new entity.EntitySequence([
        ...this.items
          .map<any>((item, i) => {
            const score = item.infected ? (i + 1) * 2 : i + 1;
            const fill = item.infected ? item.fullColorName : "#ffeccc";
            const stroke = item.infected ? "#ffc200" : "black";
            const time = item.infected ? 1000 : 500;
            return [
              new entity.FunctionCallEntity(() => {
                this._activateChildEntity(
                  anim.down(
                    item.sprite,
                    100,
                    4,
                    function () {
                      this.state = "missing";
                    }.bind(item)
                  )
                );
                this._activateChildEntity(
                  anim.textFadeUp(
                    this.level.grid.nucleotideContainer,
                    new PIXI.Text(`+ ${score}`, {
                      fill,
                      stroke,
                      strokeThickness: 10,
                      fontSize: 90 + score * 4,
                      fontFamily: "Cardenio Modern Bold",
                      dropShadow: true,
                      dropShadowBlur: 10,
                    }),
                    time,
                    40,
                    item.position.clone()
                  )
                );
                this.level.addScore(score);
              }),
              new entity.WaitingEntity(50),
            ];
          })
          .flat(),
        new entity.FunctionCallEntity(() => {
          this.level.isGuiLocked = false;
        }),
      ])
    );
    this.remove();
  }

  toString(reverse = false) {
    return (reverse ? this.nucleotides.reverse() : this.nucleotides).join(",");
  }
}
