import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as level from "../scenes/level";

import * as anim from "../animations";
import * as crispr from "../crispr";

export type NucleotideType = "clip" | "normal" | "portal" | "joker" | "hole";

export type NucleotideSignature = "x" | "c" | "" | "*" | " " | ColorName;

export interface NucleotideJSON {
  type: NucleotideType;
  active: boolean;
  color: string;
  crispyMultiplier: number;
  position: PIXI.IPointData;
}

// TODO: Use string enum here?
export type ColorName = "blue" | "red" | "green" | "yellow";
export const colorNames: ColorName[] = ["blue", "red", "green", "yellow"];
export function getRandomColorName(): ColorName {
  return colorNames[Math.floor(Math.random() * colorNames.length)];
}

const nucleotideRadius = {
  grid: crispr.width / 13.44,
  sequence: crispr.width * 0.04,
};

/**
 * Represent a nucleotide
 *
 * Emits:
 * - stateChanged( NucleotideState )
 */
export class Nucleotide extends entity.CompositeEntity {
  private _container = new PIXI.Container();
  private _shakeContainer = new PIXI.Container();
  private _backContainer = new PIXI.Container();
  private _middleContainer = new PIXI.Container();
  private _foreContainer = new PIXI.Container();

  private _type: NucleotideType = "normal";
  private _active = false;
  private _highlighted = false;
  private _crispyMultiplier = 1;
  private _radius: number;

  private _pathArrowAnimatedSpriteEntity: entity.AnimatedSpriteEntity;
  private _colorsAnimatedSpriteEntities: {
    [key in ColorName]: entity.AnimatedSpriteEntity;
  };
  private _portalAnimatedSpriteEntity: entity.AnimatedSpriteEntity;
  private _jokerAnimatedSpriteEntity: entity.AnimatedSpriteEntity;

  private _holeSprite: PIXI.Sprite;
  private _clipSprite: PIXI.Sprite;
  private _glowSprite: PIXI.Sprite;

  public readonly position = new PIXI.Point();

  public readonly floating = anim.makeFloatingOptions();
  public readonly shakes = new anim.ShakesManager(this._shakeContainer);

  constructor(
    public parent: "grid" | "sequence",
    position = new PIXI.Point(),
    public rotation = 0,
    public colorName: ColorName = getRandomColorName()
  ) {
    super();
    this.position.copyFrom(position);
    this._container.position.copyFrom(position);
    this._container.rotation = rotation;
    this._container.scale.set(0);
    this._radius = nucleotideRadius[parent];
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get pathArrowSprite(): PIXI.AnimatedSprite {
    return this._pathArrowAnimatedSpriteEntity.sprite;
  }

  get colorSprite(): PIXI.AnimatedSprite {
    return this._colorsAnimatedSpriteEntities[this.colorName].sprite;
  }

  get portalSprite(): PIXI.AnimatedSprite {
    return this._portalAnimatedSpriteEntity.sprite;
  }

  get jokerSprite(): PIXI.AnimatedSprite {
    return this._jokerAnimatedSpriteEntity.sprite;
  }

  get glowSprite(): PIXI.Sprite {
    return this._glowSprite;
  }

  get holeSprite(): PIXI.Sprite {
    return this._holeSprite;
  }

  get clipSprite(): PIXI.Sprite {
    return this._clipSprite;
  }

  get middleSprites() {
    return [
      this.colorSprite,
      this.jokerSprite,
      this.portalSprite,
      this.holeSprite,
      this.clipSprite,
    ];
  }

  get sprites(): (PIXI.AnimatedSprite | PIXI.Sprite)[] {
    return [this.pathArrowSprite, this.glowSprite, ...this.middleSprites];
  }

  switchMiddleSprite(target?: PIXI.Sprite | PIXI.AnimatedSprite) {
    this.middleSprites.forEach((sprite) => {
      sprite.visible = sprite === target;
    });
  }

  spriteSwitchAnimation(target?: PIXI.Sprite | PIXI.AnimatedSprite) {
    return new entity.EntitySequence([
      // todo: make an animation and switch sprite on top (on middle of animation)
      this.turn(false),
      new entity.FunctionCallEntity(() => this.switchMiddleSprite(target)),
      this.turn(true),
    ]);
  }

  _setup() {
    this.shakes.setFloat("floating", this.floating);

    // path arrow
    {
      this._pathArrowAnimatedSpriteEntity = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources["images/path_arrow.json"]
      );

      this.pathArrowSprite.loop = true;
      this.pathArrowSprite.visible = false;
      this.pathArrowSprite.anchor.set(0.5, 1);
      this.pathArrowSprite.animationSpeed = 0.4;

      this._activateChildEntity(
        this._pathArrowAnimatedSpriteEntity,
        entity.extendConfig({
          container: this._backContainer,
        })
      );
    }

    // color sprites
    {
      this._colorsAnimatedSpriteEntities = {
        blue: util.makeAnimatedSprite(
          this._entityConfig.app.loader.resources[`images/nucleotide_blue.json`]
        ),
        red: util.makeAnimatedSprite(
          this._entityConfig.app.loader.resources[`images/nucleotide_red.json`]
        ),
        green: util.makeAnimatedSprite(
          this._entityConfig.app.loader.resources[
            `images/nucleotide_green.json`
          ]
        ),
        yellow: util.makeAnimatedSprite(
          this._entityConfig.app.loader.resources[
            `images/nucleotide_yellow.json`
          ]
        ),
      };

      for (const color in this._colorsAnimatedSpriteEntities) {
        const e = this._colorsAnimatedSpriteEntities[color as ColorName];

        e.sprite.loop = true;
        e.sprite.anchor.set(0.5);
        e.sprite.visible = false;
        e.sprite.animationSpeed = 20 / 60;

        this._activateChildEntity(
          e,
          entity.extendConfig({
            container: this._middleContainer,
          })
        );
      }
    }

    // portal
    {
      this._portalAnimatedSpriteEntity = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources[`images/portal.json`]
      );

      this._portalAnimatedSpriteEntity.sprite.anchor.set(0.5);
      this._portalAnimatedSpriteEntity.sprite.loop = true;
      this._portalAnimatedSpriteEntity.sprite.visible = false;
      this._portalAnimatedSpriteEntity.sprite.animationSpeed = 20 / 60;

      this._activateChildEntity(
        this._portalAnimatedSpriteEntity,
        entity.extendConfig({
          container: this._middleContainer,
        })
      );
    }

