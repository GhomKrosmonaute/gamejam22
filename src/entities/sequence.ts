import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as crispr from "../crispr";
import * as anim from "../animations";

import * as nucleotide from "./nucleotide";
import * as virus from "./virus";

import * as level from "../scenes/level";

export interface SequenceMatchingOptions {
  sens?: "toRight" | "toLeft";
  sticky?: "left" | "right" | "borders";
  minLength: number | ((ctx: level.Level) => number);
}

export const sequenceMatchingOptions: {
  [k in level.LevelVariant]: SequenceMatchingOptions;
} = {
  zen: {
    minLength: 3,
  },
  fall: {
    minLength: (ctx) => ctx.sequenceManager.first.baseLength,
    sticky: "left",
    sens: "toRight",
  },
  turn: {
    minLength: (ctx) => ctx.sequenceManager.first.baseLength,
    sticky: "right",
    sens: "toRight",
  },
};

export class SequenceAdjustment extends entity.CompositeEntity {
  private readonly disablingAnimation = "adjustSequences";

  get level(): level.Level {
    return this._entityConfig.level;
  }

  adjust() {
    if (this.level.disablingAnimations.has(this.disablingAnimation)) {
      this._deactivateAllChildEntities();
    }
    this._activateChildEntity(
      new entity.EntitySequence([
        new entity.FunctionCallEntity(() => {
          this.level.disablingAnimation(this.disablingAnimation, true);
        }),
        new entity.ParallelEntity(
          [...this.level.sequenceManager.sequences].map((sequence) => {
            return new tween.Tween({
              duration: 2000,
              easing: easing.easeInOutQuad,
              from: sequence.container.position.y,
              to: this.getHeight(sequence),
              onUpdate: function (value: number) {
                (<Sequence>this).container.position.y = value;
              }.bind(sequence),
            });
          })
        ),
        new entity.FunctionCallEntity(() => {
          this.level.disablingAnimation(this.disablingAnimation, false);
        }),
      ])
    );
  }

  getHeight(sequence: Sequence) {
    const range = this.getRange();
    if (this.level.options.variant === "fall") return range.top;
    if (this.level.sequenceManager.sequences.size < 2) return range.middle;
    return crispr.proportion(
      [...this.level.sequenceManager.sequences].indexOf(sequence),
      0,
      this.level.sequenceManager.sequences.size,
      range.top,
      range.bottom
    );
  }

  getRange(): crispr.Range {
    const range: crispr.Range = {
      top: 0,
      middle: 0,
      bottom: 0,
    };

    switch (this.level.options.variant) {
      case "turn":
        range.top = crispr.height * 0.25;
        range.bottom = crispr.height * 0.42;
        break;
      case "fall":
        range.top = crispr.height * 0.22;
        range.bottom = crispr.height * 0.46;
        break;
      case "zen":
        range.top = crispr.height * 0.3;
        range.bottom = crispr.height * 0.3;
        break;
    }

    range.middle = (range.top + range.bottom) / 2;
    return range;
  }
}

/**
 * emits:
 * - crunch(s: Sequence)
 */
export class SequenceManager extends entity.CompositeEntity {
  public sequences = new Set<Sequence>();
  public container = new PIXI.Container();
  public adjustment = new SequenceAdjustment();

  get first(): Sequence | null {
    return [...this.sequences][0] ?? null;
  }

  _setup() {
    this.container = new PIXI.Container();
    this._entityConfig.container.addChild(this.container);

    this._activateChildEntity(this.adjustment);

    this.generateFirstSequences();
  }

  _teardown() {
    this.container.removeChildren();
    this._entityConfig.container.removeChild(this.container);
    this.container = null;
  }

  reset() {
    this.sequences.forEach((s) => {
      this._deactivateChildEntity(s);
    });

    this.generateFirstSequences();

    if (crispr.debug) {
      console.log("--> DONE", "sequenceManager.reset()");
    }
  }

