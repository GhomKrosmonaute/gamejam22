import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as scroll from "booyah/src/scroll";
import * as tween from "booyah/src/tween";

import * as levels from "../levels";

import * as level from "./level";

import * as popup from "../entities/popup";

import * as anim from "../animations";
import * as crispr from "../crispr";

import * as game from "../game";

export class Main extends entity.CompositeEntity {
  static savedScroll = -9999999;
  static lastLevel: levels.LevelName = null;

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

    this.background = crispr.sprite(this, "images/minimap_background.png");

    this.container.addChild(this.background);

    this.layer1 = crispr.sprite(this, "images/minimap_layer_1.png");
    this.layer2 = crispr.sprite(this, "images/minimap_layer_2.png");

    this.container.addChild(this.layer1);
    this.container.addChild(this.layer2);
    this.container.addChild(this.links);

    const starCount = levels.countStars();

    // Add "Want more levels?" to the map
    {
      const index = this.buttons.children.length;
      const even = index % 2 === 0;
      const position = new PIXI.Point(
        crispr.approximate(crispr.width * 0.5 + (even ? -150 : 150), 50),
        crispr.proportion(index, -0.5, 4 - 0.5, 200, crispr.height - 200)
      );

      const levelSprite = crispr.sprite(
        this,
        "images/minimap_want_more_levels.png"
      );

      levelSprite.anchor.set(0.5);
      levelSprite.scale.set(0.9 + Math.random() * 0.2);
      levelSprite.position.copyFrom(position);
      levelSprite.interactive = true;
      levelSprite.buttonMode = true;

      this._on(
        levelSprite,
        "pointertap",
        () => (this._transition = entity.makeTransition("writeUs"))
      );

      this.buttons.addChild(levelSprite);
    }

    // Add each of the levels to the map
    for (const levelName of Object.keys(levels.levels) as levels.LevelName[]) {
      const index = this.buttons.children.length;
      const data = localStorage.getItem(levelName);
      const even = index % 2 === 0;
      const neededStars = levels.getNeededStars(levelName);
      const isAccessible =
        this.isSectionAccessible(levels.getSectionNameOfLevel(levelName)) &&
        starCount >= neededStars;

      // make a button
      const position = new PIXI.Point(
        crispr.approximate(crispr.width * 0.5 + (even ? -150 : 150), 50),
        crispr.proportion(index, -0.5, 4 - 0.5, 200, crispr.height - 200)
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
      } else if (neededStars > 0) {
        const text = crispr.makeText(
          `${Math.min(neededStars, starCount)} / ${neededStars}`,
          {
            fontFamily: "Optimus",
            fill: crispr.yellow,
          }
        );

        text.anchor.set(0.5);
        text.scale.set(0.8);

        levelSprite.addChild(text);
      }

      if (levelName === Main.lastLevel) {
        const circle = new PIXI.Graphics()
          .lineStyle(10, crispr.yellowNumber)
          .drawCircle(0, 25, 165);

        levelSprite.addChild(circle);
      }

      const levelNameToShow =
        levelName.length <= 11 ? levelName : levelName.replace(" ", "\n");
      const text = crispr.makeText(levelNameToShow, {
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

      this._on(levelSprite, "pointertap", () => {
        this._entityConfig.fxMachine.play("validate");

        Main.savedScroll = this.scrollBox.currentScroll.y;
        Main.lastLevel = levelName as levels.LevelName;

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

      if (!isAccessible && !crispr.inDebugMode()) {
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

    // Add the trailer button to the map
    {
      const index = this.buttons.children.length;
      const even = index % 2 === 0;
      const position = new PIXI.Point(
        crispr.approximate(crispr.width * 0.5 + (even ? -150 : 150), 50),
        crispr.proportion(index, -0.5, 4 - 0.5, 200, crispr.height - 200)
      );

      const levelSprite = crispr.sprite(
        this,
        "images/minimap_watch_trailer.png"
      );

      levelSprite.anchor.set(0.5);
      levelSprite.scale.set(0.9 + Math.random() * 0.2);
      levelSprite.position.copyFrom(position);
      levelSprite.interactive = true;
      levelSprite.buttonMode = true;

      this._on(levelSprite, "pointertap", () => {
        this._transition = entity.makeTransition("video");
      });

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
    this.scrollBox.scrollTo(new PIXI.Point(0, Main.savedScroll));
    this.scrollBox.refresh();

    this._entityConfig.container.addChild(this.container);
    this._entityConfig.minimap = this;
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

  private isSectionAccessible(sectionName: levels.SectionName): boolean {
    const entries = Object.entries(levels.sections);
    const previousSectionEntry = entries.find((entry, i, arr) => {
      return arr[i + 1]?.[0] === sectionName;
    });

    if (previousSectionEntry) {
      return levels
        .getLevelNamesOfSection(previousSectionEntry[0] as levels.SectionName)
        .every((name) => {
          return levels.levelIsPassed(name);
        });
    } else {
      // is not last section
      return (
        entries.findIndex(([name]) => name === sectionName) !==
        entries.length - 1
      );
    }
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
    if (!oldResults || oldResults.starCount < results.starCount)
      localStorage.setItem(l.name, JSON.stringify(results));
  }
}
