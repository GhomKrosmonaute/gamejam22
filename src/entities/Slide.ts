import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as geom from "booyah/src/geom";
import * as utils from "../utils";

/**
 * Fired when angle is chosen
 *
 * @event Slide#choseSide
 * @param {utils.NeighborIndex} neighborIndex - The chosen side to slide from
 */
export default class Slide extends entity.Entity {
  private container: PIXI.Container;
  private slideDownPos: PIXI.Point = null;
  private circle: PIXI.Sprite;
  private arrow: PIXI.Sprite;
  private lastSide: utils.NeighborIndex;

  _setup() {
    this.container = new PIXI.Container();
    this.entityConfig.container.addChild(this.container);
    this.container.interactive = true;

    this._on(this.container, "pointerdown", this._onPointerDown);
    this._on(this.container, "pointermove", this._onPointerMove);
    this._on(this.container, "pointerup", this._onPointerUp);

    const bg = new PIXI.Graphics();
    bg.beginFill(0, 0.2);
    bg.drawRect(
      0,
      0,
      this.entityConfig.app.view.width,
      this.entityConfig.app.view.height
    );
    bg.endFill();
    this.container.addChild(bg);

    this.circle = new PIXI.Sprite(
      this.entityConfig.app.loader.resources["images/circle.png"].texture
    );
    this.circle.position.set(
      this.entityConfig.app.view.width / 2,
      this.entityConfig.app.view.height / 2
    );
    this.circle.anchor.set(0.5);
    this.container.addChild(this.circle);

    this.arrow = new PIXI.Sprite(
      this.entityConfig.app.loader.resources["images/arrow.png"].texture
    );
    this.arrow.position.set(
      this.entityConfig.app.view.width / 2,
      this.entityConfig.app.view.height / 2
    );
    this.arrow.anchor.set(0.5);
    this.arrow.visible = false;
    this.container.addChild(this.arrow);
  }

  _teardown() {
    this.entityConfig.container.removeChild(this.container);
    this.container = null;
  }

  private _onPointerDown(e: PIXI.InteractionEvent) {
    this.slideDownPos = e.data.global.clone();
  }

  private _onPointerMove(e: PIXI.InteractionEvent) {
    if (!this.slideDownPos) return;

    const endPos = e.data.global;

    const dist = geom.distance(this.slideDownPos, endPos);
    if (dist > 10) {
      this.circle.visible = false;
      this.arrow.visible = true;

      // Find positive version of angle, with 0 being to the right
      let angle = geom.radiansToDegrees(
        Math.atan2(
          endPos.y - this.slideDownPos.y,
          endPos.x - this.slideDownPos.x
        )
      );
      if (angle < 0) angle += 360;

      // Convert to side
      this.lastSide = ((Math.floor(angle / 60) + 2) % 6) as utils.NeighborIndex;

      // Display arrow
      const snappedAngle = Math.floor(angle / 60) * 60 + 30;
      this.arrow.angle = snappedAngle;

      console.log("side", this.lastSide, "angle", snappedAngle);
    } else {
      this.circle.visible = true;
      this.arrow.visible = false;
    }
  }

  private _onPointerUp(e: PIXI.InteractionEvent) {
    if (this.arrow.visible) {
      this.emit("choseSide", this.lastSide);
    }

    this.slideDownPos = null;
    this.circle.visible = true;
    this.arrow.visible = false;
  }
}
