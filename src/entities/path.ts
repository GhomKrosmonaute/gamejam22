import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as easing from "booyah/src/easing";
import * as tween from "booyah/src/tween";

import * as nucleotide from "./nucleotide";

import * as level from "../scenes/level";

import * as anim from "../animations";
import * as crispr from "../crispr";

export type PathState =
  | "no match"
  | "missing clips"
  | true
  | "crunch"
  | "matching"
  | "skip";

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
  public crunchConfirmed = false;
  public crunchCountBeforeSequenceDown = 0;

  protected _setup() {
    this.container.position.copyFrom(this.level.grid);

    // place the path below the grid
    this._entityConfig.container.addChildAt(
      this.container,
      this._entityConfig.container.children.indexOf(this.level.grid.container)
    );

    this._on(this, "updated", () => {
      this.refresh();
      this.level.emitLevelEvent("pathUpdated");
    });
  }

  protected _teardown() {
    this._entityConfig.container.removeChild(this.container);
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  /** The path signature length without portals */
  get length(): number {
    return this.toString().length;
  }

  get normals(): nucleotide.Nucleotide[] {
    return this.items.filter((n) => n.type === "normal");
  }

  get clips(): nucleotide.Nucleotide[] {
    return this.items.filter((n) => n.type === "clip");
  }

  get portals(): nucleotide.Nucleotide[] {
    return this.items.filter((n) => n.type === "portal");
  }

  get jokers(): nucleotide.Nucleotide[] {
    return this.items.filter((n) => n.type === "joker");
  }

  get first(): nucleotide.Nucleotide | null {
    return this.items[0];
  }

  get last(): nucleotide.Nucleotide | null {
    return this.items[this.items.length - 1];
  }

  correctlyContainsClips(): boolean {
    return (
      this.level.options.disableClips ||
      (this.clips.length === 1 && this.first.type === "clip")
    );
  }

  startAt(n: nucleotide.Nucleotide): boolean {
    if (n.type === "hole" || this.level.isDisablingAnimationInProgress)
      return false;

    // check the cancellation & cancel to previous nucleotide
    const index = this.items.indexOf(n);

    // if click in start of existing path
    if (index === 0) {
      // Clear path
      this.items = [];

      // if click in existing path
    } else if (index > -1) {
      // Return to previous step in the path
      this.items = this.items.slice(0, index + 1);

      // else
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

    // add clips on first position
    if (!this.level.options.disableClips) {
      if (this.first && this.first.type !== "clip") {
        this.remove();
        return false;
      }
    }

    // Ignore clips
    if (n.type === "clip" && this.first !== n) return false;

    // Ignore holes
    if (n.type === "hole") return false;

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
        n.highlighted = true;

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
        n.highlighted = false;

        n.pathArrowSprite.visible = false;
      }
    }

    // highlight portals
    if (
      this.last &&
      this.last.type === "portal" &&
      this.portals.length % 2 !== 0
    ) {
      this.level.grid.nucleotides.forEach((n) => {
        if (n.type === "portal" && n !== this.last) {
          n.highlighted = true;
        }
      });
    }
  }

  crunch() {
    let originalPositions: PIXI.Point[] = [],
      items: nucleotide.Nucleotide[],
      seq = this.level.sequenceManager.first;
    if (this.length === 0) return new entity.FunctionCallEntity(() => null);
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        items = seq.nucleotides.slice();

        this.level.screenShake(10, 1.02, 100);
        this.level.disablingAnimation("path.crunch", true);

        if (this.correctlyContainsClips()) {
          this.level.clipsWasIncludes = true;
          if (!this.level.options.disableClips) this.first.type = "normal";
          this.items.forEach((n) => {
            if (n.type === "joker") n.type = "normal";
          });
        }
      }),
      anim.sequenced({
        items: this.items,
        timeBetween: 50,
        waitForAllSteps: true,
        onStep: (n, i, src, finish) => {
          originalPositions.push(n.position.clone());

          n.highlighted = false;
          n.sprite.scale.set(1);
          n.pathArrowSprite.visible = false;

          if (n.type === "normal") {
            const index = this.normals.indexOf(n);

            items[index].highlighted = false;

            this._activateChildEntity(
              new entity.EntitySequence([
                !this.level.options.showMatchOnCrunch
                  ? new entity.FunctionCallEntity(() => null)
                  : new entity.ParallelEntity([
                      () =>
                        anim.move(
                          n.position,
                          n.position.clone(),
                          new PIXI.Point(
                            items[index].position.x -
                              this.level.grid.nucleotideContainer.x +
                              seq.container.x,
                            items[index].position.y -
                              this.level.grid.nucleotideContainer.y +
                              seq.container.y +
                              60
                          ),
                          1000,
                          easing.easeOutBounce
                        ),
                      () =>
                        new tween.Tween({
                          from: n.scale,
                          to: items[index].scale,
                          easing: easing.easeOutBounce,
                          duration: 1000,
                          onUpdate: (value) => n.container.scale.set(value),
                        }),
                    ]),
                new entity.FunctionCallEntity(() => finish()),
              ])
            );
          }
        },
      }),
      new entity.FunctionCallEntity(() => {
        this.crunchConfirmed = true;
        // /** Pointer event catcher */
        // const pec = new PIXI.Graphics();
        // pec.position.set(0);
        // pec.interactive = true;
        // pec.buttonMode = true;
        // pec
        //   .beginFill(0x000000, 0.01)
        //   .drawRect(0, 0, crispr.width, crispr.height)
        //   .endFill();
        // this.level.container.addChild(pec);
        // this._once(pec, "pointerdown", () => {
        //   this.crunchConfirmed = true;
        //   this.level.container.removeChild(pec);
        // });
      }),
      new entity.WaitingEntity(1000),
      new entity.FunctionalEntity({
        requestTransition: () => this.crunchConfirmed,
      }),
      // down
      anim.sequenced({
        items: this.items,
        timeBetween: 50,
        waitForAllSteps: true,
        onStep: (n, i) => {
          if (n.type !== "normal") {
            return n.spriteSwitchAnimation(n.holeSprite);
          } else {
            const index = this.normals.indexOf(n);

            return new entity.EntitySequence([
              new entity.FunctionCallEntity(() => {
                if (index === 0)
                  this.level.disablingAnimation("path.crunch.down", true);
              }),
              // () => new tween.Tween({
              //   from: n.position.y,
              //   to: n.position.y - 30,
              //   onUpdate: (v) => n.position.y = v,
              //   duration: 250
              // }),
              new entity.ParallelEntity([
                () => anim.down(n.sprite, 500, 1),
                new entity.EntitySequence([
                  new entity.WaitingEntity(250),
                  new entity.FunctionCallEntity(() => {
                    this._playExplosion();
                  }),
                ]),
              ]),
              new entity.FunctionCallEntity(() => {
                n.position.copyFrom(originalPositions[i]);
                n.container.scale.set(n.scale);
              }),
              n.spriteSwitchAnimation(n.holeSprite),
            ]);
          }

          // if (!this.level.options.disableScore) {
          //   let score = this.level.options.baseCrispyGain;
          //
          //   const multiplier = all.reduce(
          //     (accumulator, n) => accumulator * n.crispyMultiplier,
          //     1
          //   );
          //
          //   score *= multiplier;
          //
          //   this.level.score += score;
          //
          //   if (crispr.debug) {
          //     console.log("Multiplier:", multiplier, "Score:", score);
          //   }
          //
          //   this._activateChildEntity(
          //     anim.textFade(
          //       this.level.grid.nucleotideContainer,
          //       crispr.makeText(`+ ${score}`, {
          //         fill: score < 0 ? "#d70000" : "#ffffff",
          //         fontSize: Math.min(100, 70 + score),
          //         stroke: "#ffa200",
          //         strokeThickness: 4,
          //       }),
          //       500,
          //       n.position.clone(),
          //       "down"
          //     )
          //   );
          // }
        },
      }),
      new entity.FunctionCallEntity(() => {
        this.remove();
        this.level.disablingAnimation("path.crunch", false);
        this.level.disablingAnimation("path.crunch.down", false);
      }),
    ]);
  }

  /**
   * Returns signature of path
   */
  toString() {
    return this.items.join("");
  }

  private _playNote(): void {
    if (this.items.length === 0) return;

    // There are in fact two sounds, the first is the note, and the 2nd depends on the length

    // Pick a number between 1 and 8
    const n = Math.min(8, this.items.length);
    this._entityConfig.fxMachine.play(`note_${n}`);

    const lastNucleotide = this.items[this.items.length - 1];
    let sound: string;
    if (lastNucleotide.type === "clip") {
      sound = "tile_clips";
    } else if (lastNucleotide.type === "normal") {
      sound = "tile_" + lastNucleotide.color;
    } else {
      sound = "score_ring";
    }
    this._entityConfig.fxMachine.play(sound);
  }

  private _playExplosion(): void {
    const r = 1 + Math.floor(Math.random() * 3);
    this._entityConfig.fxMachine.play(`explode_${r}`);
  }
}
