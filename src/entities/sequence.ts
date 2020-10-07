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
  public sequences: Sequence[] = [];
  public container: PIXI.Container;

  _setup() {
    this.container = new PIXI.Container();
    this._entityConfig.container.addChild(this.container);
  }

  _teardown() {
    this.sequences = [];
    this._entityConfig.container.removeChild(this.container);
    this.container = null;
  }

  private _getSequenceRangeY(): { top: number; bottom: number } {
    switch (this.level.levelVariant) {
      case "turnBased":
        return {
          top: this._entityConfig.app.view.height * 0.25,
          bottom: this._entityConfig.app.view.height * 0.42,
        };
      case "continuous":
        return {
          top: this._entityConfig.app.view.height * 0.2,
          bottom: this._entityConfig.app.view.height * 0.38,
        };
      case "long":
        return {
          top: this._entityConfig.app.view.height * 0.3,
          bottom: this._entityConfig.app.view.height * 0.3,
        };
    }
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get sequenceCountLimit(): number {
    switch (this.level.levelVariant) {
      case "turnBased":
        return 3;
      case "continuous":
      case "long":
        return 1;
    }
  }

  private _pickSequenceLength(): number {
    switch (this.level.levelVariant) {
      case "turnBased":
        return crisprUtil.random(4, 7);
      case "continuous":
        return crisprUtil.random(3, 4);
      case "long":
        return 13;
    }
  }

  addSequenceAccordingToLevelVariant(length?: number) {
    this.add(length);

    switch (this.level.levelVariant) {
      case "continuous":
        this.distributeSequences();
        break;
      case "long":
        this.distributeSequences();
        break;
      case "turnBased":
        this.distributeSequences();
        break;
    }
  }

  add(length?: number) {
    length = length ?? this._pickSequenceLength();
    const sequence = new Sequence(length);
    const { width } = nucleotide.Nucleotide.getNucleotideDimensionsByRadius(
      sequence.nucleotideRadius
    );
    sequence.position.set(
      this._entityConfig.app.view.width / 2 -
        (sequence.baseLength * width * 0.8) / 2,
      this._getSequenceRangeY().top
    );
    this._activateChildEntity(
      sequence,
      entity.extendConfig({
        container: this.container,
      })
    );
    this.sequences.push(sequence);
    this.refresh();
  }

  /** remove all validated sequences */
  crunch(_path: path.Path, callback?: () => any) {
    const finish: Promise<void>[] = [];

    if (this.matchesSequence(_path) !== true) return;

    const signature = _path.signature;
    const removedSequences: Sequence[] = [];
    for (const s of this.sequences) {
      if (this._entityConfig.level.levelVariant === "long") {
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

      this.sequences = _.difference(this.sequences, removedSequences);
      this.refresh();
    }

    // if (crunched) path.items.forEach((n) => (n.state = "missing"));

    Promise.all(finish).then(callback);
  }

  removeSequence(addScore: boolean, s: Sequence, callback?: () => any) {
    s.down(addScore, () => {
      this._deactivateChildEntity(s);
      this.sequences = this.sequences.filter((ss) => ss !== s);
      this.refresh();
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
      s.position.y += fraction * yDist;

      if (s.position.y >= this._getSequenceRangeY().bottom) {
        droppedSequences.push(s);
      } else {
        s.refresh();
      }
    }

    if (droppedSequences.length > 0) {
      droppedSequences.forEach((s, i) => {
        this.level.disablingAnimations.add(`dropSequence-${i}`);
        s.nucleotides.forEach((n) => (n.sprite.tint = 0x000000));
        s.down(false, () => {
          this._deactivateChildEntity(s);
          this.level.disablingAnimations.delete(`dropSequence-${i}`);
        });
      });
      this.sequences = _.difference(this.sequences, droppedSequences);
    }

    return droppedSequences;
  }

  /** Drops the last @count sequences and returns them */
  dropSequences(count = 1): Sequence[] {
    const droppedSequences = _.last(this.sequences, count);

    droppedSequences.forEach((s) => this._deactivateChildEntity(s));
    this.sequences = _.difference(this.sequences, droppedSequences);

    return droppedSequences;
  }

  /**
   * In the case that sequences are layed out, distributes them evenly
   */
  distributeSequences() {
    this.sequences.map((s, i) => {
      s.position.y = crisprUtil.proportion(
        i,
        0,
        this.sequences.length,
        this._getSequenceRangeY().top,
        this._getSequenceRangeY().bottom
      );
      s.refresh();
    });
  }

  matchesSequence(_path: path.Path): string | true {
    // TODO: perhaps this should only work if one and only one sequence matches?

    if (this._entityConfig.level.levelVariant === "long") {
      return (
        (_path.length > 2 &&
          this.sequences.some((s) => s.validate(_path.signature, "partial"))) ||
        "NO\nMATCH"
      );
    } else {
      if (!this.sequences.some((s) => s.validate(_path.signature, "full"))) {
        return "NO\nMATCH";
      }
      if (!_path.correctlyContainsScissors()) return "MISSING\nSCISSORS";
      return true;
    }
  }

  updateHighlighting(_path: path.Path): void {
    const signature = _path.signature;
    this.sequences.forEach((s) => s.highlightSegment(signature));
  }

  get countSequences(): number {
    return this.sequences.length;
  }

  refresh(): void {
    this.sequences.forEach((s) => s.refresh());
  }
}

/**
 * Represent a sequence dropped by virus
 */
export class Sequence extends entity.CompositeEntity {
  public nucleotideRadius = crisprUtil.width * 0.04;
  public nucleotides: nucleotide.Nucleotide[] = [];
  public container: PIXI.Container;
  public virus?: virus.Virus;

  constructor(
    public readonly baseLength: number,
    public position = new PIXI.Point()
  ) {
    super();
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
      this.virus.moveTo(
        crisprUtil.random(virus.rightEdge * 0.5, virus.leftEdge * 0.5)
      ),
      new entity.FunctionCallEntity(() => this._initNucleotides()),
      this.virus.stingIn(),
      new entity.WaitingEntity(1000),
      this.virus.stingOut(),
    ]);
  }

  _initNucleotides() {
    const {
      width,
      height,
    } = nucleotide.Nucleotide.getNucleotideDimensionsByRadius(
      this.nucleotideRadius
    );

    for (let i = 0; i < this.baseLength; i++) {
      const position = new PIXI.Point(
        i * width * 0.8,
        crisprUtil.approximate(height * 0.05)
      );

      const n = new nucleotide.Nucleotide(
        this.nucleotideRadius,
        "sequence",
        position,
        Math.random()
      );

      if (this.virus) {
        crisprUtil.positionAlongMembrane(n.position, this.virus.angle);
        n.position.x -= this.container.x;
        n.position.y -= this.container.y;
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
            crisprUtil.approximate(height * 0.05)
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

    this.refresh();

    callback();
  }

  _setup() {
    this.container = new PIXI.Container();
    this.container.interactive = true;
    this.container.position.copyFrom(this.position);

    this._on(this.container, "pointerup", () => {
      this._entityConfig.level.sequenceManager.emit("click", this);
    });

    if (this.level.levelVariant === "long") {
      this._initNucleotides();
    } else {
      this._activateChildEntity(this._initVirus());
    }

    this._entityConfig.container.addChild(this.container);
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
    this.container = null;
    this.nucleotides = [];
  }

  down(addScore: boolean, callback?: () => any) {
    const isLong = this.level.levelVariant === "long";
    const fully = this.nucleotides.every((n) => n.state === "inactive");
    anim.sequenced({
      sequence: this.nucleotides,
      timeBetween: isLong ? 80 : 200,
      onStep: (resolve, n, i, all) => {
        n.shakes.removeShake("highlight");

        const baseShift = Math.round(Math.random() * 50) + 50;
        const promises: Promise<void>[] = [];

        let score = this.level.baseScore;

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
          this.level.sequenceManager.sequences = this.level.sequenceManager.sequences.filter(
            (s) => s !== this
          );
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

  refresh() {
    this.container.position.copyFrom(this.position);
  }

  toString(): string {
    return this.nucleotides.map((n) => n.toString()).join("");
  }
}
