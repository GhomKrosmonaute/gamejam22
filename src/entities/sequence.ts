import * as _ from "underscore";
import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as crisprUtil from "../crisprUtil";
import * as anim from "../animations";

import * as nucleotide from "./nucleotide";
import * as path from "./path";
import * as virus from "./virus";

import * as level from "../scenes/level";

/**
 * emits:
 * - crunch(s: Sequence)
 */
export class SequenceManager extends entity.CompositeEntity {
  public sequences = new Set<Sequence>();
  public container: PIXI.Container;

  private adjustment: entity.ParallelEntity = null;

  _setup() {
    this.container = new PIXI.Container();
    this._entityConfig.container.addChild(this.container);
  }

  _teardown() {
    this.sequences.clear();
    this._entityConfig.container.removeChild(this.container);
    this.container = null;
  }

  private _getSequenceRangeY(): crisprUtil.Range {
    const range: crisprUtil.Range = {
      top: 0,
      middle: 0,
      bottom: 0,
    };

    switch (this.level.options.variant) {
      case "turnBased":
        range.top = crisprUtil.height * 0.25;
        range.bottom = crisprUtil.height * 0.42;
        break;
      case "continuous":
        range.top = crisprUtil.height * 0.2;
        range.bottom = crisprUtil.height * 0.38;
        break;
      case "long":
        range.top = crisprUtil.height * 0.3;
        range.bottom = crisprUtil.height * 0.3;
        break;
    }

    range.middle = (range.top + range.bottom) / 2;
    return range;
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get sequenceCountLimit(): number {
    switch (this.level.options.variant) {
      case "turnBased":
        return 3;
      case "continuous":
      case "long":
        return 1;
    }
  }

  private _pickSequenceLength(): number {
    if (this.level.options.sequenceLength !== null)
      return this.level.options.sequenceLength;

    switch (this.level.options.variant) {
      case "turnBased":
        return crisprUtil.random(4, 7);
      case "continuous":
        return crisprUtil.random(3, 4);
      case "long":
        return 13;
    }
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
        crisprUtil.width / 2 - (length * nucleotideWidth * 0.8) / 2,
        this._getSequenceRangeY().top
      )
    );
    this._activateChildEntity(
      sequence,
      entity.extendConfig({
        container: this.container,
      })
    );
    this.sequences.add(sequence);
    this.adjustRelativePositionOfSequences();
  }

  /** remove all validated sequences */
  crunch(_path: path.Path, callback?: () => any) {
    const finish: Promise<void>[] = [];

    if (this.matchesSequence(_path) !== true) return;

    const signature = _path.signature;
    const removedSequences: Sequence[] = [];
    for (const s of this.sequences) {
      if (this._entityConfig.level.options.variant === "long") {
        if (s.validate(signature, "partial")) {
          s.deactivateSegment(_path.signature);

          if (s.isInactive()) {
            removedSequences.push(s);
          }
        }
      } else if (s.validate(signature)) {
        removedSequences.push(s);
      }
    }

    if (removedSequences.length > 0) {
      for (const s of removedSequences) {
        this.emit("crunch", s);
        finish.push(
          new Promise((resolve) => {
            this.removeSequence(true, s, resolve);
          })
        );
      }

      this.adjustRelativePositionOfSequences();
    }

    // if (crunched) path.items.forEach((n) => (n.state = "missing"));

    Promise.all(finish).then(callback);
  }

  removeSequence(addScore: boolean, s: Sequence, callback?: () => any) {
    s.down(addScore, () => {
      this.adjustRelativePositionOfSequences();
      if (callback) callback();
    });
  }

  /**
   * In the case that sequences fall continuously, makes them fall a bit.
   * Removes sequences that reached the bottom, and returns them.
   */
  advanceSequences(fraction: number): Sequence[] {
    const yDist =
      this._getSequenceRangeY().bottom - this._getSequenceRangeY().top;

    const droppedSequences: Sequence[] = [];
    for (const s of this.sequences) {
      s.container.position.y += fraction * yDist;

      if (s.container.position.y >= this._getSequenceRangeY().bottom) {
        droppedSequences.push(s);
      }
    }

    if (droppedSequences.length > 0) {
      droppedSequences.forEach((s, i) => {
        this.level.disablingAnimations.add(`dropSequence-${i}`);
        s.nucleotides.forEach((n) => (n.sprite.tint = 0x000000));
        s.down(false, () => {
          this.level.disablingAnimations.delete(`dropSequence-${i}`);
        });
      });
    }

    return droppedSequences;
  }

  /** Drops the last @count sequences and returns them */
  dropSequences(count = 1): Sequence[] {
    const droppedSequences = _.last([...this.sequences], count);

    droppedSequences.forEach((s) => {
      this.removeSequence(false, s);
    });

    return droppedSequences;
  }

  /**
   * In the case that sequences are layed out, distributes them evenly
   */
  adjustRelativePositionOfSequences() {
    if (this.adjustment && this.adjustment.isSetup) {
      this._deactivateChildEntity(this.adjustment);
    }

    this.adjustment = new entity.ParallelEntity(
      [...this.sequences].map((s, i) => {
        return new tween.Tween({
          duration: 2000,
          easing: easing.easeInOutQuad,
          from: s.container.position.y,
          to: this.getSequenceYByIndex(i),
          onUpdate: function (value: number) {
            (<Sequence>this).container.position.y = value;
          }.bind(s),
        });
      })
    );

    this._activateChildEntity(this.adjustment);
  }

  getSequenceYByIndex(index: number) {
    const range = this._getSequenceRangeY();
    if (this.sequences.size === 1) return range.middle;
    return crisprUtil.proportion(
      index,
      0,
      this.sequences.size,
      range.top,
      range.bottom
    );
  }

  matchesSequence(_path: path.Path): string | true {
    // TODO: perhaps this should only work if one and only one sequence matches?

    if (this._entityConfig.level.options.variant === "long") {
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
  public nucleotides: nucleotide.Nucleotide[] = [];
  public container = new PIXI.Container();
  public virus?: virus.Virus;

  constructor(
    public readonly baseLength: number,
    private readonly basePosition: PIXI.Point
  ) {
    super();
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
    this.virus = new virus.Virus("mini");

    this._activateChildEntity(this.virus, this.level.config);

    return new entity.EntitySequence([
      new entity.FunctionalEntity({
        requestTransition: () => this.virus.isSetup,
      }),
      this.virus.come(),
      new entity.FunctionCallEntity(() => this._initNucleotides()),
      this.virus.stingIn(),
      new entity.WaitingEntity(1000),
      this.virus.stingOut(),
    ]);
  }

  _initNucleotides() {
    // todo: force matching if level forceMatching flag is true

    const {
      width,
      height,
    } = nucleotide.Nucleotide.getNucleotideDimensionsByRadius(
      this.level.options.sequenceNucleotideRadius
    );

    let forcedSequence: nucleotide.ColorName[];

    if (this.level.options.forceMatching) {
      forcedSequence = this.level.grid.getRandomPath(this.baseLength);
      if (!forcedSequence) throw new Error("oops-bis");
    }

    for (let i = 0; i < this.baseLength; i++) {
      const position = new PIXI.Point(
        i * width * 0.8,
        crisprUtil.approximate(0, height * 0.05)
      );

      const n = new nucleotide.Nucleotide(
        this.level.options.sequenceNucleotideRadius,
        "sequence",
        position,
        Math.random()
      );

      if (this.level.options.forceMatching) {
        n.colorName = forcedSequence[i];
      }

      if (this.virus) {
        crisprUtil.positionAlongMembrane(n.position, this.virus.angle);
        n.position.x -= this.container.x;
        n.position.y -= this.level.sequenceManager.getSequenceYByIndex(
          [...this.level.sequenceManager.sequences].indexOf(this)
        );
      }
      n.floating.active.y = true;

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
      anim.sequenced({
        sequence: this.nucleotides,
        timeBetween: 250,
        delay: 500,
        onStep: (resolve, n, index) => {
          const position = new PIXI.Point(
            index * width * 0.8,
            crisprUtil.approximate(0, height * 0.05)
          );
          this._activateChildEntity(
            anim.move(
              n.position,
              n.position.clone(),
              position,
              1000,
              easing.easeOutCubic,
              resolve
            )
          );
        },
      });
    }
  }

  _setup() {
    this.container.interactive = true;

    this._on(this.container, "pointerup", () => {
      this._entityConfig.level.sequenceManager.emit("click", this);
    });

    if (this.level.options.variant === "long") {
      this._initNucleotides();
    } else {
      const id = "sequenceInjection:" + Math.random();
      this.level.disablingAnimations.add(id);
      this._activateChildEntity(
        new entity.EntitySequence([
          this._initVirus(),
          new entity.FunctionCallEntity(() => {
            this.level.disablingAnimations.delete(id);
          }),
        ])
      );
    }

    this._entityConfig.container.addChild(this.container);
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
    this.container = null;
    this.nucleotides = [];
  }

  down(addScore: boolean, callback?: () => any) {
    const isLong = this.level.options.variant === "long";
    const fully = this.nucleotides.every((n) => n.state === "inactive");
    anim.sequenced({
      sequence: this.nucleotides,
      timeBetween: isLong ? 80 : 200,
      onStep: (resolve, n, i, all) => {
        n.shakes.removeShake("highlight");

        const baseShift = Math.round(Math.random() * 50) + 50;
        const promises: Promise<void>[] = [];

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

          promises.push(
            new Promise((_resolve) => {
              this._activateChildEntity(
                anim.textFade(
                  this.container,
                  crisprUtil.makeText(
                    `${score >= 0 ? "+" : "-"} ${String(score).replace(
                      "-",
                      ""
                    )}`,
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
                  score < 0 ? "down" : "up",
                  _resolve
                )
              );
            })
          );
        }

        promises.push(
          new Promise((_resolve) => {
            this._activateChildEntity(
              new entity.ParallelEntity([
                new tween.Tween({
                  from: n.position.x,
                  to: n.position.x + (all.length / 2) * 25 - i * 25,
                  duration: 1000,
                  onUpdate: (value) => {
                    n.position.x = value;
                  },
                }),
                new entity.FunctionCallEntity(() => {
                  n.sink(1000).then(_resolve);
                }),
              ])
            );
          })
        );

        Promise.all(promises).then(resolve);
      },
      callback: () => {
        const end = () => {
          this.level.sequenceManager.sequences.delete(this);
          this._transition = entity.makeTransition();
          callback?.();
        };
        if (this.virus) {
          this._activateChildEntity(
            new entity.EntitySequence([
              this.virus.leave(),
              new entity.FunctionCallEntity(end),
            ])
          );
        } else {
          end();
        }
      },
    });
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
