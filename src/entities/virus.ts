import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as geom from "booyah/src/geom";
import * as tween from "booyah/src/tween";
import * as crisprUtil from "../crisprUtil";

export type State = "idle" | "walk" | "sting";

export const leftEdge = geom.degreesToRadians(25);
export const rightEdge = geom.degreesToRadians(-25);

/**
 * Sends the following events:
 * - changedState(oldState: string, newState: string)
 */
export class Virus extends entity.CompositeEntity {
  private _container: PIXI.Container;
  // private _virusAnimation: entity.AnimatedSpriteEntity;
  private _angle: number = 0;
  private _state: State = "idle";
  private _targetAngle: number = 0;

  constructor(angle: number = 0) {
    super();

    this._angle = angle;
  }

  _setup() {
    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);

    this.idle();
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
    this._container = null;
  }

  get angle(): number {
    return this._angle;
  }

  idle(): void {
    this._deactivateAllChildEntities();

    const childConfig = entity.extendConfig({
      container: this._container,
    });

    const virusAnimation = this._createAnimation(`mini_bob_idle`);
    this._activateChildEntity(virusAnimation, childConfig);

    this._changeState("idle");
  }

  sting(): void {
    this._deactivateAllChildEntities();

    const childConfig = entity.extendConfig({
      container: this._container,
    });

    const virusAnimation = this._createAnimation(`mini_bob_sting`, false);
    this._activateChildEntity(
      new entity.EntitySequence([
        virusAnimation,
        new entity.FunctionCallEntity(() => this.idle()),
      ]),
      childConfig
    );

    this._changeState("sting");
  }

  moveToAngle(angle: number): void {
    if (geom.areAlmostEqualNumber(this._angle, angle)) return;
    if (this.state === "sting") throw new Error("Cannot move while stinging");

    this._state = "walk";
    this._targetAngle = angle;

    this._deactivateAllChildEntities();

    const childConfig = entity.extendConfig({
      container: this._container,
    });

    // Create virus
    const virusAnimation = this._createAnimation("mini_bob_walk");
    // Put him a bit lower
    virusAnimation.sprite.position.y = 10;
    // Possibly flip to face the right direction
    if (this._targetAngle > this._angle) virusAnimation.sprite.scale.x *= -1;
    this._activateChildEntity(virusAnimation, childConfig);

    // Create movement
    const virusMovement = new tween.Tween({
      from: this._angle,
      to: this._targetAngle,
      duration: 1000,
      onUpdate: (x: number) => this._setAngle(x),
    });
    this._activateChildEntity(
      new entity.EntitySequence([
        virusMovement,
        new entity.FunctionCallEntity(() => this.idle()),
      ]),
      childConfig
    );

    this._changeState("walk");
  }

  leave(): void {
    this.moveToAngle(this._angle < 0 ? rightEdge : leftEdge);
  }

  get state(): State {
    return this._state;
  }

  private _setAngle(angle: number): void {
    crisprUtil.positionAlongMembrane(this._container, angle);
    this._angle = angle;
  }

  private _createAnimation(
    name: string,
    loop = true
  ): entity.AnimatedSpriteEntity {
    const virus = util.makeAnimatedSprite(
      this._entityConfig.app.loader.resources[`images/${name}.json`]
    );
    virus.sprite.animationSpeed = 25 / 60;
    virus.sprite.scale.set(0.12);
    virus.sprite.anchor.set(0.5, 1);
    virus.sprite.loop = loop;
    virus.sprite.play();

    return virus;
  }

  private _changeState(newState: State): void {
    const oldState = this._state;

    this._state = newState;
    this.emit("changedState", newState, oldState);
  }
}
