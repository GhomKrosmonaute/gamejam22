import * as geom from "booyah/src/geom";
import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as utils from "../utils";

export default class Nucleotide extends entity.Entity {
  public colorName: utils.ColorName;
  public graphics = new pixi.Graphics();

  constructor(
    private getRadius: () => number,
    public matrixPosition: pixi.Point = new pixi.Point()
  ) {
    super();
  }

  get container(): pixi.Container {
    return this.entityConfig.container;
  }

  get color(): number {
    return utils.getColorByName(this.colorName);
  }

  get evenCol(): boolean {
    return this.matrixPosition.x % 2 === 0;
  }

  get radius(): number {
    return this.getRadius();
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

  get x(): number {
    return this.width / 2 + this.matrixPosition.x * this.dist.x;
  }

  get y(): number {
    const height = this.height;
    return (
      this.matrixPosition.y * height -
      height / 2 +
      (this.evenCol ? height / 2 : 0) +
      height
    );
  }

  /** @param {number} cornerIndex - from 0 to 5, start on right corner */
  getCornerPosition(cornerIndex: number): pixi.Point {
    const angle = geom.degreesToRadians(60 * cornerIndex);
    return new pixi.Point(
      this.x + this.radius * Math.cos(angle),
      this.y + this.radius * Math.sin(angle)
    );
  }
}
