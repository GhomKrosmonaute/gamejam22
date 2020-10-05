import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";

import * as anim from "../animations";
import * as game from "../game";

export class Popup extends entity.CompositeEntity {
  private _container = new PIXI.Container();
  private _width = game.width * -0.8;
  private _height = game.height / 3;

  /** popup body container */
  public container = new PIXI.Container();

  constructor() {
    super();
  }

  setup(frameInfo: entity.FrameInfo, entityConfig: entity.EntityConfig) {
    super.setup(frameInfo, entityConfig);

    this._container.position.set(game.width / 2, game.height / 2);
    this.container.position.set(this._width * -0.5, this._height * -0.5);
    this._container.addChild(this.container);

    this._entityConfig.container.addChild(this._container);

    this._activateChildEntity(anim.popup(this._container));
  }

  teardown(frameInfo: entity.FrameInfo) {
    this._activateChildEntity(
      anim.sink(this._container, 300, () => {
        this._container.removeChild(this.container);
        this._entityConfig.removeChild(this._container);
        super.teardown(frameInfo);
      })
    );
  }
}
