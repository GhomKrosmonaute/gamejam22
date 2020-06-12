import * as pixi from "pixi.js";
import Nucleotide from "./Nucleotide";
import Sequence from "./Sequence";
import * as utils from "../utils";

export default class SequenceNucleotide extends Nucleotide {
  constructor(public sequence: Sequence, matrixPosition: pixi.Point) {
    super(() => sequence.nucleotideRadius, matrixPosition);
  }

  _setup() {
    this.generate();
    this.render();
    this.container.addChild(this.graphics);
  }

  _teardown() {
    this.container.removeChild(this.graphics);
  }

  generate() {
    this.colorName = utils.getRandomColorName();
  }

  render() {
    this.graphics
      .clear()
      .beginFill(this.color)
      .drawPolygon(utils.hexagon(this.radius))
      .endFill();

    this.graphics.x = this.x + this.sequence.x;
    this.graphics.y = this.y + this.sequence.y;
  }
}
