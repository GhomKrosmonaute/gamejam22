import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as geom from "booyah/src/geom";

export class Virus extends entity.CompositeEntity {
  private _container: PIXI.Container;
  private _virusAnimation: PIXI.AnimatedSprite;

  _setup() {
    this._container = new PIXI.Container();
    this._entityConfig.container.addChild(this._container);

    this._virusAnimation = this._createAnimation();
    this._container.addChild(this._virusAnimation);
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
    this._container = null;
  }

  private _createAnimation(): PIXI.AnimatedSprite {
    const virus = util.makeAnimatedSprite(
      this._entityConfig.app.loader.resources["images/mini_bob_idle.json"]
    );
    virus.animationSpeed = 25 / 60;
    virus.scale.set(0.6);
    virus.anchor.set(0.5, 1);
    virus.position.set(300, 400);
    virus.play();

    return virus;
  }
}
