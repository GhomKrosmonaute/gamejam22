import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as scroll from "booyah/src/scroll";
import * as tween from "booyah/src/tween";

import * as levels from "../levels";

import * as level from "./level";

import * as popup from "../entities/popup";

import * as anim from "../animations";
import * as crisprUtil from "../crisprUtil";

export class Minimap extends entity.CompositeEntity {
  private background: PIXI.Sprite;
  private container: PIXI.Container;
  private buttons: PIXI.Container;
  private particles: PIXI.Sprite;
  private particlesBis: PIXI.Sprite;
  private links: PIXI.Graphics;
  private scrollBox: scroll.Scrollbox;

  protected _setup() {
    this.links = new PIXI.Graphics();
    this.container = new PIXI.Container();
    this.buttons = new PIXI.Container();

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
      const shaking = new anim.ShakesManager(this.particles);
      shaking.setFloat("float", options);
      this._activateChildEntity(shaking);
    }
    {
      const options = anim.makeFloatingOptions({
        active: { x: true, y: true },
        amplitude: new PIXI.Point(2, 2),
        speed: new PIXI.Point(Math.random(), Math.random()),
      });
      const shaking = new anim.ShakesManager(this.particlesBis);
      shaking.setFloat("float", options);
      this._activateChildEntity(shaking);
    }

    this.container.addChild(this.particles);
    this.container.addChild(this.particlesBis);
    this.container.addChild(this.links);

    for (const levelName in levels.levels) {
      // make a button
      const position = new PIXI.Point(
        crisprUtil.approximate(crisprUtil.width * 0.5, 50),
        crisprUtil.proportion(
          levels.levelNames.indexOf(levelName),
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
      levelSprite.position.copyFrom(position);
      levelSprite.interactive = true;
      levelSprite.buttonMode = true;

      const text = crisprUtil.makeText(levelName, {
        fill: 0xffffff,
      });

      if (!crisprUtil.debug) {
        const levelIndex = levels.levelNames.indexOf(levelName);
        if (levelIndex < levels.levelNames.length - 1) {
          console.log("index", levelIndex, levelName);
          const previousLevelName = levels.levelNames[levelIndex + 1];
          if (!localStorage.getItem(previousLevelName)) {
            console.log("local", levelIndex + 1, previousLevelName);
            //text.style.fill = 0xb0b0b0;
            text.visible = false;
            levelSprite.tint = 0xb0b0b0;
            levelSprite.interactive = false;
            levelSprite.buttonMode = false;
          }
        }
      }

      this._on(levelSprite, "pointerup", () => {
        levelSprite.filters = [new PIXI.filters.AlphaFilter(1)];
        this._activateChildEntity(
          new tween.Tween({
            from: 0,
            to: 1,
            duration: 500,
            onUpdate: (value) => {
              levelSprite.scale.set(crisprUtil.proportion(value, 0, 1, 1, 10));
              (levelSprite
                .filters[0] as PIXI.filters.AlphaFilter).alpha = crisprUtil.proportion(
                value,
                0,
                1,
                1,
                0
              );
            },
            onTeardown: () => {
              this.setLevel(<levels.LevelName>levelName);
            },
          })
        );
      });

      const data = localStorage.getItem(levelName);

      if (data) {
        const result: level.LevelResults = JSON.parse(data);

        text.text += "\n" + "⭐".repeat(result.starCount);
      }

      levelSprite.addChild(text);

      const shaking = new anim.ShakesManager(levelSprite);
      shaking.setFloat(
        "float",
        anim.makeFloatingOptions({
          active: { x: true, y: true },
          amplitude: new PIXI.Point(2, 1),
          speed: new PIXI.Point(Math.random() + 0.5, Math.random() + 0.2),
        })
      );
      this._activateChildEntity(shaking);

      this.buttons.addChild(levelSprite);
    }

    this.scrollBox = new scroll.Scrollbox({
      content: this.buttons,
      boxWidth: crisprUtil.width - 10,
      boxHeight: crisprUtil.height,
      scrollbarSize: 25,
      contentMarginY: 500,
    });
    this._activateChildEntity(
      this.scrollBox,
      entity.extendConfig({
        container: this.container,
      })
    );
    this.scrollBox.scrollTo(new PIXI.Point(0, -9999999));
    this.scrollBox.refresh();

    this._entityConfig.container.addChild(this.container);
    this._entityConfig.minimap = this;
  }

  protected _update() {
    if (!this.isSetup) return;

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
    this.container.removeChildren();
    this.buttons.removeChildren();
    this._entityConfig.container.removeChildren();
    this.buttons = null;
    this.container = null;
    this.background = null;
    this.particles = null;
    this.links = null;
  }

  public setLevel(levelName: levels.LevelName) {
    popup.Popup.minimized.clear();
    this._transition = entity.makeTransition(levelName);
  }

  public saveResults(l: level.Level) {
    const results = l.checkAndReturnsResults();
    let oldResults: level.LevelResults;
    const data = localStorage.getItem(l.name);
    if (data) oldResults = JSON.parse(data);
    if (!oldResults || oldResults.checkedCount < results.checkedCount) {
      localStorage.setItem(l.name, JSON.stringify(results));
    }
  }
}
