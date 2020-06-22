import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as game from "../game";
import * as utils from "../utils";
import Sequence from "./Sequence";
import Path from "./Path";
import Nucleotide from "./Nucleotide";

export default class SequenceManager extends entity.ParallelEntity {
  public sequences: Sequence[] = [];
  public container: pixi.Container;

  _setup() {
    this.container = new pixi.Container();
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
    for (const s of this.sequences) {
      if (s.validate(signature)) this.removeEntity(s);
      else newSequences.push(s);
    }
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
      s.position.x = game.width / 2 - (s.length * width) / 2;
      s.position.y = utils.map(
        i,
        0,
        this.sequences.length,
        game.height * 0.25,
        game.height * 0.47
      );
      s.refresh();
    });
  }
}
