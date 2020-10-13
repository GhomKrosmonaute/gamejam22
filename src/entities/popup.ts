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
  onClose: (level: level.Level) => any;
}

export const defaultPopupOptions = {
  withBackground: false,
  closeOnBackgroundClick: false,
  width: crisprUtil.width * 0.8, // 864
  height: crisprUtil.height * 0.7, // 1344
  adjustHeight: false,
  onClose: () => {},
};

/**
 * Emits:
 * - closed
 * - backgroundLoaded( background: PIXI.Sprite )
 */
export abstract class Popup extends entity.CompositeEntity {
  protected abstract onSetup(): any;

  private _id: string;
  private _container = new PIXI.Container();
  private _height: number;

  public shaker: anim.DisplayObjectShakesManager;
  public background?: PIXI.Sprite;

  public readonly body = new PIXI.Container();

  // todo: add an optional popup background as sprite

  constructor(public readonly options: Partial<PopupOptions>) {
    super();

    this.options = util.fillInOptions(options, defaultPopupOptions);

    this._id = "popup:" + Math.random();

    this._container.position.set(crisprUtil.width / 2, crisprUtil.height / 2);
    this._container.addChild(this.body);

    this.shaker = new anim.DisplayObjectShakesManager(this.body);

    this.body.position.x = this.width * -0.5;

    this._height = this.options.adjustHeight ? 0 : this.options.height;
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
    return this._height;
  }

  set height(n) {
    this._height = n;

    if (this.options.withBackground && this.background) {
      this.background.height = this._height + 100;
    }

    this.body.position.y = this._height * -0.5;
  }

  addRow(container: PIXI.Container, height?: number): this {
    height = height ?? container.height;

    container.position.y += this.height;

    this.body.addChild(container);

    this.height += height;

    return this;
  }

  _setup() {
    this.level.disablingAnimations.add(this._id);
    this.level.disablingAnimations.add("popup");

    this._once(this, "closed", () => {
      this.options.onClose(this.level);
    });

    this._activateChildEntity(
      new entity.EntitySequence([
        new entity.FunctionalEntity({
          requestTransition: () => {
            return (
              !this.level.disablingAnimations.has("sequenceDown") &&
              !this.level.disablingAnimations.has("pathCrunch")
            );
          },
        }),
        new entity.FunctionCallEntity(() => {
          // background
          if (this.options.withBackground) {
            this.background = new PIXI.Sprite(
              this._entityConfig.app.loader.resources[
                "images/popup_background.png"
              ].texture
            );

            this.body.addChildAt(this.background, 0);

            this.background.width = this.width;
            this.background.position.y = -50;

            // use background as closure button
            if (this.options.closeOnBackgroundClick) {
              this.button(this.background, () => {
                this.close();
              });
            }
          }

          this._entityConfig.container.addChild(this._container);

          this._activateChildEntity(anim.popup(this._container, 700));
          this._activateChildEntity(this.shaker);

          this.onSetup();
        }),
      ])
    );
  }

  _teardown() {
    this.level.disablingAnimations.delete(this._id);
    this.level.disablingAnimations.delete("popup");
    this.body.removeChildren();
    this.shaker.removeAllShakes();
    this._container.removeChild(this.body);
    this._entityConfig.container.removeChild(this._container);
  }

  close() {
    this._activateChildEntity(
      anim.sink(this._container, 150, () => {
        this.emit("closed");
        this._transition = entity.makeTransition();
      })
    );
  }

  button(button: PIXI.Container, callback: () => any) {
    if (!this.body.children.includes(button)) {
      this.addRow(button, 150);
    }
    button.buttonMode = true;
    button.interactive = true;
    this._on(button, "pointerup", () => {
      callback();
    });
  }
}

export class FailedLevelPopup extends Popup {
  private checked: { [text: string]: boolean };

  constructor() {
    super({
      adjustHeight: true,
      withBackground: true,
      closeOnBackgroundClick: true,
      onClose: (level) => level.exit(),
    });
  }

  get checks() {
    return this.level.options.checks;
  }

