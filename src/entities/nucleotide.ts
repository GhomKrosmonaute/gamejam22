import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as level from "../scenes/level";

import * as anim from "../animations";
import * as crispr from "../crispr";

export type NucleotideState = "missing" | "present" | "infected" | "inactive";
export type NucleotideType = "scissors" | "bonus" | "normal";

export const nucleotideTypes: NucleotideType[] = [
  "scissors",
  "bonus",
  "normal",
];

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
  public _container: PIXI.Container;
  public type: NucleotideType = "normal";
  public isHovered = false;
  public shakes: anim.ShakesManager;
  public position: PIXI.Point;
  public id = Math.random();

  private _state: NucleotideState;
  private _isHighlighted: boolean;
  private _spriteEntity:
    | entity.AnimatedSpriteEntity
    | entity.DisplayObjectEntity<PIXI.Sprite> = null;
  private _infectionSpriteEntity: entity.DisplayObjectEntity<PIXI.Sprite> = null;
  private _highlightSprite: PIXI.Sprite = null;
  private _pathArrowEntity: entity.AnimatedSpriteEntity;
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

  _setup() {
    this._state = "missing";
    this._isHighlighted = false;

    this._container = new PIXI.Container();
    this._container.rotation = this.rotation;
    this._container.position.copyFrom(this.position);

    this._container.scale.set(0);

    this.shakes = new anim.ShakesManager(this._container);
    this.shakes.setFloat("setup", this.floating);

    this._entityConfig.container.addChild(this._container);

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
    this._container.position.copyFrom(this.position);
    this.pathArrow.position.copyFrom(this.position);
    this.shakes.anchor.copyFrom(this.position);

    // coup coup
    if (
      this.type === "scissors" &&
      this.sprite &&
      this.sprite instanceof PIXI.AnimatedSprite
    ) {
      if (this.sprite.currentFrame >= this.sprite.totalFrames - 1) {
        this.sprite.gotoAndPlay(0);
        this.sprite.animationSpeed = 0;
      } else if (this.sprite.animationSpeed === 0) {
        if (Math.random() < 0.005) {
          this.sprite.gotoAndPlay(0);
          this.sprite.animationSpeed = 30 / 60;
        }
      }
    }
  }

  _teardown() {
    if (this._container.children.includes(this._highlightSprite))
      this._container.removeChild(this._highlightSprite);
    this._highlightSprite = null;
    this._entityConfig.container.removeChild(this._container);
  }

  get isHighlighted(): boolean {
    return this._isHighlighted;
  }
  set isHighlighted(isHighlighted: boolean) {
    if (!this.spriteEntity) return;

    if (isHighlighted && !this._isHighlighted) {
      this.shakes.setShake("highlight", 2);

      if (this.parent === "grid") {
        if (this.infected) {
          this.infectionSprite.scale.set(0.9);
        } else {
          this.sprite.scale.set(0.9);
        }
      } else {
        this.sprite.scale.set(1.1);
      }

      this._highlightSprite = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[
          this.parent === "grid"
            ? "images/nucleotide_bright.png"
            : "images/nucleotide_glow.png"
        ].texture
      );
      this._highlightSprite.anchor.set(0.5);
      this._highlightSprite.scale.set(1.3);
      this._container.addChildAt(this._highlightSprite, 0);
    } else if (!isHighlighted && this._isHighlighted) {
      this.shakes.removeShake("highlight");

      if (this.parent === "grid") {
        if (this.infected) {
          this.infectionSprite.scale.set(1);
        } else {
          this.sprite.scale.set(1);
        }
      } else {
        //this.sprite.scale.set(1.1);
      }

      this._container.removeChild(this._highlightSprite);
      this._highlightSprite = null;
    }

    this._isHighlighted = isHighlighted;
  }

  get fullColorName(): string {
    return fullColorNames[this.colorName] || "white";
  }

  get infected(): boolean {
    return this._state === "infected";
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

  get infectionSprite(): PIXI.Sprite {
    return this._infectionSpriteEntity.displayObject as PIXI.Sprite;
  }

  async bubble(duration: number, onTop?: (nucleotide: Nucleotide) => any) {
    return new Promise((resolve) => {
      this._activateChildEntity(
        anim.bubble(this._container, 1.3, duration, {
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

    if (newState === "missing") {
      if (this._state === "infected") {
        this._deactivateChildEntity(this._infectionSpriteEntity);
      }

      this._state = newState;
      this.shakes.removeShake("infection");

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
          container: this._container,
        })
      );
      this._activateChildEntity(
        anim.popup(this.sprite, 200, () => {
          this.emit("stateChanged", newState);
        })
      );
    } else if (newState === "infected") {
      // Freeze animation
      (this.sprite as PIXI.AnimatedSprite).stop();

      // Create mask
      const mask = new PIXI.Graphics();
      mask.beginFill(0x000001);
      mask.drawCircle(0, 0, this.fullRadius);
      mask.endFill();
      // this._container.addChild(mask);

      // Overlay infection
      this._infectionSpriteEntity = new entity.DisplayObjectEntity(
        new PIXI.Sprite(
          this._entityConfig.app.loader.resources[
            `images/infection_${this.fullColorName}.png`
          ].texture
        )
      );
      this.infectionSprite.anchor.set(0.5, 0.5);
      this.infectionSprite.visible = false;
      this._activateChildEntity(
        this._infectionSpriteEntity,
        entity.extendConfig({
          container: this._container,
        })
      );

      // Make infection "grow"

      this._activateChildEntity(
        new entity.EntitySequence([
          anim.tweenShaking(this._container, 150, 10, 3),

          new entity.FunctionCallEntity(() => {
            this.shakes.setShake("infection", 1);

            this._container.addChild(mask);
            this.infectionSprite.mask = mask;
            this.infectionSprite.visible = true;
          }),

          new tween.Tween({
            from: 0,
            to: 1,
            easing: easing.easeOutCubic,
            onUpdate: (value) => mask.scale.set(value),
          }),

          // Remove mask and infection
          new entity.FunctionCallEntity(() => {
            this.infectionSprite.mask = null;
            this._container.removeChild(mask);

            this._deactivateChildEntity(this._spriteEntity);
            this.emit("stateChanged", newState);
          }),
        ])
      );
    } else if (newState === "inactive") {
      // Freeze animation and grey it out
      const animation = this.sprite as PIXI.AnimatedSprite;

      animation.stop();
      animation.tint = 0x333333;

      this.emit("stateChanged", newState);
    } else if (this._state === "missing") {
      if (this._spriteEntity) this._deactivateChildEntity(this._spriteEntity);

      // Create animated sprite
      this._spriteEntity = this._createAnimatedSprite();
      this._activateChildEntity(
        this._spriteEntity,
        entity.extendConfig({
          container: this._container,
        })
      );
      this._container.setChildIndex(this.sprite, 0);

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
    } else if (this._state === "infected") {
      this.shakes.removeShake("infection");

      if (this._infectionSpriteEntity)
        this._deactivateChildEntity(this._infectionSpriteEntity);

      // Create animated sprite
      this._spriteEntity = this._createAnimatedSprite();
      this._activateChildEntity(
        this._spriteEntity,
        entity.extendConfig({
          container: this._container,
        })
      );
      this._container.setChildIndex(this.sprite, 0);

      this._activateChildEntity(this._refreshScale());

      this.emit("stateChanged", newState);
    }

    this._state = newState;
  }

  public generateColor() {
    this.colorName = getRandomColorName();
  }

  private _createAnimatedSprite(): entity.AnimatedSpriteEntity {
    let animatedSprite: entity.AnimatedSpriteEntity;
    if (this.type === "normal") {
      if (!this.colorName) this.generateColor();
      animatedSprite = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources[
          `images/nucleotide_${this.fullColorName}.json`
        ]
      );
      animatedSprite.sprite.animationSpeed = 25 / 60;
      // Start on a random frame
      animatedSprite.sprite.gotoAndPlay(
        Math.floor(Math.random() * animatedSprite.sprite.totalFrames)
      );
    } else if (this.type === "scissors") {
      this.colorName = null;
      animatedSprite = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources["images/scissors_mini.json"]
      );
      animatedSprite.sprite.loop = false;
      animatedSprite.sprite.animationSpeed = 0;
      // Start on a random frame
      animatedSprite.sprite.gotoAndStop(0);

      const bubble = crispr.sprite(this, "images/bubble.png");
      bubble.anchor.set(0.5);

      animatedSprite.sprite.addChild(bubble);
    } else {
      throw new Error("Unhandled type");
    }

    animatedSprite.sprite.anchor.set(0.5);
    //animatedSprite.interactive = true

    return animatedSprite;
  }

  static getNucleotideDimensionsByRadius(radius: number) {
    const width = 2 * radius;
    const height = Math.sqrt(3) * radius;
    const dist = new PIXI.Point(width * (3 / 4), height);
    return { width, height, dist };
  }

  toString(): string {
    switch (this._state) {
      case "inactive":
        return "i";
      case "missing":
        return "m";
      default:
        return this.colorName;
    }
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
          from: this._container.scale.x,
          to: scale,
          duration: 1000,
          easing: easing.easeInOutQuad,
          onUpdate: (value) => this._container.scale.set(value),
          onTeardown: () => {
            this.level.disablingAnimation(disablingAnimation, false);
          },
        }),
      ]);
    } else {
      return new entity.FunctionCallEntity(() => {
        this._container.scale.set(scale);
      });
    }
  }
}