  generateFirstSequences() {
    if (this.level.options.sequences) {
      for (const colors of this.level.options.sequences) {
        this.set(colors);
      }
    } else {
      this.add();
    }
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get viruses(): virus.Virus[] {
    return [...this.sequences].map((s) => s.virus).filter((v) => v.isSetup);
  }

  set(colors: (keyof typeof nucleotide.NucleotideSignatures)[]) {
    if (this.sequenceCount > 0) return;
    const {
      width: nucleotideWidth,
    } = nucleotide.Nucleotide.getNucleotideDimensionsByRadius(
      nucleotide.nucleotideRadius.sequence
    );
    const sequence = new Sequence(
      colors,
      new PIXI.Point(
        crispr.width / 2 - (colors.length * nucleotideWidth * 0.8) / 2,
        this.adjustment.getRange().top
      )
    );
    this._activateChildEntity(
      sequence,
      entity.extendConfig({
        container: this.container,
      })
    );
    this.sequences.add(sequence);
    this.adjustment.adjust();
  }

  add(length = crispr.scrap(this.level.options.sequenceLength, this.level)) {
    if (this.sequenceCount > 0) return;
    const {
      width: nucleotideWidth,
    } = nucleotide.Nucleotide.getNucleotideDimensionsByRadius(
      nucleotide.nucleotideRadius.sequence
    );
    const sequence = new Sequence(
      length,
      new PIXI.Point(
        crispr.width / 2 - (length * nucleotideWidth * 0.8) / 2,
        this.adjustment.getRange().top
      )
    );
    this._activateChildEntity(
      sequence,
      entity.extendConfig({
        container: this.container,
      })
    );
    this.sequences.add(sequence);
    this.adjustment.adjust();
  }

  removeSequence(
    addScore: boolean,
    isNotCrunchResult = false,
    s: Sequence
  ): entity.ParallelEntity {
    return new entity.ParallelEntity([
      s.down(addScore, isNotCrunchResult),
      new entity.FunctionCallEntity(() => {
        this.adjustment.adjust();
      }),
    ]);
  }

  /**
   * In the case that sequences fall continuously, makes them fall a bit.
   * Removes sequences that reached the bottom, and returns them.
   */
  advanceSequences(fraction: number): Sequence[] {
    const range = this.adjustment.getRange();

    const yDist = range.bottom - range.top;

    const droppedSequences: Sequence[] = [];
    for (const s of this.sequences) {
      s.container.position.y += fraction * yDist;

      if (s.container.position.y >= range.bottom) {
        droppedSequences.push(s);
      }
    }

    if (droppedSequences.length > 0) {
      droppedSequences.forEach((s) => {
        s.nucleotides.forEach((n) => (n.sprite.tint = 0x000000));
        this._activateChildEntity(s.down(false, true));
      });
    }

    return droppedSequences;
  }

  /** Drops @count of sequences or all sequences */
  dropSequences(count?: number): entity.Entity {
    const droppedSequences = count
      ? _.last([...this.sequences], count)
      : [...this.sequences];

    return new entity.ParallelEntity(
      droppedSequences.map((s) => {
        return this.removeSequence(false, true, s);
      })
    );
  }

  updateHighlighting(
    options: SequenceMatchingOptions = sequenceMatchingOptions[
      this.level.variant
    ]
  ): void {
    this.sequences.forEach((s) => s.highlightSegment(options));
  }

  get sequenceCount(): number {
    return this.sequences.size;
  }
}

export interface SequenceScoring {
  multiplier: number;
  nucleotides: nucleotide.NucleotideJSON[];
}

/**
 * Represent a sequence dropped by virus
 */
export class Sequence extends entity.CompositeEntity {
  public readonly baseLength: number;
  public nucleotides: nucleotide.Nucleotide[] = [];
  public container = new PIXI.Container();
  public virus?: virus.Virus;
  public scoring: SequenceScoring = {
    multiplier: 1,
    nucleotides: [],
  };

