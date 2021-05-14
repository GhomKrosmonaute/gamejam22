import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as crispr from "../crispr";
import * as anim from "../animations";

import * as nucleotide from "./nucleotide";
import * as path from "./path";
import * as virus from "./virus";

import * as level from "../scenes/level";

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

  get sequenceCountLimit(): number {
    if (
      typeof this.level.variant === "object" &&
      this.level.variant.sequenceCountLimit
    )
      return crispr.scrap(
        this.level.variant.sequenceCountLimit,
        this.level,
        this
      );
    switch (this.level.options.variant) {
      case "turn":
        return 3;
      case "fall":
      case "zen":
        return 1;
    }
  }

  private _pickSequenceLength(): number {
    if (this.level.options.sequenceLength !== null)
      return this.level.options.sequenceLength;

    if (
      typeof this.level.variant === "object" &&
      this.level.variant.sequenceLength
    )
      return crispr.scrap(this.level.variant.sequenceLength, this.level, this);

    switch (this.level.options.variant) {
      case "turn":
        return crispr.random(4, 7);
      case "fall":
        return crispr.random(3, 5);
      case "zen":
        return 13;
    }
  }

  set(colors: nucleotide.ColorName[]) {
    const { width: nucleotideWidth } =
      nucleotide.Nucleotide.getNucleotideDimensionsByRadius(
        this.level.options.sequenceNucleotideRadius
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

  add(length?: number) {
    length = length ?? this._pickSequenceLength();
    const { width: nucleotideWidth } =
      nucleotide.Nucleotide.getNucleotideDimensionsByRadius(
        this.level.options.sequenceNucleotideRadius
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

  /** remove all validated sequences */
  crunch(_path: path.Path | undefined): entity.Entity | void {
    if (
      typeof this.level.variant === "object" &&
      this.level.variant.onSequenceManagerCrunched
    )
      return this.level.variant.onSequenceManagerCrunched(this);

    if (_path && this.matchesSequence(_path) !== true) return;

    const sequence = [...this.sequences][0];

    const signature = _path ? _path.signature : sequence.toString();
    const removedSequences: Sequence[] = [];
    let partialCrunch = false;

    if (this.level.options.variant === "zen") {
      if (sequence.validate(signature, "partial")) {
        sequence.deactivateSegment(_path.signature);

        partialCrunch = true;

        if (sequence.isInactive()) {
          removedSequences.push(sequence);
        }
      }
    } else if (this.level.options.canCrunchParts) {
      removedSequences.push(sequence);
    } else if (sequence.validate(signature)) {
      partialCrunch = true;

      removedSequences.push(sequence);
    }

    // for (const s of this.sequences) {
    //   if (this.level.options.variant === "zen") {
    //     if (s.validate(signature, "partial")) {
    //       s.deactivateSegment(_path.signature);

    //       partialCrunch = true;

    //       if (s.isInactive()) {
    //         removedSequences.push(s);
    //       }
    //     }
    //   } else if (s.validate(signature)) {
    //     partialCrunch = true;

    //     removedSequences.push(s);
    //   }
    // }

    const context: entity.Entity[] = [];

    if (removedSequences.length > 0 || partialCrunch) {
      this.level.path.crunchCountBeforeSequenceDown++;

      if (crispr.debug) {
        console.log(
          "updated",
          "crunchCountBeforeSequenceDown",
          this.level.path.crunchCountBeforeSequenceDown
        );
      }

      for (const s of removedSequences) {
        context.push(
          new entity.FunctionCallEntity(() => {
            this.emit("crunch", s);
          }),
          this.removeSequence(!this.level.options.disableScore, false, s)
        );
      }
    }

    // if (crunched) path.items.forEach((n) => (n.state = "missing"));

    context.push(
      new entity.FunctionCallEntity(() => {
        this.adjustment.adjust();
        if (partialCrunch) {
          this.level.emitLevelEvent("partialCrunched");
        }
      })
    );

    return new entity.EntitySequence(context);
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

  matchesSequence(_path: path.Path): path.PathState {
    // TODO: perhaps this should only work if one and only one sequence matches?
    if (
      typeof this.level.variant === "object" &&
      this.level.variant.onSequenceManagerMatchPath
    )
      return this.level.variant.onSequenceManagerMatchPath(this.level, _path);

    if (this.level.options.variant === "zen") {
      return (
        (_path.length > 2 &&
          [...this.sequences].some((s) =>
            s.validate(_path.signature, "partial")
          )) ||
        "no match"
      );
    } else if (this.level.options.canCrunchParts) {
      const options = this.level.options.canCrunchParts;
      const sequenceLength = [...this.sequences][0].baseLength;

      for (const possiblePart of options.possibleParts.sort((a, b) => {
        const lengthA = crispr.resolvePossiblePartLength(
          a.length,
          sequenceLength
        );
        const lengthB = crispr.resolvePossiblePartLength(
          b.length,
          sequenceLength
        );
        return lengthA - lengthB;
      })) {
        const length = crispr.resolvePossiblePartLength(
          possiblePart.length,
          sequenceLength
        );

        if (
          _path.length === length &&
          [...this.sequences][0].validate(_path.signature, "partial", options)
        )
          return true;
      }

      return "no match";
    } else {
      if (
        ![...this.sequences].some((s) => s.validate(_path.signature, "full"))
      ) {
        return "no match";
      }
      if (this.level.options.clipCount > 0 && !_path.correctlyContainsClips()) {
        return "missing clips";
      }
      return true;
    }
  }

  updateHighlighting(_path: path.Path): void {
    const signature = _path.signature;
    this.sequences.forEach((s) => s.highlightSegment(signature));
  }

  get sequenceCount(): number {
    return this.sequences.size;
  }
}

/**
 * Represent a sequence dropped by virus
 */
export class Sequence extends entity.CompositeEntity {
  public readonly baseLength: number;
  public nucleotides: nucleotide.Nucleotide[] = [];
  public container = new PIXI.Container();
  public virus?: virus.Virus;

  constructor(
    public readonly base: number | nucleotide.ColorName[],
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
      if (n.state !== "inactive") {
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
    const { width, height } =
      nucleotide.Nucleotide.getNucleotideDimensionsByRadius(
        this.level.options.sequenceNucleotideRadius
      );

    let forcedSequence: nucleotide.ColorName[] = [];

    this.level.grid.solution = [];

    if (Array.isArray(this.base)) {
      forcedSequence = this.base.slice(0);
    } else if (this.level.options.forceMatching) {
      const forcedMatching = this.level.grid.getForcedMatchingPath(
        this.baseLength
      );
      forcedSequence = forcedMatching.colors;
      this.level.grid.solution = forcedMatching.nucleotides;
    }

    for (let i = -1; i < this.baseLength; i++) {
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

      const n = new nucleotide.Nucleotide(
        this.level.options.sequenceNucleotideRadius,
        "sequence",
        position,
        i === -1 ? 0 : Math.random(),
        forcedSequence[i]
      );

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

      n.state = "present";

      if (this.level.options.canCrunchParts) {
        const options = this.level.options.canCrunchParts;
        for (const possiblePart of options.possibleParts.sort((a, b) => {
          const lengthA = crispr.resolvePossiblePartLength(
            a.length,
            this.baseLength
          );
          const lengthB = crispr.resolvePossiblePartLength(
            b.length,
            this.baseLength
          );
          return lengthA - lengthB;
        })) {
          const length = crispr.resolvePossiblePartLength(
            possiblePart.length,
            this.baseLength
          );

          if (n.glowColor === null && i + 1 < length) {
            n.glowColor = possiblePart.glowColor;
          }
        }
      }

      this.nucleotides.push(n);
    }

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

    if (this.level.options.variant === "zen") {
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

  down(addScore: boolean, notACrunchResult = false) {
    let isLong: boolean,
      fully: boolean,
      shots: number,
      scoreAnimationFinished = !addScore,
      length: number;

    const pathSignature = this.level.path.signature;
    const pathItems = this.level.path.items.map((n) => n.toJSON());
    const allDownNucleotides = pathItems; //[...this.nucleotides, ...pathItems];
    const multiplier = allDownNucleotides.reduce(
      (accumulator, n) => accumulator * n.crispyMultiplier,
      1
    );

    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        this.level.disablingAnimation("sequence.down", true);
        this.level.sequenceWasCrunched = true;
        this.level.crunchedSequenceCount++;

        if (crispr.debug) {
          console.log(
            "updated",
            "crunchedSequenceCount",
            this.level.crunchedSequenceCount
          );
        }

        isLong = this.level.options.variant === "zen";
        fully = this.nucleotides.every((n) => n.state === "inactive");
        shots = this.level.path.crunchCountBeforeSequenceDown;
        length = allDownNucleotides.length;

        if (isLong && fully && shots === 1) {
          this.level.oneShotLongSequence = true;

          if (crispr.debug) {
            console.log(
              "updated",
              "oneShotLongSequence",
              this.level.oneShotLongSequence
            );
          }
        }

        this.level.path.crunchCountBeforeSequenceDown = 0;
      }),
      new entity.FunctionalEntity({
        requestTransition: () => {
          return (
            notACrunchResult ||
            this.level.disablingAnimations.has("path.crunch.down")
          );
        },
      }),
      new entity.FunctionCallEntity(() => {
        if (addScore) {
          const text = crispr.makeText(
            `${this.level.options.baseCrispyGain} x ${length}`,
            {
              fontFamily: "Waffle Crisp",
              fill: crispr.yellow,
              fontSize: 80,
              stroke: fully ? "#ffa200" : "#000000",
              strokeThickness: 4,
            }
          );

          text.anchor.set(0.5);
          text.alpha = 0;
          text.position.x = crispr.width / 2 - this.container.position.x;

          this.container.addChild(text);

          this.level.activate(
            new entity.EntitySequence([
              new entity.ParallelEntity([
                () =>
                  anim.move(
                    text.position,
                    text.position.clone(),
                    new PIXI.Point(text.position.x, text.position.y - 100),
                    1000,
                    easing.easeOutBounce
                  ),
                new tween.Tween({
                  from: 0,
                  to: 1,
                  duration: 1000,
                  easing: easing.easeInOutQuart,
                  onUpdate: (value) => (text.alpha = value),
                }),
              ]),
              () =>
                anim.bubble(text, 1.5, 500, {
                  onTop: () => {
                    text.text = `${
                      this.level.options.baseCrispyGain * length
                    } x ${multiplier}`;
                  },
                }),
              () =>
                new entity.ParallelEntity([
                  new entity.FunctionCallEntity(() => {
                    this.level.screenShake(10, 1.2, 1000);
                  }),
                  new tween.Tween({
                    from: this.level.options.baseCrispyGain,
                    to: this.level.options.baseCrispyGain * length * multiplier,
                    onUpdate: (value) => {
                      text.text = String(Math.round(value));
                    },
                    easing: easing.easeInCubic,
                    duration: 1000,
                  }),
                  anim.bubble(text, 1.25, 1000, {
                    onTop: () => {
                      this.level.screenShake(10, 1.2, 100);
                    },
                  }),
                ]),
              () =>
                anim.bubble(text, 1.25, 200, {
                  onTop: () => {
                    text.text = String(
                      this.level.options.baseCrispyGain * length * multiplier
                    );
                  },
                  onTeardown: () => {
                    this.level.activate(
                      anim.down(
                        text,
                        500,
                        text.scale.x,
                        () => (scoreAnimationFinished = true)
                      )
                    );
                  },
                }),
            ])
          );
        }
      }),
      new entity.FunctionalEntity({
        requestTransition: () => scoreAnimationFinished,
      }),
      () =>
        anim.sequenced({
          items: this.nucleotides,
          timeBetween: 50,
          waitForAllSteps: true,
          onStep: (n, index, all, finish) => {
            n.shakes.removeShake("highlight");

            this._playNote(index);

            let score = this.level.options.baseCrispyGain;

            score *= multiplier;

            // if (crispr.debug) {
            //   console.log("Multiplier:", multiplier, "Score:", score);
            // }

            // if (isLong) {
            //   if (n.state !== "inactive") {
            //     score *= -1;
            //   } else if (fully) {
            //     score *= 2;
            //   }
            // }

            if (addScore && pathSignature.length >= index) {
              this.level.score += score;
            }

            this._activateChildEntity(
              new entity.EntitySequence([
                // new tween.Tween({
                //   from: n.position.y,
                //   to: n.position.y + 30,
                //   onUpdate: (v) => n.position.y = v,
                //   duration: 250
                // }),
                anim.down(n.sprite, 500, 1, finish),
              ])
            );
          },
          callback: () => {
            const end = () => {
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
          },
        }),
    ]);
  }

  validate(
    signature: string,
    validationMethod: "full" | "partial" = "full",
    options?: { fromLeft?: boolean; fromRight?: boolean }
  ): boolean {
    const sequenceSignature = this.toString();
    if (validationMethod === "full") {
      return (
        signature === sequenceSignature ||
        signature === util.reverseString(sequenceSignature)
      );
    } else {
      return (
        sequenceSignature.includes(signature) ||
        (options?.fromLeft && sequenceSignature.startsWith(signature)) ||
        (options?.fromRight && sequenceSignature.endsWith(signature))
      );
    }
  }

  /**
   * Make the nucleotides that match the signature inactive
   * @param signature
   */
  deactivateSegment(signature: string): boolean {
    const segment = this.getMatchingSegment(signature);

    if (!segment) return false;

    segment.forEach((n) => (n.state = "inactive"));

    return true;
  }

  highlightSegment(signature: string = ""): void {
    const segment = this.getMatchingSegment(signature);

    for (const n of this.nucleotides) {
      n.isHighlighted = segment && segment.includes(n);
    }
  }

  getMatchingSegment(signature: string): nucleotide.Nucleotide[] | null {
    // Try forwards
    let sequenceSignature = this.toString();
    let index = sequenceSignature.indexOf(signature);
    if (index !== -1) {
      return util.subarray(this.nucleotides.slice(1), index, signature.length);
    }

    // Try backwards
    sequenceSignature = util.reverseString(sequenceSignature);
    index = sequenceSignature.indexOf(signature);
    if (index !== -1) {
      return util.subarray(
        this.nucleotides.slice(1),
        sequenceSignature.length - 1 - index,
        signature.length * -1
      );
    }

    return null;
  }

  isInactive(): boolean {
    return !this.nucleotides.some((n) => n.state !== "inactive");
  }

  toString(): string {
    return this.nucleotides.map((n) => n.toString()).join("");
  }

  private _playNote(index: number) {
    const n = Math.round(
      crispr.proportion(index, 0, this.nucleotides.length, 1, 9)
    );
    this._entityConfig.fxMachine.play(`note_${Math.min(8, n)}`);
  }
}
