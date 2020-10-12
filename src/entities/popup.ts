import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";
import * as util from "booyah/src/util";

import * as anim from "../animations";
import * as crisprUtil from "../crisprUtil";

import * as level from "../scenes/level";

export interface PopupOptions {
  withBackground: boolean;
  closeOnBackgroundClick: boolean;
  adjustHeight: boolean;
  height: number;
  width: number;
}

export const defaultPopupOptions = {
  withBackground: false,
  closeOnBackgroundClick: false,
  width: crisprUtil.width * 0.8, // 864
  height: crisprUtil.height * 0.7, // 1344
  adjustHeight: false,
};

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

  /** popup body container */
  public readonly container = new PIXI.Container();

  // todo: add an optional popup background as sprite

  constructor(public readonly options: Partial<PopupOptions>) {
    super();

    this.options = util.fillInOptions(options, defaultPopupOptions);

    this._id = "popup";

    this.container.position.set(
      this.options.width * -0.5,
      this.options.height * -0.5
    );
    this._container.position.set(crisprUtil.width / 2, crisprUtil.height / 2);
    this._container.addChild(this.container);

    this.shaker = new anim.DisplayObjectShakesManager(this.container);
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get center(): PIXI.Point {
    return new PIXI.Point(this.width / 2, this.height / 2);
  }

  get width(): number {
    return this.options.width;
  }

  get height(): number {
    return this.options.adjustHeight
      ? this.background?.height || this._container.height
      : this.options.height;
  }

  heightByPercentage(percent: number): number {
    return crisprUtil.proportion(percent, 0, 100, 0, this.height);
  }

  setup(frameInfo: entity.FrameInfo, entityConfig: entity.EntityConfig) {
    super.setup(frameInfo, entityConfig);

    // background
    if (this.options.withBackground) {
      this.background = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[
          "images/popup_background.png"
        ].texture
      );

      this.container.addChildAt(this.background, 0);

      // use background as closure button
      if (this.options.closeOnBackgroundClick) {
        this.button(this.background, () => {
          this.close();
        });
      }
    }

    this.level.disablingAnimations.add(this._id);

    this._entityConfig.container.addChild(this._container);

    this._activateChildEntity(anim.popup(this._container, 700));

    this._activateChildEntity(this.shaker);
  }

  update(frameInfo: entity.FrameInfo) {
    super.update(frameInfo);

    if (this.options.withBackground) {
      this.background.width = this.width;
      this.background.height = this.height;
    }
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
    super({
      withBackground: true,
      closeOnBackgroundClick: true,
    });
  }

  protected _setup() {
    const checks: { [k: string]: boolean } = {
      "Max score reached": this.level.score >= this.level.options.maxScore,
      "No virus has escaped": !this.level.someVirusHasEscaped,
    };

    if (this.level.options.disableBonuses) {
      checks["Not infected"] = !this.level.wasInfected;
    } else {
      checks["No bonus used"] = !this.level.bonusesManager.wasBonusUsed;
    }

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
          this.level.options.maxScore,
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
              crisprUtil.proportion(
                value,
                0,
                this.level.options.maxScore,
                0,
                100,
                true
              )
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

          this._activateChildEntity(anim.popup(star, 400, resolve));
        },
      });
    }
  }
}

export class TutorialPopup extends Popup {
  private text: PIXI.Text;
  private content: PIXI.Text;

  constructor(
    public _options: {
      title: string;
      content: string;
      exampleImage?: PIXI.Sprite;
    }
  ) {
    super({
      withBackground: true,
      closeOnBackgroundClick: true,
      adjustHeight: true,
    });
  }

  protected _setup() {
    this.text = crisprUtil.makeText(this._options.title, {
      fontSize: 150,
      fill: 0xffffff,
      wordWrapWidth: this.width * 0.9,
      wordWrap: true,
    });

    this.content = crisprUtil.makeText(this._options.content, {
      fill: 0xffffff,
      wordWrapWidth: this.width * 0.9,
      wordWrap: true,
    });

    this.container.addChild(this.text);
    this.container.addChild(this.content);
  }

  protected _update() {
    this.text.position.set(this.center.x, this.text.height / 2);
    this.content.position.copyFrom(this.center);
  }
}
