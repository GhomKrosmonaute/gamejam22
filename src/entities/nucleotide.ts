import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as level from "../scenes/level";

import * as anim from "../animations";
import * as crispr from "../crispr";

import * as path from "./path";

export type NucleotideState = "missing" | "present" | "inactive";
export type NucleotideType = "clip" | "normal" | "portal";

// TODO: Use string enum here?
export type ColorName = "b" | "r" | "g" | "y";
export const colorNames: ColorName[] = ["b", "r", "g", "y"];
export function getRandomColorName(): ColorName {
  return colorNames[Math.floor(Math.random() * colorNames.length)];
}

export const fullColorNames: { [k in ColorName]: string } = {
  b: "blue",
  r: "red",
  g: "green",
  y: "yellow",
};

/**
 * Represent a nucleotide
 *
 * Emits:
 * - stateChanged( NucleotideState )
 */
export class Nucleotide extends entity.CompositeEntity {
  public container: PIXI.Container;
  public bonusContainer: PIXI.Container;
  public shakingContainer: PIXI.Container;
  public type: NucleotideType = "normal";
  public isHovered = false;
  public shakes: anim.ShakesManager;
  public position: PIXI.Point;
  public effect: (path: path.Path) => unknown;
  public id = Math.random();

  private _state: NucleotideState;
  private _glowColorSprite: PIXI.Sprite;
  private _isHighlighted: boolean;
  private _spriteEntity:
    | entity.AnimatedSpriteEntity
    | entity.DisplayObjectEntity<PIXI.Sprite> = null;
  private _infectionSpriteEntity: entity.DisplayObjectEntity<PIXI.Sprite> = null;
  private _highlightSprite: PIXI.Sprite = null;
  private _pathArrowEntity: entity.AnimatedSpriteEntity;
  private _crispyMultiplier = 1;
  private _radius: number;

  public floating = anim.makeFloatingOptions({});

