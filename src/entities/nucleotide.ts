import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as level from "../scenes/level";

import * as anim from "../animations";
import * as crispr from "../crispr";

import * as path from "./path";

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

  public floating = anim.makeFloatingOptions();
  public position = new PIXI.Point();

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

  get pathArrow(): PIXI.AnimatedSprite {
    return this._pathArrowAnimatedSpriteEntity.sprite;
  }

  get colorSprite(): PIXI.AnimatedSprite {
    return this._colorsAnimatedSpriteEntities[this.colorName].sprite;
  }

  _setup() {
    // path arrow
    {
      this._pathArrowAnimatedSpriteEntity = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources["images/path_arrow.json"]
      );

      this.pathArrow.loop = true;
      this.pathArrow.visible = false;
      this.pathArrow.anchor.set(0.5, 1);
      this.pathArrow.animationSpeed = 0.4;

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
      this._glowSprite = crispr.sprite(this, "images/nucleotide_glow.png");
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
    if (!this.spriteEntity) return;

    if (isHighlighted && !this._highlighted) {
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
    } else if (!isHighlighted && this._highlighted) {
      this.shakes.removeShake("highlight");

      if (this.parent === "grid") {
        this.sprite.scale.set(1);
      } else {
        //this.sprite.scale.set(1.1);
      }

      this.container.removeChild(this._highlightSprite);
      this._highlightSprite = null;
    }

    this._highlighted = isHighlighted;
  }

  get sprite(): PIXI.Sprite | PIXI.AnimatedSprite {
    switch (this._type) {
      case "hole":
        return this._holeSprite;
      case "clip":
        return this._clipSprite;
      case "joker":
        return this._jokerAnimatedSpriteEntity.sprite;
      case "normal":
        return this.colorSprite;
      case "portal":
        return this._portalAnimatedSpriteEntity.sprite;
    }
  }

  async bubble(duration: number, onTop?: (nucleotide: Nucleotide) => any) {
    return new Promise((resolve) => {
      this._activateChildEntity(
        anim.bubble(this._shakeContainer, 1.3, duration, {
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

    const oldState = this._state;
    this._state = newState;

    if (newState === oldState) {
      this.emit("stateChanged", newState);
      return;
    }

    this.crispyMultiplier = 1;

    if (newState === "missing") {
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
    } else if (oldState === "missing") {
      if (this._spriteEntity?.isSetup)
        this._deactivateChildEntity(this._spriteEntity);

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

  public refreshSprite() {
    if (!/portal|clip|joker/.test(this.type)) this.setRandomCrispyMultiplier();
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
    } else if (this.type === "joker") {
      const spriteEntity = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources[`images/nucleotide_joker.json`]
      );
      spriteEntity.sprite.animationSpeed = 2;
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

  get radius(): number {
    return this._radius;
  }

  get scale(): number {
    return (0.85 * this.width) / 136;
  }
}
