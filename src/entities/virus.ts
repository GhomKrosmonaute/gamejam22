import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as crisprUtil from "../crisprUtil";

export type State = "walk" | "idle" | "sting";

export class Virus extends entity.CompositeEntity {
  private _container: PIXI.Container;
  private _virusAnimation: entity.AnimatedSpriteEntity;
  private _angle: number = 0;
  private _state: State = "idle";

  _setup() {
    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);

    // Run setter functions
    this.angle = this._angle;
    this.state = this._state;
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
    this._container = null;
  }

  get angle(): number {
    return this._angle;
  }
  set angle(angle: number) {
    this._angle = angle;
    if (!this.isSetup) return;

    crisprUtil.positionAlongMembrane(this._container, angle);
  }

  get state(): State {
    return this._state;
  }
  set state(state: State) {
    this._state = state;
    if (!this.isSetup) return;

    if (this._virusAnimation) {
      this._deactivateChildEntity(this._virusAnimation);
    }

    this._virusAnimation = this._createAnimation(`mini_bob_${state}`);
    this._activateChildEntity(this._virusAnimation, {
      container: this._container,
    });
  }

  private _createAnimation(name: string): entity.AnimatedSpriteEntity {
    const virus = util.makeAnimatedSprite(
      this._entityConfig.app.loader.resources[`images/${name}.json`]
    );
    virus.sprite.animationSpeed = 25 / 60;
    virus.sprite.scale.set(0.6);
    virus.sprite.anchor.set(0.5, 1);
    virus.sprite.play();

    return virus;
  }
}
