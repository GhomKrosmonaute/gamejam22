import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as level from "../scenes/level";

import * as anim from "../animations";
import * as crispr from "../crispr";

export enum NucleotideSignatures {
  portal = "",
  clip = "c",
  random = "?",
  joker = "*",
  hole = " ",
  inactive = "x",
  blue = "b",
  red = "r",
  green = "g",
  yellow = "y",
}

export type NucleotideParent = "grid" | "sequence";
export type NucleotideType = "clip" | "normal" | "portal" | "joker" | "hole";

export enum NucleotideTypeSprite {
  clip = "clipSprite",
  normal = "colorSprite",
  portal = "portalSprite",
  joker = "jokerSprite",
  hole = "holeSprite",
}

export interface NucleotideInformation {
  type: NucleotideType;
  color: NucleotideColor;
  active: boolean;
}

export interface NucleotideJSON {
  type: NucleotideType;
  active: boolean;
  color: string;
  crispyMultiplier: number;
  position?: PIXI.IPointData;
}

export enum NucleotideColorLetters {
  blue = "b",
  red = "r",
  green = "g",
  yellow = "y",
}

export type NucleotideColor = keyof typeof NucleotideColorLetters;
export const nucleotideColors: NucleotideColor[] = [
  "blue",
  "red",
  "green",
  "yellow",
];

