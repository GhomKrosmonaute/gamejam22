import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as crisprUtil from "../crisprUtil";

export type State = "idle" | "walk" | "stingIn" | "stingOut";
export type VirusType = "mini" | "medium" | "big";
export type VirusAnimation = "sting" | "idle" | "walk";

export const leftEdge = 25;
export const rightEdge = -25;

export class Virus extends entity.CompositeEntity {
  private _container = new PIXI.Container();
  private _animation: entity.AnimatedSpriteEntity;
  private _currentAnimationName: VirusAnimation;

  constructor(public readonly type: VirusType) {
    super();
  }

  get angle(): number {
    return this._container.angle;
  }

  set angle(value) {
    crisprUtil.positionAlongMembrane(this._container, value);
  }

  protected _setup() {
    // set starting angle
    this.angle = Math.random() < 0.5 ? leftEdge : rightEdge;

    // set starting animation to idle
    this.setAnimatedSprite("idle");

    // add to app container
    this._entityConfig.container.addChild(this._container);
  }

  protected _teardown() {
    this._entityConfig.container.removeChild(this._container);
  }

  moveTo(angle: number) {
    this.setAnimatedSprite("walk", true);
    if (angle > this.angle) this._animation.sprite.scale.x *= -1;
    return new tween.Tween({
      duration: crisprUtil.proportion(
        crisprUtil.dist1D(this.angle, angle),
        0,
        20,
        0,
        1000
      ),
      from: this.angle,
      to: angle,
      easing: easing.easeInOutQuart,
      onUpdate: (value) => {
        this.angle = value;
      },
      onTeardown: () => this.emit("moved"),
    });
  }

  leave() {
    return this.moveTo(this.angle < 0 ? rightEdge : leftEdge);
  }

  /**
   * place virus in position for inject sequence
   */
  stingIn() {
    this.setAnimatedSprite("sting", false);
    return new entity.EntitySequence([
      new entity.FunctionalEntity({
        requestTransition: () =>
          this._animation.sprite.currentFrame >=
          this._animation.sprite.totalFrames * 0.5,
      }),
      new entity.FunctionCallEntity(() => {
        this._animation.sprite.stop();
        this.emit("stungIn");
      }),
    ]);
  }

  /**
   * finish sting animation after sequence is deployed
   */
  stingOut() {
    if (this._currentAnimationName !== "sting") {
      throw new Error("stingIn must be called before stingOut.");
    }
    this._animation.sprite.play();
    return new entity.EntitySequence([
      new entity.FunctionalEntity({
        requestTransition: () =>
          this._animation.sprite.currentFrame ===
          this._animation.sprite.totalFrames,
      }),
      new entity.FunctionCallEntity(() => {
        this.setAnimatedSprite("idle");
      }),
    ]);
  }

  setAnimatedSprite(animationName: VirusAnimation, loop = true) {
    if (this._currentAnimationName === animationName) return;

    if (this._animation && this._animation.isSetup)
      this._deactivateChildEntity(this._animation);

    this._currentAnimationName = animationName;

    this._animation = util.makeAnimatedSprite(
      this._entityConfig.app.loader.resources[
        `images/${this.type}_bob_${animationName}.json`
      ]
    );

    this._activateChildEntity(
      this._animation,
      entity.extendConfig({
        container: this._container,
      })
    );

    this._animation.sprite.animationSpeed = 25 / 60;
    this._animation.sprite.scale.set(0.12);
    this._animation.sprite.anchor.set(0.5, 1);
    this._animation.sprite.loop = loop;
    this._animation.sprite.play();
  }
}
