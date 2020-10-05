import * as PIXI from "pixi.js";
import * as entity from "booyah/src/entity";

import * as anim from "../animations";
import * as game from "../game";
import * as crisprUtil from "../crisprUtil";

/**
 * Emits:
 * - closed
 */
export class Popup extends entity.CompositeEntity {
  private _container = new PIXI.Container();
  public readonly width = game.width * -0.8;
  public readonly height = game.height / 3;
  public readonly center = new PIXI.Point(this.width / 2, this.height / 2);

  // todo: add a popup background as sprite

  /** popup body container */
  public readonly container = new PIXI.Container();

  constructor() {
    super();
  }

  setup(frameInfo: entity.FrameInfo, entityConfig: entity.EntityConfig) {
    super.setup(frameInfo, entityConfig);

    this.container.position.set(this.width * -0.5, this.height * -0.5);
    this._container.position.set(game.width / 2, game.height / 2);
    this._container.addChild(this.container);

    this._entityConfig.container.addChild(this._container);

    this._activateChildEntity(anim.popup(this._container, 700));
  }

  teardown(frameInfo: entity.FrameInfo) {
    super.teardown(frameInfo);

    this.container.removeChildren();
  }

  close() {
    this._activateChildEntity(
      anim.sink(this._container, 150, () => {
        this._container.removeChild(this.container);
        this._entityConfig.container.removeChild(this._container);
        this._transition = entity.makeTransition();
        this.emit("closed");
      })
    );
  }

  button(displayObject: PIXI.DisplayObject, callback?: () => any) {
    this.container.addChild(displayObject);
    displayObject.buttonMode = true;
    displayObject.interactive = true;
    this._on(displayObject, "pointerup", () => {
      callback?.();
    });
  }
}

export class EndLevelPopup extends Popup {
  private text: PIXI.Text;

  protected _setup() {
    // make text with anchor already set on middle
    this.text = crisprUtil.makeText("Click-me for close popup!", {
      fontSize: 100,
      stroke: 0xffffff,
      strokeThickness: 10,
    });

    // place text on center of popup
    this.text.position.copyFrom(this.center);

    // use this text as button for close popup
    this.button(this.text, () => {
      this.close();
    });
  }
}
