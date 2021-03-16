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

  get sequenceCountLimit(): number {
    switch (this.level.options.variant) {
      case "turn":
        return 3;
      case "fall":
      case "zen":
        return 1;
    }
  }

  get viruses(): virus.Virus[] {
    return [...this.sequences].map((s) => s.virus).filter((v) => v.isSetup);
  }

  private _pickSequenceLength(): number {
    if (this.level.options.sequenceLength !== null)
      return this.level.options.sequenceLength;

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
    const {
      width: nucleotideWidth,
    } = nucleotide.Nucleotide.getNucleotideDimensionsByRadius(
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
    const {
      width: nucleotideWidth,
    } = nucleotide.Nucleotide.getNucleotideDimensionsByRadius(
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
  crunch(_path: path.Path): entity.EntitySequence | void {
    if (this.matchesSequence(_path) !== true) return;

    const signature = _path.signature;
    const removedSequences: Sequence[] = [];
    let partialCrunch = false;

    for (const s of this.sequences) {
      if (this.level.options.variant === "zen") {
        if (s.validate(signature, "partial")) {
          s.deactivateSegment(_path.signature);

          partialCrunch = true;

          if (s.isInactive()) {
            removedSequences.push(s);
          }
        }
      } else if (s.validate(signature)) {
        partialCrunch = true;

        removedSequences.push(s);
      }
    }

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
          this.removeSequence(!this.level.options.disableScore, s)
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

  removeSequence(addScore: boolean, s: Sequence): entity.ParallelEntity {
    return new entity.ParallelEntity([
      s.down(addScore),
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
        this._activateChildEntity(s.down(false));
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
        return this.removeSequence(false, s);
      })
    );
  }

  matchesSequence(_path: path.Path): string | true {
    // TODO: perhaps this should only work if one and only one sequence matches?

    if (this.level.options.variant === "zen") {
      return (
        (_path.length > 2 &&
          [...this.sequences].some((s) =>
            s.validate(_path.signature, "partial")
          )) ||
        "NO\nMATCH"
      );
    } else {
      if (
        ![...this.sequences].some((s) => s.validate(_path.signature, "full"))
      ) {
        return "NO\nMATCH";
      }
      if (
        this.level.options.scissorCount > 0 &&
        !_path.correctlyContainsScissors()
      ) {
        return "MISSING\nSCISSORS";
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
      this.level.options.sequenceNucleotideRadius
    );

    let forcedSequence: nucleotide.ColorName[] = [];

    if (Array.isArray(this.base)) {
      forcedSequence = this.base.slice(0);
    } else if (this.level.options.forceMatching) {
      forcedSequence = this.level.grid.getRandomPath(this.baseLength);
      while (!forcedSequence) {
        forcedSequence = this.level.grid.getRandomPath(this.baseLength);
      }
    }

    for (let i = 0; i < this.baseLength; i++) {
      const position = new PIXI.Point();

      if (this.level.options.variant === "zen") {
        crispr.positionAlongMembrane(
          position,
          crispr.proportion(
            i,
            0,
            this.baseLength - 1,
            crispr.proportion(this.baseLength, 0, 14, 0, virus.rightEdge),
            crispr.proportion(this.baseLength, 0, 14, 0, virus.leftEdge)
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
        Math.random(),
        forcedSequence[i]
      );

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

  down(addScore: boolean) {
    let isLong: boolean, fully: boolean, shots: number;

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
      anim.sequenced({
        items: this.nucleotides,
        timeBetween: isLong ? 80 : 200,
        waitForAllSteps: true,
        onStep: (n, i, all) => {
          n.shakes.removeShake("highlight");

          const baseShift = Math.round(Math.random() * 50) + 50;
          const context: entity.Entity[] = [];

          let score = this.level.options.baseGain;

          if (isLong) {
            if (n.state !== "inactive") {
              score *= -1;
            } else if (fully) {
              score *= 2;
            }
          }

          if (addScore) {
            this.level.addScore(score);

            context.push(
              anim.textFade(
                this.container,
                crispr.makeText(
                  `${score >= 0 ? "+" : "-"} ${String(score).replace("-", "")}`,
                  {
                    fill: score < 0 ? "#d70000" : "#ffffff",
                    fontSize: 70 + score,
                    stroke: fully ? "#ffa200" : "#000000",
                    strokeThickness: 4,
                  }
                ),
                800,
                new PIXI.Point(
                  n.position.x,
                  n.position.y + baseShift * (score < 0 ? 1 : -1)
                ),
                score < 0 ? "down" : "up"
              )
            );
          }

          context.push(
            new entity.ParallelEntity([
              new tween.Tween({
                from: n.position.x,
                to: n.position.x + (all.length / 2) * 25 - i * 25,
                duration: 1000,
                onUpdate: (value) => {
                  n.position.x = value;
                },
              }),
              anim.sink(n._container, 1000),
            ])
          );

          return new entity.ParallelEntity(context);
        },
        callback: () => {
          const end = () => {
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
    validationMethod: "full" | "partial" = "full"
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
        util.reverseString(sequenceSignature).includes(signature)
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
      return util.subarray(this.nucleotides, index, signature.length);
    }

    // Try backwards
    sequenceSignature = util.reverseString(sequenceSignature);
    index = sequenceSignature.indexOf(signature);
    if (index !== -1) {
      return util.subarray(
        this.nucleotides,
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
}
