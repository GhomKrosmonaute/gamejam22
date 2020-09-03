import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";

import * as game from "../game";
import * as crisprUtil from "../crisprUtil";
import Nucleotide from "./nucleotide";
import Path from "./path";
import * as _ from "underscore";

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

  _update() {}

  _teardown() {
    this.sequences = [];
    this._entityConfig.container.removeChild(this.container);
    this.container = null;
  }

  private _getSequenceRangeY(): [number, number] {
    if (this._entityConfig.level.levelVariant === "continuous") {
      return [
        this._entityConfig.app.view.height * 0.2,
        this._entityConfig.app.view.height * 0.4,
      ];
    } else if (this._entityConfig.level.levelVariant === "long") {
      return [
        this._entityConfig.app.view.height * 0.3,
        this._entityConfig.app.view.height * 0.3,
      ];
    } else {
      return [
        this._entityConfig.app.view.height * 0.25,
        this._entityConfig.app.view.height * 0.42,
      ];
    }
  }

  add(length: number) {
    const s = new Sequence(length);
    const { width } = Nucleotide.getNucleotideDimensionsByRadius(
      s.nucleotideRadius
    );
    s.position.set(
      this._entityConfig.app.view.width / 2 - (s.baseLength * width * 0.8) / 2,
      this._getSequenceRangeY()[0]
    );
    this._activateChildEntity(
      s,
      entity.extendConfig({
        container: this.container,
      })
    );
    this.sequences.push(s);
    this.refresh();
  }

  /** remove all validated sequences */
  crunch(path: Path) {
    if (!this.matchesSequence(path)) return;

    const signature = path.signature;
    const removedSequences: Sequence[] = [];
    for (const s of this.sequences) {
      if (this._entityConfig.level.levelVariant === "long") {
        if (s.validate(signature, "partial")) {
          s.deactivateSegment(path.signature);

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
        this._deactivateChildEntity(s);
        this.emit("crunch", s);
      }

      this.sequences = _.difference(this.sequences, removedSequences);
      this.refresh();
    }

    // if (crunched) path.items.forEach((n) => (n.state = "missing"));
  }

  removeSequence(s: Sequence) {
    this._deactivateChildEntity(s);
    this.sequences = this.sequences.filter((ss) => ss !== s);
    this.refresh();
  }

  /**
   * In the case that sequences fall continuously, makes them fall a bit.
   * Removes sequences that reached the bottom, and returns them.
   */
  advanceSequences(fraction: number): Sequence[] {
    const yDist = this._getSequenceRangeY()[1] - this._getSequenceRangeY()[0];

    const droppedSequences: Sequence[] = [];
    for (const s of this.sequences) {
      s.position.y += fraction * yDist;

      if (s.position.y >= this._getSequenceRangeY()[1]) {
        droppedSequences.push(s);
      } else {
        s.refresh();
      }
    }

    if (droppedSequences.length > 0) {
      droppedSequences.forEach((s) => this._deactivateChildEntity(s));
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
  distributeSequences(): void {
    this.sequences.forEach((s, i) => {
      const { width } = Nucleotide.getNucleotideDimensionsByRadius(
        s.nucleotideRadius
      );
      s.position.y = crisprUtil.mapProportion(
        i,
        0,
        this.sequences.length,
        this._getSequenceRangeY()[0],
        this._getSequenceRangeY()[1]
      );
      s.refresh();
    });
  }

  matchesSequence(path: Path): boolean {
    // TODO: perhaps this should only work if one and only one sequence matches?

    if (this._entityConfig.level.levelVariant === "long") {
      return (
        path.length > 2 &&
        this.sequences.some((s) => s.validate(path.signature, "partial"))
      );
    } else {
      return (
        path.correctlyContainsScissors() &&
        this.sequences.some((s) => s.validate(path.signature, "full"))
      );
    }
  }

  updateHighlighting(path: Path): void {
    const signature = path.signature;
    this.sequences.forEach((s) => s.highlightSegment(signature));
  }

  countSequences(): number {
    return this.sequences.length;
  }

  refresh(): void {
    this.sequences.forEach((s) => s.refresh());
  }
}

/** Represent a sequence dropped by virus */
export class Sequence extends entity.CompositeEntity {
  public nucleotides: Nucleotide[] = [];
  public container: PIXI.Container;
  public nucleotideRadius = game.width * 0.04;

  constructor(
    public readonly baseLength: number,
    public position = new PIXI.Point()
  ) {
    super();
  }

  _setup() {
    this.container = new PIXI.Container();
    this.container.interactive = true;
    this.container.position.copyFrom(this.position);
    this._entityConfig.container.addChild(this.container);
    this._on(this.container, "pointerup", () => this.emit("click"));
    const { width, height } = Nucleotide.getNucleotideDimensionsByRadius(
      this.nucleotideRadius
    );
    for (let i = 0; i < this.baseLength; i++) {
      const n = new Nucleotide(
        this.nucleotideRadius,
        new PIXI.Point(i * width * 0.8, crisprUtil.approximate(height * 0.05)),
        Math.random()
      );
      n.setFloating("y");
      this._activateChildEntity(
        n,
        entity.extendConfig({
          container: this.container,
        })
      );
      n.state = "present";
      this.nucleotides.push(n);
    }
    this.refresh();
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
    this.container = null;
    this.nucleotides = [];
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

  getMatchingSegment(signature: string): Nucleotide[] | null {
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
        -signature.length
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