  constructor(
    public readonly base:
      | number
      | (keyof typeof nucleotide.NucleotideSignatures)[],
    private readonly basePosition: PIXI.Point
  ) {
    super();
    this.baseLength = typeof base === "number" ? base : base.length;
    this.container.position.copyFrom(basePosition);
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get maxActiveLength(): number {
    const activeLength: number[] = [0];
    let nbr = 0;
    for (const n of this.nucleotides) {
      if (n.active) {
        nbr++;
      } else {
        nbr = 0;
      }
      activeLength.push(nbr);
    }
    return Math.max(...activeLength);
  }

  _initVirus() {
    this.virus = new virus.Virus(this.level.options.virus);

    this.level.activate(this.virus);

    const requestTransition = () =>
      this.virus.isSetup &&
      !this.level.finished &&
      this.level.isInit &&
      !this.level.isEnded &&
      !this.level.disablingAnimations.has("preventVirus") &&
      ![...this.level.disablingAnimations].some((name) =>
        name.startsWith("popup")
      );

    return new entity.EntitySequence([
      new entity.FunctionalEntity({ requestTransition }),
      new entity.FunctionCallEntity(() => {
        this.level.disablingAnimation("sequence._initVirus", true);
      }),
      this.virus.come(),
      new entity.FunctionalEntity({ requestTransition }),
      new entity.FunctionCallEntity(() => this._initNucleotides()),
      this.virus.stingIn(),
      new entity.WaitingEntity(1000),
      this.virus.stingOut(),
      new entity.FunctionCallEntity(() => {
        this.level.disablingAnimation("sequence._initVirus", false);
        this.level.emitLevelEvent("injectedSequence", this);
      }),
      // todo: wait the crunch, then leave (if virus is not killed before)
    ]);
  }

  _initNucleotides() {
    const {
      width,
      height,
    } = nucleotide.Nucleotide.getNucleotideDimensionsByRadius(
      nucleotide.nucleotideRadius.sequence
    );

    let forcedSequence: nucleotide.NucleotideSignatures[] = [];

    this.level.grid.solution = [];

    if (Array.isArray(this.base)) {
      forcedSequence = this.base.map(
        (sign) => nucleotide.NucleotideSignatures[sign]
      );
    } else if (this.level.options.forceMatching) {
      const forcedMatching = this.level.grid.getForcedMatchingPath(
        this.baseLength
      );
      forcedSequence = forcedMatching.colors;
      this.level.grid.solution = forcedMatching.nucleotides;
    }

    for (
      let i = this.level.options.disableClips ? 0 : -1;
      i < this.baseLength;
      i++
    ) {
      if (forcedSequence.length > 0 && !forcedSequence[i] && i > -1) continue;

      const position = new PIXI.Point();

      if (
        this.level.options.variant === "zen" ||
        this.level.options.sequenceRounded
      ) {
        crispr.positionAlongMembrane(
          position,
          crispr.proportion(
            i,
            0,
            this.baseLength - 1,
            crispr.proportion(this.baseLength, 0, 15, 0, virus.rightEdge),
            crispr.proportion(this.baseLength, 0, 15, 0, virus.leftEdge)
          ),
          1000,
          1000
        );

        position.x -= crispr.proportion(this.baseLength, 7, 14, 300, 50);
      } else {
        position.x = i * width * 0.8;
        position.y = crispr.approximate(0, height * 0.05);
      }

      const n = new nucleotide.Nucleotide({
        parent: "sequence",
        position,
        rotation: i === -1 ? 0 : Math.random(),
        ...nucleotide.Nucleotide.fromSignature(forcedSequence[i]),
      });

      if (i === -1) n.type = "clip";

      if (this.virus) {
        crispr.positionAlongMembrane(n.position, this.virus.angle);
        n.position.x -= this.container.x;
        n.position.y -= this.level.sequenceManager.adjustment.getHeight(this);
      }
      n.floating.active.y = true;
      n.floating.amplitude.y = 0.5;
      n.floating.speed.y = 3;
      n.floating.shift.y = i;

      this._activateChildEntity(
        n,
        entity.extendConfig({
          container: this.container,
        })
      );

      this.nucleotides.push(n);
    }

    this._activateChildEntity(
      anim.sequenced({
        items: this.nucleotides,
        waitForAllSteps: true,
        timeBetween: 50,
        onStep: (item) => {
          console.log(item);
          return item.spriteSwitchAnimation(item.sprite);
        },
      })
    );

    if (this.virus) {
      this._activateChildEntity(
        anim.sequenced({
          items: this.nucleotides,
          waitForAllSteps: true,
          timeBetween: 250,
          delay: 500,
          onStep: (n, index) => {
            const position = new PIXI.Point(
              index * width * 0.8,
              crispr.approximate(0, height * 0.05)
            );
            return anim.move(
              n.position,
              n.position.clone(),
              position,
              1000,
              easing.easeOutCubic
            );
          },
        })
      );
    }
  }

  _setup() {
    this.container.interactive = true;

    this._on(this.container, "pointerup", () => {
      this._entityConfig.level.sequenceManager.emit("click", this);
    });

    if (this.level.options.disableViruses) {
      this._initNucleotides();
    } else {
      this._activateChildEntity(this._initVirus());
    }

    this._entityConfig.container.addChild(this.container);
  }

  _teardown() {
    this.level.sequenceManager.sequences.delete(this);
    this.nucleotides = [];
    this.container.removeChildren();
    this._entityConfig.container.removeChild(this.container);
  }

  resolveScoring(): number {
    return (
      this.scoring.nucleotides.length *
      this.scoring.multiplier *
      this.level.options.baseCrispyGain
    );
  }

  resetScoring() {
    this.scoring = {
      multiplier: 1,
      nucleotides: [],
    };
  }

  addScoring(nucleotides: nucleotide.NucleotideJSON[]) {
    if (
      nucleotides.filter((n) => n.type !== "portal").length === this.baseLength
    ) {
      this.level.oneShotSequence = true;
    }
    this.scoring.multiplier +=
      nucleotides.reduce((acc, val) => acc + (val.crispyMultiplier - 1), 1) - 1;
    this.scoring.nucleotides.push(...nucleotides);
  }

  applyScoring(duration = 1500) {
    const addedScore = this.resolveScoring();
    return new tween.Tween({
      duration,
      from: this.level.crispies,
      to: this.level.crispies + addedScore,
      easing: easing.easeInOutCubic,
      onUpdate: (value) => {
        this.level.crispies = value;
      },
      onTeardown: () => {
        this.resetScoring();
      },
    });
  }

  displayScoring(): entity.EntitySequence {
    let scoring: SequenceScoring, scoringText: PIXI.Text, total: number;
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        scoring = this.scoring;
        total = this.resolveScoring();

        scoringText = crispr.makeText(
          `${this.level.options.baseCrispyGain} x ${scoring.nucleotides.length}`,
          {
            fontFamily: "Waffle Crisp",
            fill: crispr.yellow,
            fontSize: 80,
            stroke: 0x000000,
            strokeThickness: 4,
          }
        );

        scoringText.anchor.set(0.5);
        scoringText.alpha = 0;
        scoringText.position.x = crispr.width / 2 - this.container.position.x;

        this.container.addChild(scoringText);
      }),
      new entity.ParallelEntity([
        () =>
          anim.move(
            scoringText.position,
            scoringText.position.clone(),
            new PIXI.Point(
              scoringText.position.x,
              scoringText.position.y - 100
            ),
            1000,
            easing.easeOutBounce
          ),
        new tween.Tween({
          from: 0,
          to: 1,
          duration: 1000,
          easing: easing.easeInOutQuart,
          onUpdate: (value) => (scoringText.alpha = value),
        }),
      ]),
      () =>
        scoring.multiplier > 1
          ? anim.bubble(scoringText, 1.5, 500, {
              onTop: () => {
                scoringText.text = `${
                  this.level.options.baseCrispyGain * scoring.nucleotides.length
                } x ${scoring.multiplier}`;
              },
            })
          : new entity.FunctionCallEntity(() => null),
      () =>
        new entity.ParallelEntity([
          new entity.FunctionCallEntity(() => {
            this.level.screenShake(8, 1.05, 1000);
            this._entityConfig.fxMachine.play("score_ring");
          }),
          new tween.Tween({
            from: this.level.options.baseCrispyGain,
            to: total,
            onUpdate: (value) => {
              scoringText.text = String(Math.round(value));
              scoringText.style.fontSize = scoringText.style.fontSize + 2;
            },
            easing: easing.easeInCubic,
            duration: 1000,
          }),
          anim.bubble(scoringText, 1.25, 1000, {
            onTop: () => {
              //this.level.screenShake(5, 1.05, 100);
            },
          }),
        ]),
      () =>
        anim.bubble(scoringText, 1.25, 200, {
          onTop: () => {
            scoringText.text = String(total);
          },
        }),
      () => anim.down(scoringText, 500, scoringText.scale.x),
      new entity.FunctionCallEntity(() => {
        this.container.removeChild(scoringText);
      }),
    ]);
  }

  down(addScore: boolean, notACrunchResult = false) {
    let startedAt: number;
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        this.level.disablingAnimation("sequence.down", true);
        startedAt = Date.now();
      }),
      new entity.FunctionalEntity({
        requestTransition: () => {
          return (
            Date.now() > startedAt + 3000 ||
            notACrunchResult ||
            this.level.disablingAnimations.has("path.crunch.down")
          );
        },
      }),
      anim.sequenced({
        items: this.nucleotides.slice(),
        timeBetween: 50,
        waitForAllSteps: true,
        onStep: (item) => {
          item.highlighted = false;
          return anim.down(item.sprite, 500, item.sprite.scale.x);
        },
      }),
      addScore
        ? new entity.EntitySequence([
            this.displayScoring(),
            this.applyScoring(),
          ])
        : new entity.FunctionCallEntity(() => null),
      new entity.FunctionCallEntity(() => {
        const end = () => {
          //if (this.virus?.isSetup) this.level.deactivate(this.virus);
          this.level.disablingAnimation("path.crunch.down", false);
          this.level.disablingAnimation("sequence.down", false);
          this.level.emitLevelEvent("sequenceDown");
          this.level.sequenceManager.adjustment.adjust();
          this._transition = entity.makeTransition();
        };

        if (this.virus && this.virus.isSetup) {
          this._activateChildEntity(
            new entity.EntitySequence([
              new entity.ParallelEntity([
                new entity.FunctionCallEntity(() => {
                  this.level.activate(
                    addScore ? this.virus.kill() : this.virus.leave()
                  );
                }),
                new entity.WaitingEntity(1000),
              ]),
              new entity.FunctionCallEntity(end),
            ])
          );
        } else {
          end();
        }
      }),
    ]);
  }

  validate(
    options: SequenceMatchingOptions = sequenceMatchingOptions[
      this.level.variant
    ]
  ): boolean {
    const signatures = this.level.resolveSignatures();

    if (!signatures) return false;

    const { pathSignature, sequenceSignature } = signatures;

    if (pathSignature.length < crispr.scrap(options.minLength, this.level))
      return false;

    if (options.sticky !== "borders") {
      const method = options.sticky
        ? options.sticky === "left"
          ? "startsWith"
          : "endsWith"
        : "includes";

      if (options.sens) {
        if (options.sens === "toRight") {
          return sequenceSignature[method](pathSignature);
        } else {
          return sequenceSignature[method](util.reverseString(pathSignature));
        }
      } else {
        return (
          sequenceSignature[method](pathSignature) ||
          sequenceSignature[method](util.reverseString(pathSignature))
        );
      }
    } else {
      if (options.sens) {
        if (options.sens === "toRight") {
          return sequenceSignature === pathSignature;
        } else {
          return sequenceSignature === util.reverseString(pathSignature);
        }
      } else {
        return (
          sequenceSignature === pathSignature ||
          sequenceSignature === util.reverseString(pathSignature)
        );
      }
    }
  }

  getMatchingSegment(
    options: SequenceMatchingOptions = sequenceMatchingOptions[
      this.level.variant
    ]
  ): nucleotide.Nucleotide[] | null {
    const signatures = this.level.resolveSignatures();

    if (!signatures) return null;

    const { pathSignature, sequenceSignature } = signatures;

    if (pathSignature.length < crispr.scrap(options.minLength, this.level))
      return null;

    if (options.sticky !== "borders") {
      if (options.sticky) {
        if (options.sticky === "right") {
          if (options.sens) {
            if (options.sens === "toRight") {
              return sequenceSignature.endsWith(pathSignature)
                ? this.nucleotides
                    .slice()
                    .reverse()
                    .slice(0, pathSignature.length)
                : null;
            } else {
              return sequenceSignature.endsWith(
                util.reverseString(pathSignature)
              )
                ? this.nucleotides
                    .slice()
                    .reverse()
                    .slice(0, pathSignature.length)
                : null;
            }
          } else {
            return sequenceSignature.endsWith(pathSignature) ||
              sequenceSignature.endsWith(util.reverseString(pathSignature))
              ? this.nucleotides
                  .slice()
                  .reverse()
                  .slice(0, pathSignature.length)
              : null;
          }
        } else {
          if (options.sens) {
            if (options.sens === "toRight") {
              return sequenceSignature.startsWith(pathSignature)
                ? this.nucleotides.slice(0, pathSignature.length)
                : null;
            } else {
              return sequenceSignature.startsWith(
                util.reverseString(pathSignature)
              )
                ? this.nucleotides.slice(0, pathSignature.length)
                : null;
            }
          } else {
            return sequenceSignature.startsWith(pathSignature) ||
              sequenceSignature.startsWith(util.reverseString(pathSignature))
              ? this.nucleotides.slice(0, pathSignature.length)
              : null;
          }
        }
      } else {
        // partial
        if (options.sens) {
          let index: number;
          if (options.sens === "toRight") {
            index = sequenceSignature.indexOf(pathSignature);
          } else {
            index = sequenceSignature.indexOf(
              util.reverseString(pathSignature)
            );
          }
          return index > -1
            ? this.nucleotides.slice(index, index + pathSignature.length)
            : null;
        } else {
          let index = sequenceSignature.indexOf(pathSignature);
          if (index === -1) {
            index = sequenceSignature.indexOf(
              util.reverseString(pathSignature)
            );
          }
          return index > -1
            ? this.nucleotides.slice(index, index + pathSignature.length)
            : null;
        }
      }
    } else {
      // full
      if (options.sens) {
        if (options.sens === "toRight") {
          return sequenceSignature === pathSignature ? this.nucleotides : null;
        } else {
          return sequenceSignature === util.reverseString(pathSignature)
            ? this.nucleotides
            : null;
        }
      } else {
        return sequenceSignature === pathSignature ||
          sequenceSignature === util.reverseString(pathSignature)
          ? this.nucleotides
          : null;
      }
    }
  }

  /**
   * Make the nucleotides that match the signature inactive
   * @param options
   */
  deactivateSegment(
    options: SequenceMatchingOptions = sequenceMatchingOptions[
      this.level.variant
    ]
  ): boolean {
    const segment = this.getMatchingSegment(options);

    if (!segment) return false;

    segment.forEach((n) => {
      this._activateChildEntity(n.turn(false));
    });

    return true;
  }

  highlightSegment(
    options: SequenceMatchingOptions = sequenceMatchingOptions[
      this.level.variant
    ]
  ): void {
    const segment = this.getMatchingSegment({
      ...options,
      minLength: 1,
      sticky: undefined,
    });

    for (const n of this.nucleotides)
      n.highlighted = segment?.includes(n) ?? false;
  }

  isFullInactive(): boolean {
    return this.nucleotides.every((n) => !n.active);
  }

  /**
   * Returns signature of sequence
   */
  toString(): string {
    return this.nucleotides.join("");
  }

  private _playNote(index: number) {
    const n = Math.round(
      crispr.proportion(index, 0, this.nucleotides.length, 1, 9)
    );
    this._entityConfig.fxMachine.play(`note_${Math.min(8, n)}`);
  }
}
