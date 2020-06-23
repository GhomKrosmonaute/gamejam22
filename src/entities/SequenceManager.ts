import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as game from "../game";
import * as utils from "../utils";
import Sequence from "./Sequence";
import Path from "./Path";
import Nucleotide from "./Nucleotide";

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
    return this.sequences.some((s) => s.validate(path.signature));
  }

  countSequences(): number {
    return this.sequences.length;
  }
}
