import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as scroll from "booyah/src/scroll";
import * as tween from "booyah/src/tween";

import * as levels from "../levels";

import * as level from "./level";

import * as popup from "../entities/popup";
import * as menu from "./menu";

import * as anim from "../animations";
import * as crispr from "../crispr";

export class Minimap extends entity.CompositeEntity {
  private menu: menu.Menu;
  private background: PIXI.Sprite;
  private container: PIXI.Container;
  private buttons: PIXI.Container;
  private layer1: PIXI.Sprite;
  private layer2: PIXI.Sprite;
  private links: PIXI.Graphics;
  private scrollBox: scroll.Scrollbox;

  protected _setup() {
    this._entityConfig.jukebox.changeMusic("menu");

    this.links = new PIXI.Graphics();
    this.container = new PIXI.Container();
    this.buttons = new PIXI.Container();

    this.menu = new menu.Menu();

    this.background = crispr.sprite(this, "images/minimap_background.png");
    this.container.addChild(this.background);

    this.layer1 = crispr.sprite(this, "images/minimap_layer_1.png");
    this.layer2 = crispr.sprite(this, "images/minimap_layer_2.png");

    // {
    //   const options = anim.makeFloatingOptions({
    //     active: { x: true, y: true },
    //     amplitude: new PIXI.Point(0.5, 0.5),
    //     speed: new PIXI.Point(Math.random(), Math.random()),
    //   });
    //   const shaking = new anim.ShakesManager(this.layer1);
    //   shaking.setFloat("float", options);
    //   this._activateChildEntity(shaking);
    // }
    // {
    //   const options = anim.makeFloatingOptions({
    //     active: { x: true, y: true },
    //     amplitude: new PIXI.Point(2, 2),
    //     speed: new PIXI.Point(Math.random(), Math.random()),
    //   });
    //   const shaking = new anim.ShakesManager(this.layer2);
    //   shaking.setFloat("float", options);
    //   this._activateChildEntity(shaking);
    // }

    this.container.addChild(this.layer1);
    this.container.addChild(this.layer2);
    this.container.addChild(this.links);

    for (const levelName in levels.levels) {
      const index = Object.keys(levels.levels).indexOf(levelName);

      // make a button
      const position = new PIXI.Point(
        crispr.approximate(
          crispr.width * 0.5 + (index % 2 === 0 ? -100 : 100),
          50
        ),
        crispr.proportion(
          levels.levelNames.indexOf(levelName),
          -0.5,
          4 - 0.5,
          200,
          crispr.height - 200
        )
      );

      const levelSprite = crispr.sprite(this, "images/minimap_level.png");
      levelSprite.anchor.set(0.5);
      levelSprite.scale.set(0.9 + Math.random() * 0.2);
      levelSprite.position.copyFrom(position);
      levelSprite.interactive = true;
      levelSprite.buttonMode = true;

      const text = crispr.makeText(levelName, {
        fontStyle: "bold",
        fill: "#ffda6b",
      });

      levelSprite.addChild(text);

      if (!crispr.debug) {
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
        this._entityConfig.fxMachine.play("validate");

        levelSprite.filters = [new PIXI.filters.AlphaFilter(1)];
        this._activateChildEntity(
          new tween.Tween({
            from: 0,
            to: 1,
            duration: 500,
            onUpdate: (value) => {
              levelSprite.scale.set(crispr.proportion(value, 0, 1, 1, 10));
              (levelSprite
                .filters[0] as PIXI.filters.AlphaFilter).alpha = crispr.proportion(
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

        const stars = crispr.sprite(
          this,
          `images/reward_stars_${result.starCount}.png`
        );

        stars.anchor.set(0.5);
        stars.scale.set(0.3);
        stars.position.y = 50;

        text.position.y = -50;

        levelSprite.addChild(stars);
      } else {
        const viruses = crispr.sprite(
          this,
          `images/minimap_virus_${Math.floor(Math.random() * 5)}.png`
        );

        viruses.anchor.set(0.5);

        levelSprite.addChild(viruses);
      }

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
      boxWidth: crispr.width - 10,
      boxHeight: crispr.height,
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

    this._activateChildEntity(
      this.menu,
      entity.extendConfig({
        container: this.container,
      })
    );
  }

  protected _update() {
    if (!this.isSetup) return;

    const scroll = this.scrollBox.currentScroll;

    this.layer2.position.y = scroll.y / 5;
    this.layer1.position.y = scroll.y / 10;

    this.links.position.copyFrom(scroll);
    this.links.clear();
    this.links.lineStyle(50, 0x20e5e5, 0.2);
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
    this.layer1 = null;
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
