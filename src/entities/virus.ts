import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as crispr from "../crispr";

import * as level from "../scenes/level";

export type VirusType = "mini" | "medium" | "big";
export type VirusAnimation = "sting" | "idle" | "walk" | "dead";

export const leftEdge = 30;
export const rightEdge = -30;

export interface SwimmingVirus {
  speed: number;
  entity: entity.AnimatedSpriteEntity;
}

export function generateSwimmingVirus(
  ctx: entity.EntityBase,
  maxHeight: number,
  ref: Partial<SwimmingVirus> = {}
): SwimmingVirus {
  const scale = crispr.random(0.5, 1);

  ref.speed =
    Math.round(crispr.proportion(scale, 0.5, 1, 5, 10)) *
    (Math.random() > 0.5 ? -1 : 1);

  if (!ref.entity)
    ref.entity = util.makeAnimatedSprite(
      ctx.entityConfig.app.loader.resources["images/mini_bob_swim.json"]
    );

  const toRight = ref.speed > 0;

  ref.entity.sprite.anchor.set(0.5);
  ref.entity.sprite.scale.set(scale);
  ref.entity.sprite.angle = toRight ? 90 : -90;
  ref.entity.sprite.alpha = (scale - 0.25) / 2;
  ref.entity.sprite.animationSpeed = 20 / 60;
  ref.entity.sprite.tint = 0x241e1e;
  ref.entity.sprite.position.set(
    toRight ? -300 : crispr.width + 300,
    crispr.height - crispr.random(maxHeight)
  );

  return ref as SwimmingVirus;
}

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
  private _position = new PIXI.Point();

  public rounded = true;
  public scale = 1;
  public filters: PIXI.Filter[] = [];

  constructor(public type: VirusType) {
    super();
  }

  get level(): level.Level {
    return this._entityConfig.currentLevelHolder.level;
  }

  get randomStartAngle(): number {
    return Math.random() < 0.5 ? leftEdge : rightEdge;
  }

  get randomAngle(): number {
    return this.angle < 0
      ? crispr.random(-2, rightEdge * 0.5)
      : crispr.random(2, leftEdge * 0.5);
  }

  get angle(): number {
    return this._container.angle * -1;
  }

  set angle(value) {
    crispr.positionAlongMembrane(this._container, value);
    this.refreshRoundedPosition();
  }

  get position(): PIXI.IPointData {
    return this._position;
  }

  set position(point: PIXI.IPointData) {
    if (!this.rounded) {
      this._container.position.copyFrom(point);
      this._position.copyFrom(point);
    } else {
      crispr.positionAlongMembrane(this._container, this.angle);
      this._position.copyFrom(point);
      this.refreshRoundedPosition();
    }
  }

  public angleTooClose(angle: number): boolean {
    return crispr.dist(angle, this.angle) < 10;
  }

  protected _setup() {
    if (this.rounded) {
      // set starting angle
      this.angle = this.randomStartAngle;
    }

    this._entityConfig.container.addChildAt(
      this._container,
      Math.min(15, this._entityConfig.container.children.length - 1)
    );
  }

  protected _teardown() {
    this._entityConfig.container.removeChild(this._container);
  }

  moveToPosition(position: PIXI.IPointData): entity.EntitySequence {
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        this.setAnimatedSprite("walk", true);
        if (position.x < this._container.position.x)
          this._animation.sprite.scale.x *= -1;
      }),
      new tween.Tween({
        duration: this.type === "big" ? 2500 : 1000,
        obj: this._container,
        property: "position",
        from: this._container.position.clone(),
        to: new PIXI.Point(position.x, position.y),
        easing: easing.easeInOutQuad,
        interpolate: tween.interpolation.point,
      }),
    ]);
  }

  moveToAngle(angle: number): entity.EntitySequence {
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        this.setAnimatedSprite("walk", true);
        if (angle > this.angle) this._animation.sprite.scale.x *= -1;

        this._entityConfig.fxMachine.play("virus_move");
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
      this.moveToAngle(angle),
    ]);
  }

  leave(): entity.EntitySequence {
    return new entity.EntitySequence([
      this.rounded
        ? this.moveToAngle(this.angle < 0 ? rightEdge : leftEdge)
        : this.moveToPosition({
            x:
              this._position.x < crispr.width / 2
                ? crispr.width * -0.5
                : crispr.width * 1.5,
            y: this._position.y,
          }),
      new entity.FunctionCallEntity(() => {
        this.level.emitLevelEvent("virusLeaves", this);
        this._transition = entity.makeTransition();
      }),
    ]);
  }

  kill(): entity.EntitySequence {
    return new entity.EntitySequence([
      new entity.FunctionCallEntity(() => {
        this.level.killedViruses++;

        this.setAnimatedSprite("dead", false);

        this._entityConfig.fxMachine.play("virus_death");
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
      // Slight wait before playing sound.
      // TODO: make this sound longer?
      new entity.FunctionalEntity({
        requestTransition: () =>
          this._animation.sprite.currentFrame >=
          this._animation.sprite.totalFrames * 0.25,
      }),
      new entity.FunctionCallEntity(() => {
        this._entityConfig.fxMachine.play("virus_sting");
      }),
      new entity.FunctionalEntity({
        requestTransition: () =>
          this._animation.sprite.currentFrame >=
          this._animation.sprite.totalFrames * 0.3,
      }),
      new entity.FunctionCallEntity(() => {
        this.level.screenShake(20, 1.03, 200);
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

  private refreshRoundedPosition() {
    this._container.position.x += this.position.x;
    this._container.position.y += this.position.y;
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

    this._animation.sprite.scale.set(
      this._animation.sprite.scale.x * this.scale
    );

    this._animation.sprite.filters = this.filters;
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