  constructor(
    public readonly fullRadius: number,
    public parent: "grid" | "sequence",
    position = new PIXI.Point(),
    public rotation = 0,
    public colorName: ColorName = getRandomColorName()
  ) {
    super();

    this.position = position.clone();
    this._radius = fullRadius;
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get pathArrow(): PIXI.AnimatedSprite {
    return this._pathArrowEntity.sprite;
  }

  set glowColor(color: number | null) {
    this._glowColorSprite.visible = color !== null;
    this._glowColorSprite.tint = color;
  }

  get glowColor(): number | null {
    return this._glowColorSprite.visible ? this._glowColorSprite.tint : null;
  }

  _setup() {
    this._state = "missing";
    this._isHighlighted = false;

    this.shakingContainer = new PIXI.Container();
    this.shakingContainer.position.copyFrom(this.position);
    this.shakingContainer.scale.set(0);

    this.container = new PIXI.Container();
    this.container.rotation = this.rotation;

    this.bonusContainer = new PIXI.Container();

    this.shakes = new anim.ShakesManager(this.shakingContainer);
    this.shakes.setFloat("setup", this.floating);

    this._glowColorSprite = crispr.sprite(this, "images/nucleotide_glow.png");
    this._glowColorSprite.scale.set(0);
    this._glowColorSprite.anchor.set(0.5);
    this._glowColorSprite.position.x = this.position.x;
    this._glowColorSprite.position.y = -100;
    this._glowColorSprite.alpha = 0.5;
    this.glowColor = null;

    this.shakingContainer.addChild(
      this._glowColorSprite,
      this.container,
      this.bonusContainer
    );

    this._entityConfig.container.addChild(this.shakingContainer);

    this._pathArrowEntity = util.makeAnimatedSprite(
      this._entityConfig.app.loader.resources["images/path_arrow.json"]
    );
    this.pathArrow.loop = true;
    this.pathArrow.visible = false;
    this.pathArrow.anchor.set(0.5, 1);
    this.pathArrow.position.copyFrom(this.position);
    this.pathArrow.animationSpeed = 0.4;
    this.pathArrow.stop();

    this._activateChildEntity(this.shakes);
    this._activateChildEntity(this._pathArrowEntity);
    this._activateChildEntity(this._refreshScale());
  }

  _update() {
    this.shakingContainer.position.copyFrom(this.position);
    this.pathArrow.position.copyFrom(this.position);
    this.shakes.anchor.copyFrom(this.position);

    // coup' coup' !
    if (
      this.type === "clip" &&
      this.sprite &&
      this.sprite instanceof PIXI.AnimatedSprite
    ) {
      if (this.sprite.currentFrame >= this.sprite.totalFrames - 1) {
        this.sprite.animationSpeed = 0;
        this.sprite.gotoAndPlay(1);
      } else if (this.sprite.animationSpeed === 0) {
        if (Math.random() < 0.005) {
          this.sprite.gotoAndPlay(1);
          this.sprite.animationSpeed = 30 / 60;
        }
      }
    }
  }

  _teardown() {
    this.container.removeChildren();
    this._highlightSprite = null;
    this._entityConfig.container.removeChildren();
  }

  get isHighlighted(): boolean {
    return this._isHighlighted;
  }
  set isHighlighted(isHighlighted: boolean) {
    if (!this.spriteEntity) return;

    if (isHighlighted && !this._isHighlighted) {
      this.shakes.setShake("highlight", 2);

      if (this.parent === "grid") {
        this.sprite.scale.set(0.9);
      } else {
        this.sprite.scale.set(1.1);
      }

      this._highlightSprite = crispr.sprite(
        this,
        this.parent === "grid"
          ? "images/nucleotide_bright.png"
          : "images/nucleotide_glow.png"
      );

      this._highlightSprite.anchor.set(0.5);
      this._highlightSprite.scale.set(1.3);
      this.container.addChildAt(this._highlightSprite, 0);
    } else if (!isHighlighted && this._isHighlighted) {
      this.shakes.removeShake("highlight");

      if (this.parent === "grid") {
        this.sprite.scale.set(1);
      } else {
        //this.sprite.scale.set(1.1);
      }

      this.container.removeChild(this._highlightSprite);
      this._highlightSprite = null;
    }

    this._isHighlighted = isHighlighted;
  }

  get fullColorName(): string {
    return fullColorNames[this.colorName] || "white";
  }

  get spriteEntity():
    | entity.DisplayObjectEntity<PIXI.Sprite>
    | entity.AnimatedSpriteEntity {
    return this._spriteEntity || this._infectionSpriteEntity;
  }

  get sprite(): PIXI.Sprite | PIXI.AnimatedSprite {
    return this.spriteEntity instanceof entity.AnimatedSpriteEntity
      ? this.spriteEntity.sprite
      : this.spriteEntity.displayObject;
  }

  async bubble(duration: number, onTop?: (nucleotide: Nucleotide) => any) {
    return new Promise((resolve) => {
      this._activateChildEntity(
        anim.bubble(this.container, 1.3, duration, {
          onTeardown: resolve,
          onTop: () => {
            onTop?.(this);
          },
        })
      );
    });
  }

  async sink(duration: number) {
    return new Promise((resolve) => {
      this._activateChildEntity(
        new entity.ParallelEntity([
          this._highlightSprite
            ? anim.sink(this._highlightSprite, duration)
            : new entity.FunctionCallEntity(() => {}),
          anim.sink(this.sprite, duration, resolve),
        ])
      );
    });
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

  // todo convert state accessors into a changeState function that returns an EntitySequence
  get state(): NucleotideState {
    return this._state;
  }
  set state(newState: NucleotideState) {
    if (!this.isSetup) return;

    if (newState === this._state) {
      this.emit("stateChanged", newState);
      return;
    }

    this.crispyMultiplier = 1;

    if (newState === "missing") {
      this._state = newState;

      if (this.children.includes(this._spriteEntity)) {
        this._deactivateChildEntity(this._spriteEntity);
      }

      this.colorName = null;

      this._spriteEntity = new entity.DisplayObjectEntity(
        crispr.sprite(this, "images/hole.png")
      );
      this.sprite.anchor.set(0.5);

      this._activateChildEntity(
        this._spriteEntity,
        entity.extendConfig({
          container: this.container,
        })
      );
      this._activateChildEntity(
        anim.popup(this.sprite, 200, () => {
          this.emit("stateChanged", newState);
        })
      );
    } else if (newState === "inactive") {
      // Freeze animation and grey it out
      const animation = this.sprite as PIXI.Sprite;

      animation.tint = 0x333333;

      this.emit("stateChanged", newState);
    } else if (this._state === "missing") {
      if (this._spriteEntity) this._deactivateChildEntity(this._spriteEntity);

      // Create animated sprite
      this.refreshSprite();
      this._activateChildEntity(
        this._spriteEntity,
        entity.extendConfig({
          container: this.container,
        })
      );
      this.container.setChildIndex(this.sprite, 0);

      this._activateChildEntity(this._refreshScale());

      this.emit("stateChanged", newState);

      // Trigger "generation" animation
      const radiusTween = new tween.Tween({
        obj: this,
        property: "radius",
        from: 0,
        to: this.fullRadius,
        easing: easing.easeOutBounce,
        onTeardown: () => {
          this.emit("stateChanged", newState);
        },
      });
      this._activateChildEntity(radiusTween);
    }

    this._state = newState;
  }

  public generateColor() {
    this.colorName = getRandomColorName();
  }

  public set crispyMultiplier(n: number) {
    if (this.level.options.noCrispyBonus) n = 1;
    this.bonusContainer.removeChildren();
    this._crispyMultiplier = n;
    if (n > 1 && n < 6)
      this.bonusContainer.addChild(
        crispr.sprite(this, "images/nucleotide_gold_border.png", (it) => {
          it.anchor.set(0.5);
          it.scale.set(this.shakingContainer.scale.x);
        }),
        crispr.sprite(this, `images/crispy_x${n}.png`, (it) => {
          it.anchor.set(0.5, 0);
          it.scale.set(this.shakingContainer.scale.x);
        })
      );
  }

  public get crispyMultiplier(): number {
    return this._crispyMultiplier;
  }

  private setRandomCrispyMultiplier() {
    if (Math.random() < this.level.options.crispyBonusRate) {
      const rand = Math.random();
      if (rand < 0.025) this.crispyMultiplier = 5;
      else if (rand < 0.1) this.crispyMultiplier = 4;
      else if (rand < 0.25) this.crispyMultiplier = 3;
      else this.crispyMultiplier = 2;
    } else this.crispyMultiplier = 1;
  }

  private refreshSprite() {
    if (!/portal|clip/.test(this.type)) this.setRandomCrispyMultiplier();
    else this.crispyMultiplier = 1;

    if (this.type === "normal") {
      if (!this.colorName) this.generateColor();
      const spriteEntity = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources[
          `images/nucleotide_${this.fullColorName}.json`
        ]
      );
      spriteEntity.sprite.animationSpeed = 25 / 60;
      // Start on a random frame
      spriteEntity.sprite.gotoAndPlay(
        Math.floor(Math.random() * spriteEntity.sprite.totalFrames)
      );
      spriteEntity.sprite.anchor.set(0.5);
      this._spriteEntity = spriteEntity;
    } else if (this.type === "portal") {
      const spriteEntity = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources["images/portal.json"]
      );
      spriteEntity.sprite.animationSpeed = 15 / 60;
      // Start on a random frame
      spriteEntity.sprite.gotoAndPlay(
        Math.floor(Math.random() * spriteEntity.sprite.totalFrames)
      );
      spriteEntity.sprite.anchor.set(0.5);
      this._spriteEntity = spriteEntity;
    } else if (this.type === "clip") {
      this.colorName = null;
      const sprite = crispr.sprite(
        this,
        `images/clip_${this.parent === "grid" ? "bottom" : "top"}.png`
      );
      sprite.anchor.set(0.5);
      this._spriteEntity = new entity.DisplayObjectEntity(sprite);
    } else {
      throw new Error("Unhandled type");
    }
  }

