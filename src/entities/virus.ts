import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as geom from "booyah/src/geom";

import * as crisprUtil from "../crisprUtil";

export type State = "walkLeft" | "walkRight" | "idle" | "sting";

export class Virus extends entity.CompositeEntity {
  private _container: PIXI.Container;
  private _virusAnimation: PIXI.AnimatedSprite;
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
      this._container.removeChild(this._virusAnimation);
      this._virusAnimation = null;
    }

    if (this.state === "walkLeft" || this.state == "walkRight") {
      this._virusAnimation = this._createAnimation(`mini_bob_walk`);
      // Put him a bit lower
      this._virusAnimation.position.y = 10;

      if (this.state === "walkLeft") this._virusAnimation.scale.x *= -1;
    } else {
      this._virusAnimation = this._createAnimation(`mini_bob_${state}`);
    }

    this._container.addChild(this._virusAnimation);
  }

  private _createAnimation(name: string): PIXI.AnimatedSprite {
    const virus = util.makeAnimatedSprite(
      this._entityConfig.app.loader.resources[`images/${name}.json`]
    );
    virus.animationSpeed = 25 / 60;
    virus.scale.set(0.2);
    virus.anchor.set(0.5, 1);
    virus.play();

    return virus;
  }
}