export const nucleotideRadius = {
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
  public container = new PIXI.Container();
  public shakeContainer = new PIXI.Container();
  public backContainer = new PIXI.Container();
  public middleContainer = new PIXI.Container();
  public foreContainer = new PIXI.Container();

  public type: NucleotideType = "normal";
  public color: NucleotideColor;

  private _active = false;
  private _highlighted = false;
  private _crispyMultiplier = 1;

  private _pathArrowAnimatedSpriteEntity: entity.AnimatedSpriteEntity;
  private _colorsAnimatedSpriteEntities: {
    [key in NucleotideColor]: entity.AnimatedSpriteEntity;
  };
  private _portalAnimatedSpriteEntity: entity.AnimatedSpriteEntity;
  private _jokerAnimatedSpriteEntity: entity.AnimatedSpriteEntity;

  private _holeSprite: PIXI.Sprite;
  private _clipSprite: PIXI.Sprite;
  private _glowSprite: PIXI.Sprite;

  public shakes: anim.ShakesManager;

  public readonly position = new PIXI.Point();
  public readonly floating = anim.makeFloatingOptions();
  public readonly radius: number;
  public readonly parent: NucleotideParent;

  constructor(config: {
    parent: NucleotideParent;
    position?: PIXI.Point;
    rotation?: number;
    type?: NucleotideType;
    color?: NucleotideColor;
  }) {
    super();

    const position = config.position ?? new PIXI.Point();

    this.position.copyFrom(position);

    this.container.position.copyFrom(position);
    this.container.rotation = config.rotation ?? 0;
    this.container.scale.set(0);

    this.shakes = new anim.ShakesManager(this.shakeContainer);

    this.radius = nucleotideRadius[config.parent];
    this.parent = config.parent;

    this.type = config.type ?? "normal";
    this.color = config.color ?? Nucleotide.getRandomColor();

    this.floating.active.x = true;
    this.floating.active.y = true;
    this.floating.speed.set(1.4, 2);
    this.floating.amplitude.set(0.3, 0.3);
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get active(): boolean {
    return this._active;
  }

  get colorLetter(): NucleotideColorLetters {
    return NucleotideColorLetters[this.color];
  }

  get pathArrowSprite(): PIXI.AnimatedSprite {
    return this._pathArrowAnimatedSpriteEntity.sprite;
  }

  get colorSprite(): PIXI.AnimatedSprite {
    return this._colorsAnimatedSpriteEntities[this.color].sprite;
  }

  get colorSprites(): PIXI.AnimatedSprite[] {
    return Object.values(this._colorsAnimatedSpriteEntities).map(
      (e) => e.sprite
    );
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
      ...this.colorSprites,
      this.jokerSprite,
      this.portalSprite,
      this.holeSprite,
      this.clipSprite,
    ];
  }

  get foreSprites() {
    return this.foreContainer.children as (PIXI.AnimatedSprite | PIXI.Sprite)[];
  }

  get sprites(): PIXI.Container[] {
    return [
      this.pathArrowSprite,
      this.glowSprite,
      ...this.middleSprites,
      ...this.foreSprites,
    ];
  }

  get sprite(): PIXI.Sprite | PIXI.AnimatedSprite {
    return this.getSpriteByType(this.type);
  }

  getSpriteByType(type?: keyof typeof NucleotideTypeSprite) {
    return this[NucleotideTypeSprite[type]];
  }

  switchType(type?: keyof typeof NucleotideTypeSprite) {
    this.type = type;
    this.middleSprites.forEach((sprite) => {
      sprite.visible = false;
    });

    if (this.parent === "grid" && (type === "normal" || type === "joker"))
      this.setRandomCrispyMultiplier();
    else this.crispyMultiplier = 1;

    this.getSpriteByType(type).visible = true;
  }

  switchTypeAnimation(
    type?: keyof typeof NucleotideTypeSprite,
    callback?: () => unknown
  ) {
    return new entity.EntitySequence([
      this.turnAnimation(false),
      new entity.FunctionCallEntity(() => {
        this.switchType(type);
        callback?.();
      }),
      this.turnAnimation(true),
    ]);
  }

  _setup() {
    {
      this.shakes.setFloat("floating", this.floating);
      this._activateChildEntity(this.shakes);
    }

    // path arrow
    {
      this._pathArrowAnimatedSpriteEntity = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources["images/path_arrow.json"]
      );

      this.pathArrowSprite.loop = true;
      this.pathArrowSprite.visible = false;
      this.pathArrowSprite.anchor.set(0.5, 1);
      this.pathArrowSprite.scale.set(1.2);
      this.pathArrowSprite.animationSpeed = 0.4;

      this._activateChildEntity(
        this._pathArrowAnimatedSpriteEntity,
        entity.extendConfig({
          container: this.backContainer,
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
        const e = this._colorsAnimatedSpriteEntities[color as NucleotideColor];

        e.sprite.loop = true;
        e.sprite.anchor.set(0.5);
        e.sprite.visible = false;
        e.sprite.animationSpeed = 20 / 60;

        this._activateChildEntity(
          e,
          entity.extendConfig({
            container: this.middleContainer,
          })
        );
      }
    }

    // portal
    {
      this._portalAnimatedSpriteEntity = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources[`images/portal.json`]
      );

      this.portalSprite.anchor.set(0.5);
      this.portalSprite.loop = true;
      this.portalSprite.visible = false;
      this.portalSprite.animationSpeed = 20 / 60;

      this._activateChildEntity(
        this._portalAnimatedSpriteEntity,
        entity.extendConfig({
          container: this.middleContainer,
        })
      );
    }

    // joker
    {
      // this._jokerAnimatedSpriteEntity = util.makeAnimatedSprite(
      //   this._entityConfig.app.loader.resources[`images/joker.json`]
      // );

      this._jokerAnimatedSpriteEntity = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources[`images/nucleotide_blue.json`]
      );
      this._jokerAnimatedSpriteEntity.sprite.tint = 0xdc09ff;

      this.jokerSprite.anchor.set(0.5);
      this.jokerSprite.loop = true;
      this.jokerSprite.visible = false;
      this.jokerSprite.animationSpeed = 20 / 60;

      this._activateChildEntity(
        this._jokerAnimatedSpriteEntity,
        entity.extendConfig({
          container: this.middleContainer,
        })
      );
    }

    // glow
    {
      this._glowSprite = crispr.sprite(
        this,
        `images/nucleotide_glow_${this.parent}.png`
      );
      this.glowSprite.anchor.set(0.5);
      //this.glowSprite.alpha = 0.5;
      this.glowSprite.scale.set(1.1);
      this.glowSprite.visible = false;
    }

    // hole
    {
      this._holeSprite = crispr.sprite(this, "images/hole.png");
      this.holeSprite.anchor.set(0.5);
      this.holeSprite.visible = false;
    }

    // clip
    {
      this._clipSprite = crispr.sprite(this, `images/clip_${this.parent}.png`);
      this.clipSprite.anchor.set(0.5);
      this.clipSprite.visible = false;
    }

    // containers
    {
      this.backContainer.addChild(this._glowSprite);
      this.middleContainer.addChild(this._holeSprite, this._clipSprite);
      this.shakeContainer.addChild(
        this.backContainer,
        this.middleContainer,
        this.foreContainer
      );

      this.container.addChild(this.shakeContainer);
    }

    this._entityConfig.container.addChild(this.container);
  }

  _update() {
    //this.sprite?.scale.set(1);
    this.container.position.copyFrom(this.position);
    this.pathArrowSprite.position.copyFrom(this.position);
  }

  _teardown() {
    this._entityConfig.container.removeChild(this.container);
  }
  get highlighted(): boolean {
    return this._highlighted;
  }

  set highlighted(isHighlighted: boolean) {
    if (isHighlighted && !this._highlighted) {
      this.shakes.setShake("highlight", 2);
      this.shakeContainer.scale.set(1.05);
      this.glowSprite.visible = true;
    } else if (!isHighlighted && this._highlighted) {
      this.shakes.removeShake("highlight");
      this.shakeContainer.scale.set(1);
      this.glowSprite.visible = false;
    }
    this._highlighted = isHighlighted;
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

  get scale(): number {
    return (0.85 * this.width) / 136;
  }

  turnAnimation(value: boolean, duration = 500) {
    if (value === this._active && !value)
      return new entity.FunctionCallEntity(() => null);

    this.turn(value);

    return new tween.Tween({
      from: value ? 0 : this.scale,
      to: value ? this.scale : 0,
      duration,
      easing: value ? easing.easeOutBack : easing.easeInBack,
      onUpdate: (value) => this.container.scale.set(value),
    });
  }

  turn(value: boolean) {
    this._active = value;
  }

  public set crispyMultiplier(n: number) {
    if (this.level.options.noCrispyBonus) n = 1;
    this.foreContainer.removeChildren();
    this._crispyMultiplier = n;
    if (n > 1 && n < 6)
      this.foreContainer.addChild(
        crispr.sprite(this, "images/nucleotide_gold_border.png", (it) => {
          it.anchor.set(0.5);
          it.scale.set(this.shakeContainer.scale.x);
        }),
        crispr.sprite(this, `images/crispy_x${n}.png`, (it) => {
          it.anchor.set(0.5, 0);
          it.scale.set(this.shakeContainer.scale.x);
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

  toString(): NucleotideSignatures {
    if (!this._active) return NucleotideSignatures.inactive;
    if (this.type === "normal") return NucleotideSignatures[this.color];
    else return NucleotideSignatures[this.type];
  }

  toJSON(withoutPosition = false): NucleotideJSON {
    return {
      type: this.type,
      active: this._active,
      color: this.colorLetter,
      crispyMultiplier: this.crispyMultiplier,
      position: withoutPosition
        ? undefined
        : {
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

  static getRandomColor(): NucleotideColor {
    return nucleotideColors[
      Math.floor(Math.random() * nucleotideColors.length)
    ];
  }

  static fromSignature(signature: NucleotideSignatures): NucleotideInformation {
    const result: NucleotideInformation = {
      active: signature !== "x",
      type: "normal",
      color: "blue",
    };

    if (!result.active) return result;

    if (!/[rgby?]/.test(signature)) {
      switch (signature) {
        case " ":
          result.type = "hole";
          break;
        case "*":
          result.type = "joker";
          break;
        case "c":
          result.type = "clip";
          break;
        case "":
          result.type = "portal";
          break;
      }
    } else {
      result.type = "normal";
      switch (signature) {
        case "?":
          result.color = Nucleotide.getRandomColor();
          break;
        case "b":
          result.color = "blue";
          break;
        case "g":
          result.color = "green";
          break;
        case "r":
          result.color = "red";
          break;
        case "y":
          result.color = "yellow";
          break;
      }
    }

    return result;
  }
}
