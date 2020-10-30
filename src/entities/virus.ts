import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as crisprUtil from "../crisprUtil";

import * as level from "../scenes/level";

export type VirusType = "mini" | "medium" | "big";
export type VirusAnimation = "sting" | "idle" | "walk" | "dead";

export const leftEdge = 30;
export const rightEdge = -30;

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

  get randomStartAngle(): number {
    return Math.random() < 0.5 ? leftEdge : rightEdge;
  }

  get randomAngle(): number {
    return this.angle < 0
      ? crisprUtil.random(-2, rightEdge * 0.5)
      : crisprUtil.random(2, leftEdge * 0.5);
  }

  get angle(): number {
    return this._container.angle * -1;
  }

  set angle(value) {
    crisprUtil.positionAlongMembrane(this._container, value);
  }

  public angleTooClose(angle: number): boolean {
    return crisprUtil.dist(angle, this.angle) < 10;
  }

  protected _setup() {
    // set starting angle
    this.angle = this.randomStartAngle;

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
        duration: this.type === "big" ? 2500 : 1000,
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
    let angle: number = null;
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        while (
          angle === null ||
          this.level.sequenceManager.viruses.some((v) => {
            return v !== this && v.angleTooClose(angle);
          })
        ) {
          angle = this.randomAngle;
        }
      }),
      this.moveTo(angle),
    ]);
  }

  leave(): entity.EntitySequence {
    return new entity.EntitySequence([
      this.moveTo(this.angle < 0 ? rightEdge : leftEdge),
      new entity.FunctionCallEntity(() => {
        this.level.emitLevelEvent("virusLeaves", this);
        this._transition = entity.makeTransition();
      }),
    ]);
  }

  kill(): entity.EntitySequence {
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        this.setAnimatedSprite("dead", false);
      }),
      new entity.WaitForEvent(this, "terminatedAnimation"),
      new entity.FunctionCallEntity(() => {
        this.level.emitLevelEvent("virusLeaves", this);
        this._transition = entity.makeTransition();
      }),
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
        this.stop();
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
        this.play();
      }),
      new entity.WaitForEvent(this, "terminatedAnimation"),
      new entity.FunctionCallEntity(() => {
        this.emit("stungOut");
      }),
    ]);
  }

  private stop() {
    this._animation.sprite.animationSpeed = 0;
  }

  private play() {
    this._animation.sprite.animationSpeed = 25 / 60;
  }

  private pause() {
    if (this._animation.sprite.animationSpeed === 0) {
      this.play();
    } else {
      this.stop();
    }
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

    // todo: continue to adapt sises of big and medium, for all virusAnimation states
    switch (this.type) {
      case "mini":
        this._animation.sprite.scale.set(
          animationName === "dead" ? 0.25 : 0.12
        );
        this._animation.sprite.anchor.set(
          0.5,
          animationName === "dead" ? 0.7 : 0.95
        );
        break;
      case "medium":
        this._animation.sprite.scale.set(0.3);
        this._animation.sprite.anchor.set(0.5, 1);
        break;
      case "big":
        switch (animationName) {
          case "dead":
            this._animation.sprite.scale.set(0.5);
            this._animation.sprite.anchor.set(0.5, 0.67);
            break;
          case "idle":
            this._animation.sprite.scale.set(0.218);
            this._animation.sprite.anchor.set(0.5, 0.88);
            break;
          case "sting":
            this._animation.sprite.scale.set(0.24);
            this._animation.sprite.anchor.set(0.5, 0.98);
            break;
          case "walk":
            this._animation.sprite.scale.set(0.225);
            this._animation.sprite.anchor.set(0.5, 0.88);
            break;
        }
        break;
    }

    this._animation.sprite.loop = loop;
    this._animation.options.transitionOnComplete = () => {
      this.emit("terminatedAnimation");
      if (animationName !== "dead") {
        this.setAnimatedSprite("idle");
      }
    };

    this.play();

    this._activateChildEntity(
      this._animation,
      entity.extendConfig({
        container: this._container,
      })
    );
  }
}
