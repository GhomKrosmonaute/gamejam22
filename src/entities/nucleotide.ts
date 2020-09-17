import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as anim from "../animations";
import * as level from "../scenes/level";

export type NucleotideState = "missing" | "present" | "infected" | "inactive";
export type NucleotideType = "scissors" | "bonus" | "normal";

export const nucleotideTypes: NucleotideType[] = [
  "scissors",
  "bonus",
  "normal",
];
export function getRandomNucleotideType(): NucleotideType {
  return nucleotideTypes[Math.floor(Math.random() * nucleotideTypes.length)];
}

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
  public colorName: ColorName = getRandomColorName();
  public isHovered = false;
  public isHearthBeatActive = false;
  public shakeAmounts: { [k: string]: number };
  //public pathBorders: PIXI.Sprite[] = [];
  public pathArrow: PIXI.TilingSprite;

  private _state: NucleotideState;
  private _isHighlighted: boolean;
  private _spriteEntity:
    | entity.AnimatedSpriteEntity
    | entity.SpriteEntity = null;
  private _infectionSpriteEntity: entity.SpriteEntity = null;
  private _highlightSprite: PIXI.Sprite = null;
  private _radius: number;

  private floating: { x: boolean; y: boolean } = { x: false, y: false };
  private floatingShift = new PIXI.Point();
  private floatingSpeed = new PIXI.Point();
  private floatingAmplitude = new PIXI.Point();

  constructor(
    public readonly fullRadius: number,
    public position = new PIXI.Point(),
    public rotation = 0
  ) {
    super();

    this._radius = fullRadius;
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  _setup() {
    this._state = "missing";
    this._isHighlighted = false;
    this.shakeAmounts = {};

    this._container = new PIXI.Container();
    this._container.rotation = this.rotation;
    this._container.position.copyFrom(this.position);
    this._refreshScale();

    this._entityConfig.container.addChild(this._container);

    this.pathArrow = new PIXI.TilingSprite(
      this._entityConfig.app.loader.resources["images/path_arrow.jpg"].texture,
      94,
      300
    );
    this.pathArrow.visible = false;
    this.pathArrow.scale.set(0.43);
    this.pathArrow.anchor.set(0.5, 1);
    this.pathArrow.position.copyFrom(this.position);

    // crisprUtil.NeighborIndexes.forEach((i) => {
    //   const pathBorder = new PIXI.Sprite(
    //     this._entityConfig.app.loader.resources[
    //       `images/path_border_${i}.png`
    //     ].texture
    //   )
    //   pathBorder.scale.set(1.1);
    //   pathBorder.anchor.set(0.5);
    //   pathBorder.visible = false;
    //   pathBorder.filters = [];
    //   this.pathBorders[i] = pathBorder
    //   this._container.addChildAt(this.pathBorders[i], 0);
    // });
  }

  _update(frameInfo: entity.FrameInfo) {
    this._container.position.copyFrom(this.position);
    this.pathArrow.position.copyFrom(this.position);

    // move floor arrow
    if (this.pathArrow.visible) {
      this.pathArrow.tilePosition.y -= 3;
    }

    // infected hearth beat animation
    if (this.infected && !this.isHearthBeatActive) {
      this.isHearthBeatActive = true;
      this._activateChildEntity(
        anim.hearthBeat(this.sprite, 400, 1.1, () => {
          setTimeout(() => {
            this.isHearthBeatActive = false;
          }, 1500 + Math.random() * 1000);
        })
      );
    }

    // shakes animation
    const shakes = Object.values(this.shakeAmounts);
    const shake = Math.max(...shakes);
    if (shakes.length > 0 && shake) {
      const angle = Math.random() * 2 * Math.PI;
      this._container.position.x = this.position.x + shake * Math.cos(angle);
      this._container.position.y = this.position.y + shake * Math.sin(angle);
    } else {
      // floating animation
      for (const vector in this.floating) {
        const v = vector as "x" | "y";
        if (this.floating[v]) {
          const cos = Math.cos(
            this.floatingShift[v] +
              frameInfo.timeSinceStart * this.floatingSpeed[v]
          );
          const add = cos * this.floatingAmplitude[v];
          this._container[v] = this.position[v] + add * 200;
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
    if (!this._spriteEntity) return;

    if (isHighlighted && !this._isHighlighted) {
      this.shakeAmounts.highlight = 2;

      this._highlightSprite = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[
          "images/nucleotide_glow.png"
        ].texture
      );
      this._highlightSprite.anchor.set(0.5);
      this._highlightSprite.scale.set(1.3);
      this._container.addChildAt(this._highlightSprite, 0);
    } else if (!isHighlighted && this._isHighlighted) {
      delete this.shakeAmounts.highlight;

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

  get sprite(): PIXI.Sprite | PIXI.AnimatedSprite {
    return (this._spriteEntity || this._infectionSpriteEntity).sprite;
  }

  get infectionSprite(): PIXI.Sprite {
    return this._infectionSpriteEntity.sprite;
  }

  async bubble(duration: number) {
    return new Promise((resolve) => {
      this._activateChildEntity(
        anim.bubble(this.sprite, 1.3, duration, resolve)
      );
    });
  }

  async sink(duration: number) {
    return new Promise((resolve) => {
      this._activateChildEntity(
        new entity.ParallelEntity([
          anim.sink(this._highlightSprite, duration),
          anim.sink(this.sprite, duration, resolve),
        ])
      );
    });
  }

  setFloating(
    vector: "x" | "y",
    speed = 0.0005,
    amplitude = 0.06,
    shift = Math.random() * 10
  ) {
    this.floating[vector] = true;
    this.floatingShift[vector] = shift;
    this.floatingSpeed[vector] = speed;
    this.floatingAmplitude[vector] = amplitude;
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

  get state(): NucleotideState {
    return this._state;
  }
  set state(newState: NucleotideState) {
    if (newState === this._state) {
      this.emit("stateChanged", newState);
      return;
    }

    if (newState === "missing") {
      this._state = newState;
      delete this.shakeAmounts.infection;

      if (this._spriteEntity) this._deactivateChildEntity(this._spriteEntity);

      this.colorName = null;

      this._spriteEntity = new entity.SpriteEntity(
        new PIXI.Sprite(
          this._entityConfig.app.loader.resources["images/hole.png"].texture
        )
      );
      this.sprite.anchor.set(0.5);

      this._activateChildEntity(this._spriteEntity, {
        container: this._container,
      });
      this._activateChildEntity(
        anim.popup(this.sprite, () => {
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
      this._infectionSpriteEntity = new entity.SpriteEntity(
        new PIXI.Sprite(
          this._entityConfig.app.loader.resources[
            `images/infection_${this.fullColorName}.png`
          ].texture
        )
      );
      this.infectionSprite.anchor.set(0.5, 0.5);
      this.infectionSprite.visible = false;
      this._activateChildEntity(this._infectionSpriteEntity, {
        container: this._container,
      });

      // Make infection "grow"
      const radiusTween = new tween.Tween({
        from: 0,
        to: 1,
        easing: easing.easeOutCubic,
      });
      this._on(radiusTween, "updatedValue", (value) => mask.scale.set(value));

      this._activateChildEntity(
        new entity.EntitySequence([
          // Briefly shake
          new entity.FunctionCallEntity(
            () => (this.shakeAmounts.infection = 6)
          ),
          new entity.WaitingEntity(100),

          new entity.FunctionCallEntity(() => {
            // this.shakeAmounts.infection = 3;
            delete this.shakeAmounts.infection;

            this._container.addChild(mask);
            this.infectionSprite.mask = mask;
            this.infectionSprite.visible = true;
          }),

          radiusTween,

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
      this._activateChildEntity(this._spriteEntity, {
        container: this._container,
      });
      this._container.setChildIndex(this.sprite, 0);
      this._refreshScale();

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
      delete this.shakeAmounts.infection;

      if (this._infectionSpriteEntity)
        this._deactivateChildEntity(this._infectionSpriteEntity);

      // Create animated sprite
      this._spriteEntity = this._createAnimatedSprite();
      this._activateChildEntity(this._spriteEntity, {
        container: this._container,
      });
      this._container.setChildIndex(this.sprite, 0);
      this._refreshScale();

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
      this.generateColor();
      animatedSprite = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources[
          `images/nucleotide_${this.fullColorName}.json`
        ]
      );
      animatedSprite.sprite.animationSpeed = 25 / 60;
      // Start on a random frame
      animatedSprite.sprite.gotoAndPlay(
        _.random(animatedSprite.sprite.totalFrames)
      );
    } else if (this.type === "scissors") {
      this.colorName = null;
      animatedSprite = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources["images/scissors.json"]
      );
      animatedSprite.sprite.animationSpeed = 25 / 60;
      // Start on a random frame
      animatedSprite.sprite.gotoAndPlay(
        _.random(animatedSprite.sprite.totalFrames)
      );
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

    this._refreshScale();
  }

  private _refreshScale(): void {
    // Native sprite size is 136 x 129 px
    const scale = (0.85 * this.width) / 136;
    this._container.scale.set(scale);
  }
}
