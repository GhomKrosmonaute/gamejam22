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
  static savedScroll = -9999999;
  static lastLevel: levels.LevelName = null;

  private menu: menu.Menu;
  private container: PIXI.Container;
  private background: PIXI.Sprite;
  private buttons: PIXI.Container;
  private layer1: PIXI.Sprite;
  private layer2: PIXI.Sprite;
  private links: PIXI.Graphics;
  private scrollBox: scroll.Scrollbox;

  protected _setup() {
    this._entityConfig.jukebox.play("menu");

    this.links = new PIXI.Graphics();
    this.container = new PIXI.Container();
    this.buttons = new PIXI.Container();

    this.menu = new menu.Menu();

    this.background = crispr.sprite(this, "images/minimap_background.png");

    this.container.addChild(this.background);

    this.layer1 = crispr.sprite(this, "images/minimap_layer_1.png");
    this.layer2 = crispr.sprite(this, "images/minimap_layer_2.png");

    this.container.addChild(this.layer1);
    this.container.addChild(this.layer2);
    this.container.addChild(this.links);

    for (const levelName of Object.keys(levels.levels)) {
      const index = Object.keys(levels.levels).indexOf(levelName);
      const even = index % 2 === 0;
      const data = localStorage.getItem(levelName);

      /**
       * If previous level is done or Boss level is done.
       */
      const isAccessible =
        Object.entries(levels.levels)
          .slice(index + 1)
          .every(([key]) => {
            return !!localStorage.getItem(key);
          }) || !!localStorage.getItem("Boss");

      // make a button
      const position = new PIXI.Point(
        crispr.approximate(crispr.width * 0.5 + (even ? -150 : 150), 50),
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

      if (isAccessible && data) {
        const preview = crispr.sprite(this, "images/test_preview.png");

        const previewMask = crispr.sprite(
          this,
          "images/minimap_level_preview_mask.png"
        );
        previewMask.anchor.set(0.5);

        preview.addChild(previewMask);
        preview.mask = previewMask;
        preview.anchor.set(0.5);

        levelSprite.addChild(preview);
      }

      if (levelName === Minimap.lastLevel) {
        const circle = new PIXI.Graphics()
          .lineStyle(10, crispr.yellowNumber)
          .drawCircle(0, 25, 165);

        levelSprite.addChild(circle);
      }

      const text = crispr.makeText(levelName, {
        fontFamily: "Optimus",
        fill: crispr.yellow,
      });

      text.scale.set(0.8);
      text.anchor.set(even ? 0 : 1, 1);
      text.position.x = even ? 200 : -200;

      const line = new PIXI.Graphics()
        .lineStyle(5, crispr.yellowNumber)
        .moveTo(even ? 100 : -100, 0)
        .lineTo(even ? -55 : 55, 0);

      line.position.y = 10;

      text.addChild(line);

      levelSprite.addChild(text);

      this._on(levelSprite, "pointerup", () => {
        this._entityConfig.fxMachine.play("validate");

        Minimap.savedScroll = this.scrollBox.currentScroll.y;
        Minimap.lastLevel = levelName as levels.LevelName;

        this._activateChildEntity(
          new tween.Tween({
            from: 0,
            to: 1,
            duration: 500,
            onUpdate: (value) => {
              levelSprite.scale.set(crispr.proportion(value, 0, 1, 1, 10));
              levelSprite.alpha = crispr.proportion(value, 0, 1, 1, 0);
            },
            onTeardown: () => {
              this.setLevel(<levels.LevelName>levelName);
            },
          })
        );
      });

      if (isAccessible && data) {
        const result: level.LevelResults = JSON.parse(data);

        const stars = crispr.sprite(
          this,
          `images/reward_stars_${result.starCount}.png`
        );

        stars.scale.set(0.3);
        stars.anchor.set(even ? 0 : 1, 1);
        stars.position.x = even ? 200 : -200;
        stars.position.y = 100;

        //text.position.y = -50;

        levelSprite.addChild(stars);
      } else {
        const viruses = crispr.sprite(
          this,
          `images/minimap_virus_${Math.floor(Math.random() * 5)}.png`
        );

        viruses.anchor.set(0.5);

        levelSprite.addChild(viruses);
      }

      if (!isAccessible && !crispr.debug) {
        text.visible = false;

        levelSprite.tint = 0xb0b0b0;
        levelSprite.interactive = false;
        levelSprite.buttonMode = false;
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
    this.scrollBox.scrollTo(new PIXI.Point(0, Minimap.savedScroll));
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
