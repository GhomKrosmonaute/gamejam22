import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";
import * as util from "booyah/src/util";

import * as anim from "../animations";
import * as crisprUtil from "../crisprUtil";

import * as level from "../scenes/level";

export function makeCross(radius: number): PIXI.Graphics {
  return new PIXI.Graphics()
    .beginFill(0xffffff)
    .drawCircle(0, 0, radius)
    .endFill()
    .lineStyle(radius / 6, 0x000000)
    .moveTo(radius * -0.3, radius * -0.3)
    .lineTo(radius * 0.3, radius * 0.3)
    .moveTo(radius * -0.3, radius * 0.3)
    .lineTo(radius * 0.3, radius * -0.3);
}

export interface PopupOptions {
  logo: string;
  from: PIXI.Point;
  withBackground: boolean;
  withClosureCross: boolean;
  closeOnBackgroundClick: boolean;
  closeOnBodyClick: boolean;
  adjustHeight: boolean;
  height: number;
  width: number;
  onClose: (level: level.Level) => any;
}

export const defaultPopupOptions: PopupOptions = {
  logo: "",
  from: new PIXI.Point(crisprUtil.width / 2, crisprUtil.height / 2),
  withBackground: false,
  withClosureCross: true,
  closeOnBackgroundClick: false,
  closeOnBodyClick: false,
  width: crisprUtil.width * 0.8, // 864
  height: crisprUtil.height * 0.7, // 1344
  adjustHeight: false,
  onClose: () => null,
};

/**
 * Emits:
 * - closed
 * - backgroundLoaded( background: PIXI.Sprite )
 */
export abstract class Popup extends entity.CompositeEntity {
  protected abstract onSetup(): any;

  private _container: PIXI.Container;
  private _height: number;

  public shaker: anim.ShakesManager;
  public cross?: PIXI.Graphics;
  public background?: PIXI.Graphics;
  public bodyBackground?: PIXI.Sprite;
  public logo?: PIXI.Text;

  public readonly body = new PIXI.Container();

  constructor(public readonly options: Partial<PopupOptions>) {
    super();

    this.options = util.fillInOptions(options, defaultPopupOptions);
  }

  _setup() {
    this._container = new PIXI.Container();
    this._container.position.copyFrom(this.options.from);
    this._container.addChild(this.body);

    this.shaker = new anim.ShakesManager(this.body);

    this.body.position.x = this.width * -0.5;

    this._height = this.options.adjustHeight ? 0 : this.options.height;

    this.level.disablingAnimations.add("popup");

    this._once(this, "closed", () => {
      this.options.onClose(this.level);
    });

    this._activateChildEntity(
      new entity.EntitySequence([
        new entity.FunctionalEntity({
          requestTransition: () => {
            return (
              !this.level.disablingAnimations.has("sequence.down") &&
              !this.level.disablingAnimations.has("path.crunch")
            );
          },
        }),
        new entity.FunctionCallEntity(() => {
          // use transparent background as closure button
          if (this.options.closeOnBackgroundClick) {
            this.background = new PIXI.Graphics();
            this.background
              .beginFill(0x000000, 0.00001)
              .drawRect(
                crisprUtil.width * -0.5,
                crisprUtil.height * -0.5,
                crisprUtil.width,
                crisprUtil.height
              )
              .endFill();

            this.button(this.background, () => {
              this.close();
            });

            this._container.addChildAt(this.background, 0);
          }

          // close on body click
          if (this.options.closeOnBodyClick) {
            this.button(this.body, () => {
              this.close();
            });
          }

          // background of body
          if (this.options.withBackground) {
            this.bodyBackground = new PIXI.Sprite(
              this._entityConfig.app.loader.resources[
                "images/popup_background.png"
              ].texture
            );

            this.body.addChild(this.bodyBackground);

            this.bodyBackground.width = this.width;
            this.bodyBackground.position.y = -50;
          }

          // closure cross
          if (this.options.withClosureCross) {
            this.cross = makeCross(50);
            this.cross.position.set(this.width - 150, 75);
            this.button(this.cross, () => {
              this.close();
            });
          }

          // unicode logo
          if (this.options.logo) {
            this.logo = crisprUtil.makeText(this.options.logo, {
              fontSize: 150,
            });
            this.logo.position.set(this.center.x, 100);
            this.body.addChild(this.logo);
          }

          this._entityConfig.container.addChild(this._container);

          this._activateChildEntity(
            new entity.ParallelEntity([
              anim.popup(this._container, 700),
              new tween.Tween({
                duration: 700,
                obj: this._container,
                property: "position",
                from: this.options.from,
                to: new PIXI.Point(crisprUtil.width / 2, crisprUtil.height / 2),
                easing: easing.easeOutBack,
                interpolate: tween.interpolation.point,
              }),
            ])
          );
          this._activateChildEntity(this.shaker);

          this.onSetup();
        }),
      ])
    );
  }

