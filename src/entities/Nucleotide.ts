import * as PIXI from "pixi.js";
import * as geom from "booyah/src/geom";
import * as entity from "booyah/src/entity";
import * as utils from "../utils";
import * as game from "../game";

export default class Nucleotide extends entity.Entity {
  public colorName: utils.ColorName;
  public graphics = new PIXI.Graphics();
  public angle: number;
  public stage = 1;
  public state: utils.NucleotideState;
  public isHovered = false;
  public infected = false;

  constructor(
    public radius: number,
    public position: PIXI.Point,
    public index: number = 0
  ) {
    super();
  }

  _setup() {
    this.generate();
    this.entityConfig.container.addChild(this.graphics);
  }

  _teardown() {
    this.entityConfig.container.removeChild(this.graphics);
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

  get dist(): PIXI.Point {
    return new PIXI.Point(this.width * (3 / 4), this.height);
  }

  /** @param {number} cornerIndex - from 0 to 5, start on right corner */
  getCornerPosition(cornerIndex: number): PIXI.Point {
    const angle = geom.degreesToRadians(60 * cornerIndex);
    return new PIXI.Point(
      this.position.x + this.radius * Math.cos(angle),
      this.position.y + this.radius * Math.sin(angle)
    );
  }

  getRelativeHeight(pivotY: number): number {
    return (pivotY - game.height * 0.125) * -(1 - 0.1 * this.stage);
  }

  generate() {
    this.state = "none";
    this.colorName = utils.getRandomColorName();
  }

  refresh(pivot?: PIXI.Point) {
    if (pivot) {
      this.graphics.position.copyFrom(pivot);
      this.graphics.rotation = geom.degreesToRadians(this.angle);
      this.graphics
        .clear()
        .lineStyle()
        .beginFill(this.color)
        .drawPolygon(
          utils.hexagon(
            new PIXI.Point(0, this.getRelativeHeight(pivot.y)),
            this.radius
          )
        )
        .endFill();
    } else {
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
            new PIXI.Point(),
            this.isHovered ? this.radius * 0.97 : this.radius
          )
        )
        .endFill();

      this.graphics.position.copyFrom(this.position);
    }
  }

  static getNucleotideDimensions(radius: number) {
    const width = 2 * radius;
    const height = Math.sqrt(3) * radius;
    const dist = new PIXI.Point(width * (3 / 4), height);
    return { width, height, dist };
  }
}
