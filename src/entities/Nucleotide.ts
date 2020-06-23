import * as pixi from "pixi.js";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as utils from "../utils";

/** Represent a nucleotide */
export default class Nucleotide extends entity.Entity {
  public colorName: utils.ColorName;
  public state: utils.NucleotideState;
  public isHovered = false;
  public infected = false;
  public sprite: pixi.AnimatedSprite | pixi.Sprite = null;

  private floating = false;
  private floatingShift: number;

  constructor(
    public radius: number,
    public position = new pixi.Point(),
    public rotation = 0
  ) {
    super();
  }

  _setup() {
    this.generate();
  }

  _update(frameInfo: entity.FrameInfo) {
    if (this.floating) {
      const cos = Math.cos(
        this.floatingShift + frameInfo.timeSinceStart / 1000
      );
      this.sprite.y += cos / 15;
    }
  }

  _teardown() {
    if (this.sprite) this.entityConfig.container.removeChild(this.sprite);
  }

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
    if (this.sprite) this.entityConfig.container.removeChild(this.sprite);
    switch (this.state) {
      case "bonus":
        this.sprite = new pixi.Sprite(
          this.entityConfig.app.loader.resources["images/cut.png"].texture
        );
        break;
      case "cut":
        this.sprite = new pixi.Sprite(
          this.entityConfig.app.loader.resources["images/cut.png"].texture
        );
        break;
      case "hole":
        this.sprite = new pixi.Sprite(
          this.entityConfig.app.loader.resources["images/hole.png"].texture
        );
        break;
      default:
        this.sprite = util.makeAnimatedSprite(
          this.entityConfig.app.loader.resources[
            "images/nucleotide_" + this.colorName + ".json"
          ]
        );
        (this.sprite as pixi.AnimatedSprite).play();
    }

    this.sprite.rotation = this.rotation;
    this.sprite.position.copyFrom(this.position);
    this.sprite.anchor.set(0.5, 0.5);
    const scale = this.state === "cut" ? 0.74 : 0.9;
    this.sprite.width = this.width * scale;
    this.sprite.height = this.height * scale;
    this.entityConfig.container.addChild(this.sprite);
  }

  static getNucleotideDimensionsByRadius(radius: number) {
    const width = 2 * radius;
    const height = Math.sqrt(3) * radius;
    const dist = new pixi.Point(width * (3 / 4), height);
    return { width, height, dist };
  }
}
