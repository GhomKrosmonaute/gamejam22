import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";

import * as anim from "../animations";
import * as game from "../game";
import * as crisprUtil from "../crisprUtil";

export class Popup extends entity.CompositeEntity {
  private _container = new PIXI.Container();
  public readonly width = game.width * -0.8;
  public readonly height = game.height / 3;
  public readonly center = new PIXI.Point(
    this.width / 2,
    this.height / 2
  );

  /** popup body container */
  public readonly container = new PIXI.Container();

  constructor() {
    super();
  }

  setup(frameInfo: entity.FrameInfo, entityConfig: entity.EntityConfig) {
    super.setup(frameInfo, entityConfig);

    this._container.position.set(game.width / 2, game.height / 2);
    this.container.position.set(this.width * -0.5, this.height * -0.5);
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

export class EndLevelPopup extends Popup {
  private text: PIXI.Text

  protected _setup() {
    this.text = crisprUtil.makeText("HELLO WORLD!")
  }
}
