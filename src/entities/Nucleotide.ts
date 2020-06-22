import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as utils from "../utils";

/** Represent a nucleotide */
export default class Nucleotide extends entity.AnimatedSpriteEntity {
  public colorName: utils.ColorName;
  public state: utils.NucleotideState;
  public isHovered = false;
  public infected = false;

  private floating = false;
  private floatingShift: number;

  constructor(public radius: number, public position = new pixi.Point()) {
    super(null);
  }

  _setup() {
    this.generate();
  }

  _update(frameInfo: entity.FrameInfo) {
    if (this.floating) {
      const cos = Math.cos(
        this.floatingShift + frameInfo.timeSinceStart / 2000
      );
      this.animatedSprite.y += cos / 20;
    }
  }

  _teardown() {}

  setFloating() {
    this.floating = true;
    this.floatingShift = Math.random() * 10;
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

  // todo: aura t-on besoin de conaitre la position absolue d'un coin d'hexagone un jour ?
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
    this.refresh();
  }

  refresh() {
    switch (this.state) {
      case "bonus":
        this.animatedSprite = null;
        break;
      case "cut":
        this.animatedSprite = new pixi.AnimatedSprite(
          this.entityConfig.app.loader.resources["images/cut.png"].texture
        );
        break;
      case "hole":
        this.animatedSprite = new pixi.AnimatedSprite(
          this.entityConfig.app.loader.resources["images/hole.png"].texture
        );
        break;
      default:
        this.animatedSprite = new pixi.AnimatedSprite(
          this.entityConfig.app.loader.resources[
            "images/nucleotide_" + this.colorName + ".json"
          ].texture
        );
    }

    this.animatedSprite.position.copyFrom(this.position);
  }

  static getNucleotideDimensionsByRadius(radius: number) {
    const width = 2 * radius;
    const height = Math.sqrt(3) * radius;
    const dist = new pixi.Point(width * (3 / 4), height);
    return { width, height, dist };
  }
}
