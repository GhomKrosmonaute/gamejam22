import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";

import * as level from "./level";

import * as anim from "../animations";
import * as crisprUtil from "../crisprUtil";

export type LevelName = keyof Levels;
export type Levels = typeof levels;
export const levels = {
  turnBased: new level.Level("turnBased"),
  continuous: new level.Level("continuous"),
  long: new level.Level("long"),
};
export const levelNames = Object.keys(levels);

export class Minimap extends entity.CompositeEntity {
  private container = new PIXI.Container();
  private background: PIXI.Sprite;
  private buttons = new PIXI.Container();
  private particles: PIXI.Sprite;
  private particlesBis: PIXI.Sprite;

  protected _setup() {
    this.background = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        "images/cellule_background.png"
      ].texture
    );
    this.background.angle = -90;
    this.background.anchor.set(1, 0);
    this.background.width = crisprUtil.height;
    this.background.height = crisprUtil.width;
    this.container.addChild(this.background);

    this.particles = new PIXI.Sprite(
      this._entityConfig.app.loader.resources["images/cellule_2.png"].texture
    );

    this.particlesBis = new PIXI.Sprite(
      this._entityConfig.app.loader.resources["images/cellule_1.png"].texture
    );

    {
      const options = anim.makeFloatingOptions({
        active: { x: true, y: true },
        amplitude: new PIXI.Point(0.5, 0.5),
        speed: new PIXI.Point(Math.random(), Math.random()),
      });
      const shaking = new anim.DisplayObjectShakesManager(this.particles);
      shaking.setFloat("float", options);
      this._activateChildEntity(shaking);
    }
    {
      const options = anim.makeFloatingOptions({
        active: { x: true, y: true },
        amplitude: new PIXI.Point(2, 2),
        speed: new PIXI.Point(Math.random(), Math.random()),
      });
      const shaking = new anim.DisplayObjectShakesManager(this.particlesBis);
      shaking.setFloat("float", options);
      this._activateChildEntity(shaking);
    }

    this.container.addChild(this.particles);
    this.container.addChild(this.particlesBis);

    for (const levelName in levels) {
      // make a button
      const position = new PIXI.Point(
        crisprUtil.approximate(crisprUtil.width * 0.5, 10),
        crisprUtil.proportion(
          levelNames.indexOf(levelName),
          -0.5,
          levelNames.length - 0.5,
          200,
          crisprUtil.height - 200
        )
      );

      const levelSprite = new PIXI.Sprite(
        this._entityConfig.app.loader.resources["images/cellule.png"].texture
      );
      levelSprite.anchor.set(0.5);
      levelSprite.scale.set(0.7);
      levelSprite.interactive = true;
      levelSprite.buttonMode = true;
      levelSprite.position.copyFrom(position);

      const text = crisprUtil.makeText(levelName, {
        fill: 0xffffff,
      });

      this._on(levelSprite, "pointerup", () => {
        this.setLevel(<LevelName>levelName);
      });

      levelSprite.addChild(text);

      const shaking = new anim.DisplayObjectShakesManager(levelSprite);
      shaking.setFloat(
        "float",
        anim.makeFloatingOptions({
          active: { x: true, y: true },
          amplitude: new PIXI.Point(1, 2),
          speed: new PIXI.Point(Math.random() + 1, Math.random() + 1),
        })
      );
      this._activateChildEntity(shaking);

      this.buttons.addChild(levelSprite);
    }
    this.container.addChild(this.buttons);

    this._entityConfig.container.addChild(this.container);
  }

  protected _teardown() {
    this.background = null;
    this.particles = null;
    this.container.removeChildren();
    this.buttons.removeChildren();
    this._entityConfig.container.removeChild(this.container);
  }

  private setLevel(levelName: LevelName) {
    this._teardown();
    this._activateChildEntity(levels[levelName]);
  }
}
