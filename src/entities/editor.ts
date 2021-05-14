import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";

import * as crispr from "../crispr";
import * as anim from "../animations";

import * as nucleotide from "./nucleotide";

import * as level from "../scenes/level";

export class RadioButtons<
  Buttons extends { [txt: string]: (level: level.Level) => unknown }
> extends entity.CompositeEntity {
  public container: PIXI.Container;
  public index: keyof Buttons;

  get level(): level.Level {
    return this._entityConfig.level;
  }

  constructor(public buttons: Buttons) {
    super();
  }

  _setup() {
    this.container = new PIXI.Container();
    this._entityConfig.container.addChild(this.container);

    let i: number = 0;
    for (let text in this.buttons) {
      if (this.index === undefined) this.index = text;

      const buttonText = crispr.makeText(text, {
        fontSize: 100,
        fill: 0xffffff,
      });
      buttonText.interactive = true;
      buttonText.buttonMode = true;

      buttonText.position.x = this.container.width / 2;
      buttonText.position.y = i++ * 90;

      this._on(buttonText, "pointerup", () => {
        this.index = text;
      });

      this.container.addChild(buttonText);
    }
  }

  _update() {}

  _teardown() {
    this.container.removeChildren();
    this._entityConfig.container.removeChild(this.container);
  }

  run() {
    this.buttons[this.index](this.level);
  }
}