  onSetup() {
    this.checked = {};

    for (const text in this.checks)
      this.checked[text] = this.checks[text](this.level);

    // add title
    {
      let title = crisprUtil.makeText("Failed...", {
        fontSize: 250,
        stroke: 0xffffff,
        strokeThickness: 10,
      });

      title.position.x = this.center.x;
      title.position.y = 90;

      this.addRow(title, 350);
    }

    // add lines
    {
      Object.entries(this.checked).map(([key, check], i) => {
        const line = new PIXI.Container();

        const text = crisprUtil.makeText(key, {
          stroke: 0xffffff,
          strokeThickness: 10,
        });

        text.position.set(this.center.x, 50);

        line.addChild(text);

        const icon = crisprUtil.makeText(check ? "✅" : "❌", {
          align: "right",
          strokeThickness: 20,
          stroke: 0x000000,
        });

        icon.position.set(this.width - 100, 50);

        line.addChild(icon);

        this.addRow(line, 100);
      });
    }
  }
}

export class TerminatedLevelPopup extends Popup {
  private checked: { [text: string]: boolean };
  private starCount: number; // sur 3
  private checkCount: number;
  private checkedCount: number;

  constructor() {
    super({
      adjustHeight: true,
      withBackground: true,
      closeOnBackgroundClick: true,
      onClose: (level) => level.exit(),
    });
  }

  get checks() {
    return this.level.options.checks;
  }

  onSetup() {
    this.checked = {};

    for (const text in this.checks)
      this.checked[text] = this.checks[text](this.level);

    this.checkCount = Object.values(this.checks).length;
    this.checkedCount = Object.values(this.checked).filter(
      (check) => check === true
    ).length;
    this.starCount = Math.round((this.checkedCount / this.checkCount) * 3);

    // add star-based children
    {
      let title: PIXI.Text;

      if (this.starCount === 3) {
        title = crisprUtil.makeText("Awesome!", {
          fontSize: 250,
          stroke: 0xffffff,
          strokeThickness: 10,
        });
      } else if (this.starCount === 2) {
        title = crisprUtil.makeText("Great!", {
          fontSize: 200,
          stroke: 0xffffff,
          strokeThickness: 10,
        });
      } else if (this.starCount === 1) {
        title = crisprUtil.makeText("Well done", {
          fontSize: 150,
          stroke: 0xffffff,
          strokeThickness: 10,
        });
      } else {
        title = crisprUtil.makeText("Too bad...", {
          fontSize: 100,
          stroke: 0xffffff,
          strokeThickness: 10,
        });
        // todo: retry button
      }

      title.position.x = this.center.x;
      title.position.y = 90;

      this.addRow(title, 350);
    }

    // add stars
    {
      const stars = new PIXI.Container();

      anim.sequenced({
        sequence: new Array(3).fill(0),
        timeBetween: 200,
        delay: 500,
        onStep: (resolve, _, index) => {
          const star = new PIXI.Sprite(
            this._entityConfig.app.loader.resources["images/star.png"].texture
          );

          star.scale.set(0);
          star.anchor.set(0.5);

          if (index >= this.starCount) {
            star.tint = 0x666666;
          }

          switch (index) {
            case 0:
              star.position.x = this.center.x / 2 - 50;
              star.angle = -10;
              break;
            case 1:
              star.position.x = this.center.x;
              star.position.y = -20;
              break;
            case 2:
              star.position.x = this.center.x + this.center.x / 2 + 50;
              star.angle = 10;
              break;
          }

          stars.addChild(star);

          this._activateChildEntity(anim.popup(star, 400, resolve));
        },
      });

      this.addRow(stars, 200);
    }

    // add score
    if (!this.level.options.disableScore) {
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
          fontSize: 85,
          fill: 0xffffff,
          strokeThickness: 20,
          stroke: 0x000000,
        }
      );

      score.position.set(this.center.x, 40);

      score.scale.set(0);

      this.addRow(score, 100);

      this._activateChildEntity(anim.popup(score, 800));
      this._activateChildEntity(
        new tween.Tween({
          from: 0,
          to: this.level.score,
          easing: easing.easeInQuad,
          duration: 1000,
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

    // add lines
    {
      Object.entries(this.checked).map(([key, check], i) => {
        const line = new PIXI.Container();

        const text = crisprUtil.makeText(key, {
          stroke: 0xffffff,
          strokeThickness: 10,
        });

        text.position.set(this.center.x, 50);

        line.addChild(text);

        const icon = crisprUtil.makeText(check ? "✅" : "❌", {
          align: "right",
          strokeThickness: 20,
          stroke: 0x000000,
        });

        icon.position.set(this.width - 100, 50);

        line.addChild(icon);

        this.addRow(line, 100);
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

  onSetup() {
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

    this.text.position.set(this.center.x, 150);

    this.content.position.set(this.center.x, 200);

    this.addRow(this.text, 300).addRow(this.content, 400);
  }
}
