import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as anim from "../animations";
import * as crisprUtil from "../crisprUtil";

import * as level from "../scenes/level";

/**
 * Emits:
 * - closed
 * - backgroundLoaded( background: PIXI.Sprite )
 */
export abstract class Popup extends entity.CompositeEntity {
  private _id: string;
  private _container = new PIXI.Container();

  public shaker: anim.DisplayObjectShakesManager;
  public background?: PIXI.Sprite;

  public readonly width = crisprUtil.width * 0.8; // 864
  public readonly height = crisprUtil.height * 0.7; // 1344
  public readonly center = new PIXI.Point(this.width / 2, this.height / 2);

  /** popup body container */
  public readonly container = new PIXI.Container();

  // todo: add an optional popup background as sprite

  constructor(public readonly withBackground: boolean = false) {
    super();
    this._id = "popup:" + Math.random();

    this.container.position.set(this.width * -0.5, this.height * -0.5);
    this._container.position.set(crisprUtil.width / 2, crisprUtil.height / 2);
    this._container.addChild(this.container);

    this.shaker = new anim.DisplayObjectShakesManager(this.container);
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  setup(frameInfo: entity.FrameInfo, entityConfig: entity.EntityConfig) {
    super.setup(frameInfo, entityConfig);

    // background
    if (this.withBackground) {
      this.background = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[
          "images/popup_background.png"
        ].texture
      );
      this.background.width = this.width;
      this.background.height = this.height;

      this.container.addChildAt(this.background, 0);
      this.emit("backgroundLoaded", this.background);
    }

    this.level.disablingAnimations.add(this._id);

    this._entityConfig.container.addChild(this._container);

    this._activateChildEntity(anim.popup(this._container, 700));

    this._activateChildEntity(this.shaker);
  }

  /**
   * In order:
   * 1. animate popup closure
   * 2. clean all containers
   * 3. clean all shakers
   * 4. reactivate level interactions
   * 5. make transition
   * 6. emit "closed" event
   */
  close() {
    this._activateChildEntity(
      anim.sink(this._container, 150, () => {
        this.container.removeChildren();
        this._container.removeChild(this.container);
        this._entityConfig.container.removeChild(this._container);
        this.shaker.removeAllShakes();
        this.level.disablingAnimations.delete(this._id);
        this._transition = entity.makeTransition();
        this.emit("closed");
      })
    );
  }

  button(displayObject: PIXI.DisplayObject, callback?: () => any) {
    if (!this.container.children.includes(displayObject)) {
      this.container.addChild(displayObject);
    }
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

export class TerminatedLevelPopup extends Popup {
  // todo: make popup with stars and score of level

  constructor() {
    super(true);
  }

  protected _setup() {
    const checks = {
      "No infection": !this.level.wasInfected,
      "Max score reached": this.level.score >= this.level.maxScore,
      "No virus has escaped": !this.level.someVirusHasEscaped,
    };

    const starCount = Object.values(checks).filter((check) => check).length;

    // add checks content
    {
      Object.entries(checks).map(([key, check], i) => {
        const line = new PIXI.Container();
        line.position.set(0, this.center.y + 300 + i * 100);
        this.container.addChild(line);

        const text = crisprUtil.makeText(key, {
          stroke: 0xffffff,
          strokeThickness: 10,
        });
        text.position.x = this.center.x;
        line.addChild(text);

        const icon = crisprUtil.makeText(check ? "✅" : "❌", {
          align: "right",
          strokeThickness: 20,
          stroke: 0x000000,
        });
        icon.position.x = this.width - 100;
        line.addChild(icon);
      });
    }

    // add star-based children
    {
      let title: PIXI.Text;

      switch (starCount) {
        case 1:
          title = crisprUtil.makeText("Well done", {
            fontSize: 150,
            stroke: 0xffffff,
            strokeThickness: 10,
          });
          break;
        case 2:
          title = crisprUtil.makeText("Great!", {
            fontSize: 200,
            stroke: 0xffffff,
            strokeThickness: 10,
          });
          break;
        case 3:
          title = crisprUtil.makeText("Awesome!", {
            fontSize: 250,
            stroke: 0xffffff,
            strokeThickness: 10,
          });
          break;
        default:
          title = crisprUtil.makeText("Too bad...", {
            fontSize: 100,
            stroke: 0xffffff,
            strokeThickness: 10,
          });
        // todo: retry button
      }

      title.position.set(this.center.x, this.center.y - 500);
      this.container.addChild(title);
    }

    // add score
    {
      const score = crisprUtil.makeText(
        `Score: ${this.level.score} pts (${crisprUtil.proportion(
          this.level.score,
          0,
          this.level.maxScore,
          0,
          100,
          true
        )}%)`,
        {
          fontSize: 100,
          fill: 0xffffff,
          strokeThickness: 20,
          stroke: 0x000000,
        }
      );

      score.position.set(this.center.x, this.center.y + 100);
      score.scale.set(0);

      this.container.addChild(score);

      this._activateChildEntity(anim.popup(score, 800));
      this._activateChildEntity(
        new tween.Tween({
          from: 0,
          to: this.level.score,
          easing: easing.easeInQuad,
          duration: 3000,
          onUpdate: (value) =>
            (score.text = `Score: ${Math.floor(value)} pts (${Math.floor(
              crisprUtil.proportion(value, 0, this.level.maxScore, 0, 100, true)
            )}%)`),
        })
      );
    }

    // add stars
    {
      anim.sequenced({
        sequence: Object.keys(checks),
        timeBetween: 200,
        delay: 500,
        onStep: (resolve, check, index) => {
          const star = new PIXI.Sprite(
            this._entityConfig.app.loader.resources["images/star.png"].texture
          );

          star.scale.set(0);
          star.anchor.set(0.5);

          if (index >= starCount) {
            star.tint = 0x666666;
          }

          star.position.y = this.center.y - 200;

          switch (index) {
            case 0:
              star.position.x = 150;
              star.angle = -10;
              break;
            case 1:
              star.position.x = this.center.x;
              star.position.y -= 30;
              break;
            case 2:
              star.position.x = this.width - 150;
              star.angle = 10;
              break;
          }

          this.container.addChild(star);

          this._activateChildEntity(
            anim.popup(star, 400, () => {
              resolve();
            })
          );
        },
      });
    }

    // use background as closure button
    if (this.withBackground) {
      this._once(this, "backgroundLoaded", (background: PIXI.Sprite) => {
        this.button(background, () => {
          this.close();
        });
      });
    }
  }
}
