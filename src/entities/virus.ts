import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as crisprUtil from "../crisprUtil";

import * as level from "../scenes/level";

export type VirusType = "mini" | "medium" | "big";
export type VirusAnimation = "sting" | "idle" | "walk";

export const leftEdge = 25;
export const rightEdge = -25;

/**
 * Emits:
 * - stungIn
 * - stungOut
 * - terminatedAnimation
 */
export class Virus extends entity.CompositeEntity {
  private _container = new PIXI.Container();
  private _animation: entity.AnimatedSpriteEntity;
  private _previousAnimationName: VirusAnimation;

  constructor(public readonly type: VirusType) {
    super();
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get randomAngle(): number {
    return Math.random() < 0.5 ? leftEdge : rightEdge;
  }

  get angle(): number {
    return this._container.angle * -1;
  }

  set angle(value) {
    crisprUtil.positionAlongMembrane(this._container, value);
  }

  protected _setup() {
    // set starting angle
    do {
      this.angle = this.randomAngle;
    } while (
      this.level.sequenceManager.viruses.some((v) => {
        return v !== this && crisprUtil.dist(this.angle, v.angle) < 10;
      })
    );

    this._entityConfig.container.addChild(this._container);
  }

  protected _teardown() {
    this._entityConfig.container.removeChild(this._container);
  }

  moveTo(angle: number): entity.EntitySequence {
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        this.setAnimatedSprite("walk", true);
        if (angle > this.angle) this._animation.sprite.scale.x *= -1;
      }),
      new tween.Tween({
        duration: 1000,
        from: this.angle,
        to: angle,
        easing: easing.easeInOutQuad,
        onUpdate: (value) => {
          this.angle = value;
        },
      }),
    ]);
  }

  come(): entity.EntitySequence {
    return new entity.EntitySequence([
      this.moveTo(
        this.angle < 0
          ? crisprUtil.random(-2, rightEdge * 0.5)
          : crisprUtil.random(2, leftEdge * 0.5)
      ),
    ]);
  }

  leave(): entity.EntitySequence {
    return new entity.EntitySequence([
      this.moveTo(this.angle < 0 ? rightEdge : leftEdge),
      new entity.FunctionCallEntity(() => {
        this._transition = entity.makeTransition();
      }),
    ]);
  }

  kill(): entity.EntitySequence {
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        // todo: use death animation
      }),
      this.leave(),
    ]);
  }

  /**
   * place virus in position for inject sequence
   */
  stingIn(): entity.EntitySequence {
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        this.setAnimatedSprite("sting", false);
      }),
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
  stingOut(): entity.EntitySequence {
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        if (this._previousAnimationName !== "sting") {
          throw new Error("stingIn must be called before stingOut.");
        }
        this._animation.sprite.play();
      }),
      new entity.WaitForEvent(this, "terminatedAnimation"),
      new entity.FunctionCallEntity(() => {
        this.emit("stungOut");
      }),
    ]);
  }

  private setAnimatedSprite(animationName: VirusAnimation, loop = true) {
    if (this._previousAnimationName === animationName) return;
    else this._previousAnimationName = animationName;

    if (this._animation && this._animation.isSetup)
      this._deactivateChildEntity(this._animation);

    this._animation = util.makeAnimatedSprite(
      this._entityConfig.app.loader.resources[
        `images/${this.type}_bob_${animationName}.json`
      ]
    );

    this._animation.sprite.animationSpeed = 25 / 60;
    this._animation.sprite.scale.set(0.12);
    this._animation.sprite.anchor.set(0.5, 1);
    this._animation.sprite.loop = loop;
    this._animation.options.transitionOnComplete = () => {
      this.emit("terminatedAnimation");
      this.setAnimatedSprite("idle");
    };

    this._activateChildEntity(
      this._animation,
      entity.extendConfig({
        container: this._container,
      })
    );
  }
}
