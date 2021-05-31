import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";

import * as crispr from "../crispr";
import * as popup from "../entities/popup";

// Created with http://www.sharelinkgenerator.com
const twitterUrl =
  "https://twitter.com/intent/tweet?original_referer=https%3A%2F%2Fplaycurious.games&ref_src=twsrc%5Etfw&text=Come%20on%20%40PlayCuriousGame%2C%20when%20are%20you%20making%20new%20levels%20for%20%23CRISPRCrunch%3F&tw_p=tweetbutton&url=https%3A%2F%2Fplaycurious.games%2Fcrispr-crunch%2F";
const fbUrl =
  "https://www.facebook.com/sharer/sharer.php?u=https%3A//playcurious.games/games/crispr-crunch/";
const emailUrl =
  "mailto:hello@playcurious.games?subject=When%20are%20you%20making%20new%20levels%20for%20CRISPR%20Crunch%3F&body=%3C%3Cplease%20let%20us%20know%20what%20you%20think%3E%3E";

export class WriteUsPopup extends entity.EntityBase {
  private _container: PIXI.Container;

  _setup() {
    this._container = new PIXI.Container();

    const sprite = crispr.sprite(this, "images/minimap_write_us.png");
    this._container.addChild(sprite);

    {
      const cross = popup.makeCross(50);
      cross.position.set(932, 397);
      cross.buttonMode = true;
      cross.interactive = true;
      this._on(
        cross,
        "pointertap",
        () => (this._transition = entity.makeTransition())
      );
      this._container.addChild(cross);
    }

    this._container.addChild(
      this._makeLinkButton(
        new PIXI.Point(225, 869),
        new PIXI.Point(200, 200),
        twitterUrl
      )
    );
    this._container.addChild(
      this._makeLinkButton(
        new PIXI.Point(435, 869),
        new PIXI.Point(220, 200),
        fbUrl
      )
    );
    this._container.addChild(
      this._makeLinkButton(
        new PIXI.Point(670, 869),
        new PIXI.Point(260, 200),
        emailUrl
      )
    );

    this._entityConfig.container.addChild(this._container);
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
    this._container = null;
  }

  private _makeLinkButton(
    coords: PIXI.IPointData,
    size: PIXI.IPointData,
    url: string
  ): PIXI.Container {
    const button = new PIXI.Container();
    button.position.copyFrom(coords);
    button.hitArea = new PIXI.Rectangle(0, 0, size.x, size.y);
    button.interactive = true;
    button.buttonMode = true;
    this._on(button, "pointertap", () => window.open(url, "_blank"));
    return button;
  }
}