  _teardown() {
    this.level.disablingAnimations.delete("popup");
    this.shaker.removeAllShakes();
    this.body.removeChildren();
    this._container.removeChildren();
    this._entityConfig.container.removeChild(this._container);
    this._container = null;
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

    if (this.options.withBackground && this.bodyBackground) {
      this.bodyBackground.height = this._height + 100;
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

  close() {
    this._activateChildEntity(
      new entity.ParallelEntity([
        anim.sink(this._container, 150, () => {
          this.emit("closed");
          this.level.emit("closedPopup", this);
          this._transition = entity.makeTransition();
        }),
        new tween.Tween({
          duration: 200,
          obj: this._container,
          property: "position",
          from: new PIXI.Point(crisprUtil.width / 2, crisprUtil.height / 2),
          to: this.options.from,
          interpolate: tween.interpolation.point,
        }),
      ])
    );
  }

  button(button: PIXI.Container, callback: () => any) {
    if (
      !this.body.children.includes(button) &&
      button !== this.body &&
      button !== this.background
    ) {
      this.addRow(button, 150);
    }
    button.buttonMode = true;
    button.interactive = true;
    this._on(button, "pointerup", () => {
      callback();
    });
  }
}

export class FloatingPopup extends Popup {
  onSetup() {
    this.level.disablingAnimations.delete("popup");
  }
}

export abstract class ChecksPopup extends Popup {
  protected addCheckRows(): this {
    const results = this.level.getResults();

    for (const text in results.checks) {
      const check = results.checks[text];

      const row = new PIXI.Container();

      const pixiText = crisprUtil.makeText(text, {
        stroke: 0xffffff,
        strokeThickness: 15,
      });

      pixiText.position.set(this.center.x, 50);

      row.addChild(pixiText);

      const icon = crisprUtil.makeText(check ? "✅" : "❌", {
        align: "right",
        strokeThickness: 20,
        stroke: 0x000000,
      });

      icon.position.set(this.width - 100, 50);

      row.addChild(icon);

      this.addRow(row, 100);
    }

    return this;
  }
}

export abstract class EndOfLevelPopup extends ChecksPopup {
  constructor() {
    super({
      adjustHeight: true,
      withBackground: true,
      withClosureCross: false,
      closeOnBackgroundClick: true,
      onClose: (level) => level.exit(),
    });
  }
}

export class FailedLevelPopup extends EndOfLevelPopup {
  onSetup() {
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

    this.addCheckRows();
  }
}

export class TerminatedLevelPopup extends EndOfLevelPopup {
  onSetup() {
    const results = this.level.getResults();

    // add star-based children
    {
      let title: PIXI.Text;

      if (results.starCount === 3) {
        title = crisprUtil.makeText("Awesome!", {
          fontSize: 250,
          stroke: 0xffffff,
          strokeThickness: 10,
        });
      } else if (results.starCount === 2) {
        title = crisprUtil.makeText("Great!", {
          fontSize: 200,
          stroke: 0xffffff,
          strokeThickness: 10,
        });
      } else if (results.starCount === 1) {
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

      this.addRow(stars, 200);

      this._activateChildEntity(
        anim.sequenced({
          items: new Array(3).fill(0),
          timeBetween: 200,
          delay: 500,
          onStep: (item, index) => {
            const star = new PIXI.Sprite(
              this._entityConfig.app.loader.resources["images/star.png"].texture
            );

            star.scale.set(0);
            star.anchor.set(0.5);

            if (index >= results.starCount) {
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

            return anim.popup(star, 400);
          },
        })
      );
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

    this.addCheckRows();
  }
}

export class TutorialPopup extends Popup {
  private text: PIXI.Text;
  private content: PIXI.Text;
  private image?: PIXI.Sprite | entity.AnimatedSpriteEntity;

  constructor(
    public _options: {
      title: string;
      content: string;
      image?: string;
      popupOptions?: Partial<PopupOptions>;
    }
  ) {
    super({
      withBackground: true,
      closeOnBackgroundClick: true,
      adjustHeight: true,
      logo: "🧬",
      ...(_options.popupOptions ?? {}),
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

    if (this._options.image) {
      if (this._options.image.endsWith(".json")) {
        this.image = util.makeAnimatedSprite(
          this._entityConfig.app.loader.resources[this._options.image]
        );
        this._activateChildEntity(this.image);
      } else {
        this.image = new PIXI.Sprite(
          this._entityConfig.app.loader.resources[this._options.image].texture
        );
      }
    }

    this.text.position.set(this.center.x, 150);
    this.content.position.set(this.center.x, this.content.height / 2);

    this.addRow(this.text, 300).addRow(this.content);

    if (this._options.image) {
      const sprite =
        this.image instanceof PIXI.Sprite ? this.image : this.image.sprite;
      sprite.anchor.set(0.5);
      const ratioWH = sprite.height / sprite.width;
      sprite.width = this.width / 3;
      sprite.height = sprite.width * ratioWH;
      sprite.position.set(this.center.x, sprite.height / 2 + 50);
      this.addRow(sprite, sprite.height + 100);
    }
  }
}

export class StatePopup extends ChecksPopup {
  constructor() {
    super({
      closeOnBackgroundClick: true,
      withBackground: true,
      adjustHeight: true,
      from: new PIXI.Point(200, 100),
    });
  }

  onSetup() {
    const text = crisprUtil.makeText(this.level.name, {
      fontSize: 150,
      fill: 0xffffff,
    });

    text.position.x = this.center.x;
    text.position.y = 100;

    const score = crisprUtil.makeText(
      `Score: ${Math.floor(this.level.score)} / ${
        this.level.options.maxScore
      } pts`,
      {
        fontSize: 100,
        fill: 0xffffff,
      }
    );

    score.position.x = this.center.x;
    score.position.y = 75;

    this.addRow(text, 200).addRow(score, 150).addCheckRows();
  }
}
