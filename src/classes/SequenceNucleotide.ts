import * as pixi from "pixi.js";
import * as game from "../game";
import * as utils from "../utils";
import Nucleotide from "./Nucleotide";
import Sequence from "./Sequence";

export default class SequenceNucleotide extends Nucleotide {
  public angle: number;
  public stage = 1;
  public fix = 0;

  constructor(public sequence: Sequence, public index: number) {
    super(() => sequence.nucleotideRadius);
  }

  _setup() {
    this.generate();
    this.step(0);
    this.container.addChild(this.graphics);
  }

  _teardown() {
    this.container.removeChild(this.graphics);
  }

  get y(): number {
    return (this.pivot.y - game.height * 0.125) * -(1 - 0.1 * this.stage);
  }

  get pivot(): pixi.Point {
    return this.sequence.pivot;
  }

  step(stepCount: number = 1) {
    this.index += stepCount;
    if (this.index > 8 * this.stage) {
      this.stage++;
    }
    if (this.stage > 4) this._teardown();
    else {
      this.calcAngle();
      this.render();
    }
  }

  calcAngle() {
    this.fix = 0;
    switch (this.stage) {
      case 2:
        this.fix = 10;
        break;
      case 3:
        this.fix = 7;
        break;
      case 4:
        this.fix = 6;
        break;
    }
    this.angle =
      utils.getAngle(
        new pixi.Point(0, this.y),
        new pixi.Point(this.width, this.y),
        this.pivot
      ) * this.index;
  }

  generate() {
    this.colorName = utils.getRandomColorName();
  }

  render() {
    this.graphics.position.copyFrom(this.pivot);
    this.graphics.rotation = this.angle;
    this.graphics
      .clear()
      .lineStyle()
      .beginFill(this.color)
      .drawPolygon(utils.hexagon(new pixi.Point(0, this.y), this.radius))
      .endFill();
  }
}
