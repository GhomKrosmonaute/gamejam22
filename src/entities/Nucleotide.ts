import * as PIXI from "pixi.js";
import * as geom from "booyah/src/geom";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as utils from "../utils";

// const scissorsPercentage = 1 / 8;

/** Represent a nucleotide */
export default class Nucleotide extends entity.Entity {
  public state: utils.NucleotideState = "normal";
  public colorName: utils.ColorName = utils.getRandomColorName();

  public isHovered = false;
  public infected = false;
  public sprite: PIXI.AnimatedSprite | PIXI.Sprite = null;

  private floating = false;
  private floatingShift: number;

  constructor(
    public radius: number,
    public position = new PIXI.Point(),
    public rotation = 0
  ) {
    super();
  }

  _setup() {}

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

  get dist(): PIXI.Point {
    return new PIXI.Point(this.width * (3 / 4), this.height);
  }

  refresh() {
    if (this.sprite) this.entityConfig.container.removeChild(this.sprite);
    switch (this.state) {
      case "scissors":
        this.sprite = util.makeAnimatedSprite(
          this.entityConfig.app.loader.resources["images/scissors.json"]
        );
        (this.sprite as PIXI.AnimatedSprite).play();
        break;
      case "bonus":
        throw Error("not implemented");
      case "hole":
        this.sprite = new PIXI.Sprite(
          this.entityConfig.app.loader.resources["images/hole.png"].texture
        );
        break;
      default:
        this.sprite = util.makeAnimatedSprite(
          this.entityConfig.app.loader.resources[
            "images/nucleotide_" + this.colorName + ".json"
          ]
        );
        (this.sprite as PIXI.AnimatedSprite).play();
    }

    this.sprite.rotation = this.rotation;
    this.sprite.position.copyFrom(this.position);
    this.sprite.anchor.set(0.5, 0.5);
    const scale = this.state === "scissors" ? 0.74 : 0.9;
    this.sprite.width = this.width * scale;
    this.sprite.height = this.height * scale;
    this.entityConfig.container.addChild(this.sprite);
  }

  static getNucleotideDimensionsByRadius(radius: number) {
    const width = 2 * radius;
    const height = Math.sqrt(3) * radius;
    const dist = new PIXI.Point(width * (3 / 4), height);
    return { width, height, dist };
  }
}
