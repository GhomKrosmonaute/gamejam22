import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as scroll from "booyah/src/scroll";

import * as level from "./level";

import * as anim from "../animations";
import * as crisprUtil from "../crisprUtil";
import { height } from "../crisprUtil";

export type LevelName = keyof Levels;
export type Levels = typeof levels;
export const levels = {
  turnBased: new level.Level("turnBased"),
  continuous: new level.Level("continuous"),
  long: new level.Level("long"),
  turnBased1: new level.Level("turnBased"),
  continuous1: new level.Level("continuous"),
  long1: new level.Level("long"),
  turnBased2: new level.Level("turnBased"),
  continuous2: new level.Level("continuous"),
  long31: new level.Level("long"),
  turnBased23: new level.Level("turnBased"),
  continuou3s2: new level.Level("continuous"),
};
export const levelNames = Object.keys(levels);

export class Minimap extends entity.CompositeEntity {
  private background: PIXI.Sprite;
  private container = new PIXI.Container();
  private buttons = new PIXI.Container();
  private particles: PIXI.Sprite;
  private particlesBis: PIXI.Sprite;
  private links = new PIXI.Graphics();
  private scrollBox: scroll.Scrollbox;

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

    this.container.addChild(this.links);

    for (const levelName in levels) {
      // make a button
      const position = new PIXI.Point(
        crisprUtil.approximate(crisprUtil.width * 0.5, 50),
        crisprUtil.proportion(
          levelNames.indexOf(levelName),
          -0.5,
          4 - 0.5,
          200,
          crisprUtil.height - 200
        )
      );

      const levelSprite = new PIXI.Sprite(
        this._entityConfig.app.loader.resources["images/cellule.png"].texture
      );
      levelSprite.anchor.set(0.5);
      levelSprite.scale.set(0.55 + Math.random() * 0.15);
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
          amplitude: new PIXI.Point(1, 1),
          speed: new PIXI.Point(Math.random() + 0.2, Math.random() + 0.2),
        })
      );
      this._activateChildEntity(shaking);

      this.buttons.addChild(levelSprite);
    }

    this.scrollBox = new scroll.Scrollbox({
      content: this.buttons,
      boxWidth: crisprUtil.width - 10,
      boxHeight: crisprUtil.height,
      overflowY: "scroll",
      scrollbarSize: 25,
      contentMarginY: 500,
    });
    this._activateChildEntity(
      this.scrollBox,
      entity.extendConfig({
        container: this.container,
      })
    );

    this.scrollBox.refresh();

    this._entityConfig.container.addChild(this.container);
  }

  protected _update() {
    this.links.position.copyFrom(this.scrollBox.currentScroll);
    this.links.clear();
    this.links.lineStyle(150, 0xffffff, 0.1);
    this.buttons.children.forEach(
      (button: PIXI.Sprite, i: number, arr: PIXI.Sprite[]) => {
        if (i > 0) {
          this.links.moveTo(button.position.x, button.position.y);
          this.links.lineTo(arr[i - 1].position.x, arr[i - 1].position.y);
        }
      }
    );
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
