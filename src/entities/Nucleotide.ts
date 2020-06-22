import * as pixi from "pixi.js";
import * as geom from "booyah/src/geom";
import * as entity from "booyah/src/entity";
import * as easing from "booyah/src/easing";
import * as utils from "../utils";
import * as game from "../game";

/** Represent a nucleotide */
export default class Nucleotide extends entity.Entity {
  public colorName: utils.ColorName;
  public graphics = new pixi.Graphics();
  public state: utils.NucleotideState;
  public isHovered = false;
  public infected = false;

  private floating = false;
  private floatingShift: number;

  constructor(public radius: number, public position = new pixi.Point()) {
    super();
  }

  _setup() {
    this.generate();
    this.entityConfig.container.addChild(this.graphics);
  }

  _update(frameInfo: entity.FrameInfo) {
    if (this.floating) {
      const cos = Math.cos((this.floatingShift + frameInfo.timeSinceStart) / 3);
      this.graphics.y += cos;
    }
  }

  _teardown() {
    this.entityConfig.container.removeChild(this.graphics);
  }

  setFloating() {
    this.floating = true;
    this.floatingShift = Math.random() * 10;
  }

  get color(): number {
    return utils.getColorByName(this.colorName);
  }

  get width(): number {
    return 2 * this.radius;
  }

  get height(): number {
    return Math.sqrt(3) * this.radius;
  }

  get dist(): pixi.Point {
    return new pixi.Point(this.width * (3 / 4), this.height);
  }

  // /** @param {number} cornerIndex - from 0 to 5, start on right corner */
  // getCornerPosition(cornerIndex: number): pixi.Point {
  //   const angle = geom.degreesToRadians(60 * cornerIndex);
  //   return new pixi.Point(
  //     this.position.x + this.radius * Math.cos(angle),
  //     this.position.y + this.radius * Math.sin(angle)
  //   );
  // }

  generate() {
    this.state = "none";
    this.colorName = utils.getRandomColorName();
  }

  refresh() {
    this.graphics.clear();

    switch (this.state) {
      case "bonus":
        this.graphics.beginFill(0xff00ff);
        break;
      case "cut":
        this.graphics.beginFill(0x888888);
        break;
      case "hole":
        this.graphics.beginFill(0x333333);
        break;
      case "none":
        this.graphics.beginFill(this.color);
        break;
    }

    this.graphics
      .drawPolygon(
        utils.hexagon(
          new pixi.Point(),
          this.isHovered ? this.radius * 0.97 : this.radius
        )
      )
      .endFill();

    this.graphics.position.copyFrom(this.position);
  }

  static getNucleotideDimensionsByRadius(radius: number) {
    const width = 2 * radius;
    const height = Math.sqrt(3) * radius;
    const dist = new pixi.Point(width * (3 / 4), height);
    return { width, height, dist };
  }
}
