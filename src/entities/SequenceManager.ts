import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as entity from "booyah/src/entity";

import * as game from "../game";
import * as utils from "../utils";
import Sequence from "./Sequence";
import Path from "./Path";
import Nucleotide from "./Nucleotide";

/**
 * emits:
 * - crunch(s: Sequence)
 */
export default class SequenceManager extends entity.ParallelEntity {
  public sequences: Sequence[] = [];
  public container: PIXI.Container;

  _setup() {
    this.container = new PIXI.Container();
    this.entityConfig.container.addChild(this.container);
  }

  _update() {}

  _teardown() {
    this.sequences = [];
    this.entityConfig.container.removeChild(this.container);
    this.container = null;
  }

  private _getSequenceRangeY(): [number, number] {
    if (this.entityConfig.level.levelVariant === "continuous") {
      return [
        this.entityConfig.app.view.height * 0.2,
        this.entityConfig.app.view.height * 0.4,
      ];
    } else {
      return [
        this.entityConfig.app.view.height * 0.25,
        this.entityConfig.app.view.height * 0.42,
      ];
    }
  }

  add(length: number) {
    const s = new Sequence(length);
    const { width } = Nucleotide.getNucleotideDimensionsByRadius(
      s.nucleotideRadius
    );
    s.position.set(
      this.entityConfig.app.view.width / 2 - (s.baseLength * width * 0.8) / 2,
      this._getSequenceRangeY()[0]
    );
    this.addEntity(
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
    const signature = path.signature;
    const newSequences: Sequence[] = [];
    let crunched = false;
    for (const s of this.sequences) {
      if (s.validate(signature)) {
        this.removeEntity(s);
        crunched = true;
        this.emit("crunch", s);
      } else newSequences.push(s);
    }

    if (crunched) path.items.forEach((n) => (n.state = "missing"));

    if (newSequences.length !== this.sequences.length) {
      this.sequences = newSequences;
      this.refresh();
    }
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
      droppedSequences.forEach((s) => this.removeEntity(s));
      this.sequences = _.difference(this.sequences, droppedSequences);
    }

    return droppedSequences;
  }

  /** Drops the last @count sequences and returns them */
  dropSequences(count = 1): Sequence[] {
    const droppedSequences = _.last(this.sequences, count);

    droppedSequences.forEach((s) => this.removeEntity(s));
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
      s.position.y = utils.map(
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
    return (
      path.scissors.length > 0 &&
      path.last.type !== "scissors" &&
      this.sequences.some((s) => s.validate(path.signature))
    );
  }

  updateHighlighting(path: Path) {
    for (const s of this.sequences) {
      const highlight = SequenceManager.matches(
        path.nucleotides,
        s.nucleotides
      );
      if (SequenceManager.canMatch(path.nucleotides, s.nucleotides)) {
        for (const n of s.nucleotides)
          n.setFilter("glow", highlight.includes(n));
      } else {
        for (const n of s.nucleotides) n.setFilter("glow", false);
      }
    }
  }

  countSequences(): number {
    return this.sequences.length;
  }

  refresh(): void {
    this.sequences.forEach((s) => s.refresh());
  }

  static matches(tested: Nucleotide[], pattern: Nucleotide[]): Nucleotide[] {
    const left: Nucleotide[] = [],
      right: Nucleotide[] = [];

    let leftEnd = false,
      rightEnd = false;

    for (let i = 0; i < pattern.length; i++) {
      if (!tested[i]) break;

      if (!leftEnd) {
        if (tested[i].colorName === pattern[i].colorName) left.push(pattern[i]);
        else leftEnd = true;
      }

      if (!rightEnd) {
        if (tested[i].colorName === pattern[pattern.length - (i + 1)].colorName)
          right.push(pattern[pattern.length - (i + 1)]);
        else rightEnd = true;
      }
    }

    return left.length >= right.length ? left : right;
  }

  static canMatch(tested: Nucleotide[], pattern: Nucleotide[]): boolean {
    const reversedTested = tested.slice(0).reverse();
    const reversedPattern = pattern.slice(0).reverse();
    return (
      pattern.join(",").startsWith(tested.join(",")) ||
      pattern.join(",").startsWith(reversedTested.join(",")) ||
      pattern.join(",").endsWith(tested.join(",")) ||
      pattern.join(",").endsWith(reversedTested.join(",")) ||
      reversedPattern.join(",").endsWith(tested.join(",")) ||
      reversedPattern.join(",").endsWith(reversedTested.join(",")) ||
      reversedPattern.join(",").startsWith(tested.join(",")) ||
      reversedPattern.join(",").startsWith(reversedTested.join(","))
    );
  }
}
