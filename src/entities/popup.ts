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

  public shaker: anim.DisplayObjectShakesManager;

  public readonly width = game.width * -0.8;
  public readonly height = game.height / 3;
  public readonly center = new PIXI.Point(this.width / 2, this.height / 2);

  /** popup body container */
  public readonly container = new PIXI.Container();

  // todo: add a popup background as sprite

  constructor() {
    super();

    this.container.position.set(this.width * -0.5, this.height * -0.5);
    this._container.position.set(game.width / 2, game.height / 2);
    this._container.addChild(this.container);

    this.shaker = new anim.DisplayObjectShakesManager(this.container);
  }

  setup(frameInfo: entity.FrameInfo, entityConfig: entity.EntityConfig) {
    super.setup(frameInfo, entityConfig);

    this._entityConfig.container.addChild(this._container);

    this._activateChildEntity(anim.popup(this._container, 700));

    this._activateChildEntity(this.shaker);
  }

  /**
   * In order:
   * 1. animate popup closure
   * 2. clean all containers
   * 3. clean all shakers
   * 4. emit "closed" event
   * 5. make transition
   */
  close() {
    this._activateChildEntity(
      anim.sink(this._container, 150, () => {
        this.container.removeChildren();
        this._container.removeChild(this.container);
        this._entityConfig.container.removeChild(this._container);
        this.shaker.removeAllShakes();
        this.emit("closed");
        this._transition = entity.makeTransition();
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

export class ExamplePopup extends Popup {
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

    // start popup shaking (all shakers are automatically removed on closure)
    this.shaker.setShake("example", 3);
  }
}

export class TerminateLevelPopup extends Popup {
  // todo: make popup with stars and score of level
}
