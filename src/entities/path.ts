import * as PIXI from "pixi.js";
import * as _ from "underscore";
import * as entity from "booyah/src/entity";
import * as nucleotide from "./nucleotide";
import * as level from "../scenes/level";
import * as anim from "../animations";

/**
 * Represent the user path to validate sequences
 * Emits:
 * - updated()
 * - crunchAnimationFinished()
 */
export class Path extends entity.CompositeEntity {
  public items: nucleotide.Nucleotide[] = [];
  //public graphics = new PIXI.Graphics();
  public container = new PIXI.Container();
  public isValidSequence = false;
  public isCrunchAnimationRunning = false;

  protected _setup() {
    this.container.position.copyFrom(this.level.grid);
    //this.container.addChild(this.graphics);
    //this.container.filters = [new filters.GlowFilter({ distance: 20 })];

    // place the path below the grid
    // this._entityConfig.container.addChildAt(
    //   this.graphics,
    //   this._entityConfig.container.children.indexOf(
    //     this.level.grid.container
    //   )
    // );

    // place the path above the grid
    this._entityConfig.container.addChild(this.container);

    this._on(this, "updated", () => {
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

  get maxLength(): number {
    return Math.max(
      ...this.level.sequenceManager.sequences.map((s) => s.baseLength)
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
    if (n.state === "missing" || this.level.isGuiLocked) return false;

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
    }
    return true;
  }

  add(n: nucleotide.Nucleotide): boolean {
    if (this.level.isGuiLocked) return false;

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
    // this.graphics.clear();
    // this.graphics.removeChildren();
    let last: nucleotide.Nucleotide = null;

    // for each nucleotide in path
    for (const n of this.level.grid.nucleotides.sort((a, b) => {
      return this.items.indexOf(a) - this.items.indexOf(b);
    })) {
      if (this.items.includes(n)) {
        n.isHighlighted = true;

        // n.sprite.scale.set(1.1);
        // n.shakeAmounts.path = 3;

        // const neighbors = this.level.grid.getNeighbors(n);
        // neighbors.forEach((nn, i) => {
        //   if (nn) {
        //     n.pathBorders[i].visible = !(
        //       this.items.includes(nn) &&
        //       (this.items.indexOf(nn) === this.items.indexOf(n) - 1 ||
        //         this.items.indexOf(nn) === this.items.indexOf(n) + 1)
        //     );
        //   } else {
        //     n.pathBorders[i].visible = true;
        //   }
        // });

        if (last) {
          this.level.grid.pointTo(
            last,
            this.level.grid.getNeighborIndex(last, n)
          );
        }

        if (this.last === n) {
          this.level.grid.pointTo(n, -1);
        }

        // this.graphics
        //   .beginFill(0x000000)
        //   .drawEllipse(
        //     n.position.x,
        //     n.position.y,
        //     n.width * 0.19,
        //     n.height * 0.19
        //   );

        last = n;
      } else {
        n.isHighlighted = false;
        // delete n.shakeAmounts.path;
        // n.sprite.scale.set(1);
        // n.pathBorders.forEach((sprite) => (sprite.visible = false));
        n.pathArrow.visible = false;
      }
    }
  }

  crunch(callback?: () => any) {
    this.isCrunchAnimationRunning = true;
    this.level.isGuiLocked = true;
    const allCrunched: Promise<void>[] = [];
    this._activateChildEntity(
      new entity.EntitySequence(
        this.items
          .map<any>((item, i) => {
            const score = item.infected ? (i + 1) * 2 : i + 1;
            const fill = item.infected ? item.fullColorName : "#ffeccc";
            const stroke = item.infected ? "#ffc200" : "black";
            const duration = item.infected ? 1000 : 500;
            return [
              new entity.FunctionCallEntity(() => {
                allCrunched.push(
                  new Promise((resolve) => {
                    this._activateChildEntity(
                      anim.down(
                        item.sprite,
                        duration,
                        function () {
                          this.state = "missing";
                          this.once("stateChanged", resolve);
                        }.bind(item)
                      )
                    );
                  })
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
                    duration,
                    item.position.clone()
                  )
                );
                this.level.addScore(score);
              }),
              new entity.WaitingEntity(50),
            ];
          })
          .flat()
          .concat([
            new entity.FunctionCallEntity(() => {
              Promise.all(allCrunched).then(() => {
                this.level.isGuiLocked = false;
                this.isCrunchAnimationRunning = false;
                this.emit("crunchAnimationFinished");
                if (callback) callback();
              });
            }),
          ])
      )
    );
    this.remove();
  }

  toString(reverse = false) {
    return (reverse ? this.nucleotides.reverse() : this.nucleotides).join(",");
  }
}