  static getNucleotideDimensionsByRadius(radius: number) {
    const width = 2 * radius;
    const height = Math.sqrt(3) * radius;
    const dist = new PIXI.Point(width * (3 / 4), height);
    return { width, height, dist };
  }

  toString(): string {
    if (this.type === "clip") return "";
    switch (this._state) {
      case "inactive":
        return "i";
      case "missing":
        return "m";
      default:
        return this.colorName;
    }
  }

  toJSON() {
    return {
      type: this.type,
      state: this.state,
      color: this.fullColorName,
      crispyMultiplier: this.crispyMultiplier,
      position: {
        x: this.position.x,
        y: this.position.y,
      },
    };
  }

  get radius(): number {
    return this._radius;
  }
  set radius(radius: number) {
    this._radius = radius;

    this._activateChildEntity(this._refreshScale());
  }

  private _refreshScale(): entity.Entity {
    const disablingAnimation = "nucleotide._refreshScale" + this.id;

    if (this.level.disablingAnimations.has(disablingAnimation)) {
      return new entity.NullEntity();
    }

    // Native sprite size is 136 x 129 px
    const scale = (0.85 * this.width) / 136;

    if (this.parent === "sequence") {
      return new entity.EntitySequence([
        new entity.FunctionCallEntity(() => {
          this.level.disablingAnimation(disablingAnimation, true);
        }),
        new entity.WaitingEntity(400),
        new tween.Tween({
          from: this.shakingContainer.scale.x,
          to: scale,
          duration: 1000,
          easing: easing.easeInOutQuad,
          onUpdate: (value) => {
            this.shakingContainer.scale.set(value);
          },
          onTeardown: () => {
            this.level.disablingAnimation(disablingAnimation, false);
          },
        }),
      ]);
    } else {
      return new entity.FunctionCallEntity(() => {
        this.shakingContainer.scale.set(scale);
      });
    }
  }
}