    // joker
    {
      this._jokerAnimatedSpriteEntity = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources[`images/joker.json`]
      );

      this._jokerAnimatedSpriteEntity.sprite.anchor.set(0.5);
      this._jokerAnimatedSpriteEntity.sprite.loop = true;
      this._jokerAnimatedSpriteEntity.sprite.visible = false;
      this._jokerAnimatedSpriteEntity.sprite.animationSpeed = 20 / 60;

      this._activateChildEntity(
        this._jokerAnimatedSpriteEntity,
        entity.extendConfig({
          container: this._middleContainer,
        })
      );
    }

    // glow
    {
      this._glowSprite = crispr.sprite(
        this,
        `images/nucleotide_glow_${this.parent}.png`
      );
      this._glowSprite.anchor.set(0.5);
      this._glowSprite.alpha = 0.5;
      this._glowSprite.visible = false;
    }

    // hole
    {
      this._holeSprite = crispr.sprite(this, "images/hole.png");
      this._holeSprite.anchor.set(0.5);
      this._holeSprite.visible = false;
    }

    // clip
    {
      this._clipSprite = crispr.sprite(this, `images/clip_${this.parent}.png`);
      this._clipSprite.anchor.set(0.5);
      this._clipSprite.visible = false;
    }

    this._backContainer.addChild(this._glowSprite);
    this._middleContainer.addChild(this._holeSprite, this._clipSprite);
    this._shakeContainer.addChild(
      this._backContainer,
      this._middleContainer,
      this._foreContainer
    );

    this._container.addChild(this._shakeContainer);

    this._entityConfig.container.addChild(this._container);
  }

  _update() {
    this._container.position.copyFrom(this.position);
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
  }

  get highlighted(): boolean {
    return this._highlighted;
  }
  set highlighted(isHighlighted: boolean) {
    if (isHighlighted && !this._highlighted) {
      this.shakes.setShake("highlight", 2);
      this._shakeContainer.scale.set(this.scale + 0.2);
      this.glowSprite.visible = true;
    } else if (!isHighlighted && this._highlighted) {
      this.shakes.removeShake("highlight");
      this._shakeContainer.scale.set(this.scale);
      this.glowSprite.visible = false;
    }
    this._highlighted = isHighlighted;
  }

  get sprite(): PIXI.Sprite | PIXI.AnimatedSprite {
    switch (this._type) {
      case "hole":
        return this.holeSprite;
      case "clip":
        return this.clipSprite;
      case "joker":
        return this.jokerSprite;
      case "normal":
        return this.colorSprite;
      case "portal":
        return this.portalSprite;
    }
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

  get radius(): number {
    return this._radius;
  }

  get scale(): number {
    return (0.85 * this.width) / 136;
  }

  turn(value: boolean, duration = 500) {
    if (value === this._active)
      return new entity.FunctionCallEntity(() => null);

    this._active = value;

    return new tween.Tween({
      from: value ? 0 : 1,
      to: value ? 1 : 0,
      duration,
      easing: value ? easing.easeOutBack : easing.easeInBack,
      onUpdate: (value) => this._shakeContainer.scale.set(value),
    });
  }

  public set crispyMultiplier(n: number) {
    if (this.level.options.noCrispyBonus) n = 1;
    this._foreContainer.removeChildren();
    this._crispyMultiplier = n;
    if (n > 1 && n < 6)
      this._foreContainer.addChild(
        crispr.sprite(this, "images/nucleotide_gold_border.png", (it) => {
          it.anchor.set(0.5);
          it.scale.set(this._shakeContainer.scale.x);
        }),
        crispr.sprite(this, `images/crispy_x${n}.png`, (it) => {
          it.anchor.set(0.5, 0);
          it.scale.set(this._shakeContainer.scale.x);
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

  public refreshSprites(animated = false) {
    if (this._type === "normal" || this._type === "joker")
      this.setRandomCrispyMultiplier();
    else this.crispyMultiplier = 1;

    if (animated) return this.spriteSwitchAnimation(this.sprite);
  }

  toString(): NucleotideSignature {
    if (!this._active) return "x";
    if (this._type === "clip") return "c";
    if (this._type === "portal") return "";
    if (this._type === "joker") return "*";
    if (this._type === "hole") return " ";
    return this.colorName;
  }

  toJSON(): NucleotideJSON {
    return {
      type: this._type,
      active: this._active,
      color: this.colorName,
      crispyMultiplier: this.crispyMultiplier,
      position: {
        x: this.position.x,
        y: this.position.y,
      },
    };
  }

  static getNucleotideDimensionsByRadius(radius: number) {
    const width = 2 * radius;
    const height = Math.sqrt(3) * radius;
    const dist = new PIXI.Point(width * (3 / 4), height);
    return { width, height, dist };
  }
}
