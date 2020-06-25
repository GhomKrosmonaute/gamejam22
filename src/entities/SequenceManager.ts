import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as game from "../game";
import * as utils from "../utils";
import Sequence from "./Sequence";
import Path from "./Path";
import Nucleotide from "./Nucleotide";

import { GlowFilter } from "@pixi/filter-glow";

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

  add(length: number) {
    const s = new Sequence(length);
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
      } else newSequences.push(s);
    }
    if (crunched) path.items.forEach((n) => (n.infected = false));
    if (newSequences.length !== this.sequences.length) {
      this.sequences = newSequences;
      this.refresh();
    }
  }

  refresh() {
    this.sequences.forEach((s, i) => {
      const { width } = Nucleotide.getNucleotideDimensionsByRadius(
        s.nucleotideRadius
      );
      s.position.x = game.width / 2 - (s.length * width * 0.8) / 2;
      s.position.y = utils.map(
        i,
        0,
        this.sequences.length,
        game.height * 0.25,
        game.height * 0.42
      );
      s.refresh();
    });
  }

  matchesSequence(path: Path): boolean {
    // TODO: perhaps this should only work if one and only one sequence matches?
    return (
      path.scissors.length > 0 &&
      path.last.state !== "scissors" &&
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
        for (const n of s.nucleotides) {
          if (highlight.includes(n)) n.sprite.filters = [new GlowFilter()];
          else n.sprite.filters = [];
        }
      } else {
        for (const n of s.nucleotides) n.sprite.filters = [];
      }
    }
  }

  countSequences(): number {
    return this.sequences.length;
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

    return left.length > right.length ? left : right;
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
