import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as anim from "../animation";
import * as crisprUtil from "../crisprUtil";

import { GlowFilter } from "@pixi/filter-glow";

const glowFilter = new GlowFilter();

export type State = "missing" | "present" | "infected" | "inactive";

/** Represent a nucleotide */
export default class Nucleotide extends entity.CompositeEntity {
  public type: crisprUtil.NucleotideType = "normal";
  public colorName: crisprUtil.ColorName = crisprUtil.getRandomColorName();
  public isHovered = false;
  public shakeAmount: number;

  public _container: PIXI.Container;

  private _state: State;
  private _isHighlighted: boolean;
  private nucleotideAnimation: PIXI.AnimatedSprite = null;
  private holeSprite: PIXI.Sprite = null;
  private infectionSprite: PIXI.Sprite = null;
  private _radius: number;
  private _shield = false;
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

  _setup() {
    this._state = "missing";
    this._isHighlighted = false;
    this.shakeAmount = 0;

    this._container = new PIXI.Container();
    this._container.rotation = this.rotation;
    this._container.position.copyFrom(this.position);
    this._refreshScale();

    this._entityConfig.container.addChild(this._container);
  }

  _update(frameInfo: entity.FrameInfo) {
    if (this.shakeAmount > 0) {
      const angle = Math.random() * 2 * Math.PI;
      this._container.position.x =
        this.position.x + this.shakeAmount * Math.cos(angle);
      this._container.position.y =
        this.position.y + this.shakeAmount * Math.sin(angle);
    } else {
      for (const vector in this.floating) {
        const v = vector as "x" | "y";
        if (this.floating[v]) {
          const cos = Math.cos(
            this.floatingShift[v] +
              frameInfo.timeSinceStart * this.floatingSpeed[v]
          );
          const add = cos * this.floatingAmplitude[v];
          this._container[v] = this.position[v] + add * 200;
        } else {
          this._container.position.x = this.position.x;
          this._container.position.y = this.position.y;
        }
      }
    }
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
  }

  get isHighlighted(): boolean {
    return this._isHighlighted;
  }
  set isHighlighted(isHighlighted: boolean) {
    if (!this.nucleotideAnimation) return;

    if (isHighlighted && !this._isHighlighted) {
      this.nucleotideAnimation.filters = [glowFilter];
    } else if (!isHighlighted && this._isHighlighted) {
      this.nucleotideAnimation.filters = [];
    }

    this._isHighlighted = isHighlighted;
  }

  get infected(): boolean {
    return this._state === "infected";
  }

  get shield(): boolean {
    return this._shield;
  }

  set shield(value: boolean) {
    if (value && this.type === "scissors") return;
    this._shield = value;
  }

  get sprite(): PIXI.Sprite | PIXI.AnimatedSprite {
    return this.holeSprite || this.infectionSprite || this.nucleotideAnimation;
  }

  async bubble(time: number) {
    return new Promise((resolve) => {
      this._activateChildEntity(
        anim.bubble(this.sprite, 1.3, time / 3, 5, resolve)
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

  get state(): State {
    return this._state;
  }
  set state(newState: State) {
    if (newState === this._state) return;

    if (newState === "missing") {
      // Remove previous graphics
      if (this.nucleotideAnimation) {
        this._container.removeChild(this.nucleotideAnimation);
        this.nucleotideAnimation = null;
      }
      if (this.infectionSprite) {
        this._container.removeChild(this.infectionSprite);
        this.infectionSprite = null;
      }

      // TODO: do animation

      this.holeSprite = new PIXI.Sprite(
        this._entityConfig.app.loader.resources["images/hole.png"].texture
      );
      this.holeSprite.anchor.set(0.5, 0.5);
      this._container.addChild(this.holeSprite);
    } else if (newState === "infected") {
      if (this.shield) {
        this.shield = false;
        return;
      }

      // Freeze animation
      this.nucleotideAnimation.stop();

      // Create mask
      const mask = new PIXI.Graphics();
      mask.beginFill(0x000001);
      mask.drawCircle(0, 0, this.fullRadius);
      mask.endFill();
      // this._container.addChild(mask);

      // Overlay infection
      const fullColorName = crisprUtil.fullColorNames[this.colorName];
      this.infectionSprite = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[
          `images/infection_${fullColorName}.png`
        ].texture
      );
      this.infectionSprite.anchor.set(0.5, 0.5);
      this.infectionSprite.visible = false;
      this._container.addChild(this.infectionSprite);

      // Make infection "grow"
      const radiusTween = new tween.Tween({
        from: 0,
        to: 1,
        easing: easing.linear,
      });
      this._on(radiusTween, "updatedValue", (value) => mask.scale.set(value));

      this._activateChildEntity(
        new entity.EntitySequence([
          // Briefly shake
          new entity.FunctionCallEntity(() => (this.shakeAmount = 5)),
          new entity.WaitingEntity(100),

          new entity.FunctionCallEntity(() => {
            this.shakeAmount = 0;

            this._container.addChild(mask);
            this.infectionSprite.mask = mask;
            this.infectionSprite.visible = true;
          }),

          radiusTween,

          // Remove mask and infection
          new entity.FunctionCallEntity(() => {
            this.infectionSprite.mask = null;
            this._container.removeChild(mask);

            this._container.removeChild(this.nucleotideAnimation);
            this.nucleotideAnimation = null;
          }),
        ])
      );
    } else if (newState === "inactive") {
      // Freeze animation and grey it out
      this.nucleotideAnimation.stop();
      this.nucleotideAnimation.tint = 0x333333;
    } else if (this._state === "missing") {
      // Remove hole sprite
      this._container.removeChild(this.holeSprite);
      this.holeSprite = null;

      // Create animated sprite
      this.nucleotideAnimation = this._createAnimatedSprite();
      this._container.addChildAt(this.nucleotideAnimation, 0);
      this._refreshScale();

      // Trigger "generation" animation
      const radiusTween = new tween.Tween({
        obj: this,
        property: "radius",
        from: 0,
        to: this.fullRadius,
        easing: easing.easeOutBounce,
      });
      this._activateChildEntity(radiusTween);
    } else if (this._state === "infected") {
      // Remove hole sprite
      this._container.removeChild(this.infectionSprite);
      this.infectionSprite = null;

      // Create animated sprite
      this.nucleotideAnimation = this._createAnimatedSprite();
      this._container.addChildAt(this.nucleotideAnimation, 0);
      this._refreshScale();
    }

    this._state = newState;
  }

  private _createAnimatedSprite(): PIXI.AnimatedSprite {
    let animatedSprite: PIXI.AnimatedSprite;
    if (this.type === "normal") {
      const fullColorName = crisprUtil.fullColorNames[this.colorName];
      animatedSprite = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources[
          `images/nucleotide_${fullColorName}.json`
        ]
      );
      animatedSprite.animationSpeed = 25 / 60;
      // Start on a random frame
      animatedSprite.gotoAndPlay(_.random(animatedSprite.totalFrames));
    } else if (this.type === "scissors") {
      animatedSprite = util.makeAnimatedSprite(
        this._entityConfig.app.loader.resources["images/scissors.json"]
      );
      animatedSprite.animationSpeed = 25 / 60;
      // Start on a random frame
      animatedSprite.gotoAndPlay(_.random(animatedSprite.totalFrames));
    } else {
      throw new Error("Unhandled type");
    }

    animatedSprite.anchor.set(0.5, 0.5);
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
    if (this._state === "inactive") {
      return "i";
    } else if (this._state === "missing") {
      return "m";
    } else {
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
