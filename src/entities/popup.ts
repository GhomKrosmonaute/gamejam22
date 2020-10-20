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
  logoSize: number;
  from: PIXI.Point;
  keepOnReset: boolean;
  minimizeOnSetup: boolean;
  minimizeOnClose: boolean;
  withBackground: boolean;
  withClosureCross: boolean;
  closeOnBackgroundClick: boolean;
  closeOnBodyClick: boolean;
  adjustHeight: boolean;
  height: number;
  width: number;
  animationDuration: number;
  onClose: (popup: Popup) => void;
}

export const defaultPopupOptions: PopupOptions = {
  logo: "",
  logoSize: 150,
  from: new PIXI.Point(crisprUtil.width / 2, crisprUtil.height / 2),
  keepOnReset: false,
  minimizeOnSetup: false,
  minimizeOnClose: false,
  withBackground: false,
  withClosureCross: true,
  closeOnBackgroundClick: false,
  closeOnBodyClick: false,
  width: crisprUtil.width * 0.8, // 864
  height: crisprUtil.height * 0.7, // 1344
  adjustHeight: true,
  animationDuration: 600,
  onClose: () => null,
};

/**
 * Emits:
 * - closed
 * - backgroundLoaded( background: PIXI.Sprite )
 */
export abstract class Popup extends entity.CompositeEntity {
  static minimized: Set<Popup> = new Set();

  protected abstract onSetup(): any;

  public _container: PIXI.Container;

  private _width: number;
  private _height: number;

  private _artificialHeight: number;

  public shaker: anim.ShakesManager;
  public cross?: PIXI.Graphics;
  public body: PIXI.Container;
  public background?: PIXI.Graphics;
  public bodyBackground?: PIXI.Sprite;
  public logo?: PIXI.Text;

  public minimized: boolean;

  constructor(public readonly options: Partial<PopupOptions>) {
    super();

    this.options = util.fillInOptions(options, defaultPopupOptions);
  }

  _setup() {
    this.minimized = false;
    this._artificialHeight = 0;

    this._container = new PIXI.Container();
    this._container.zIndex = 10;
    this._container.position.copyFrom(this.options.from);

    this.body = new PIXI.Container();

    this._container.addChild(this.body);

    this.shaker = new anim.ShakesManager(this.body);

    this._width = this.options.width;
    this._height = this.options.adjustHeight ? 0 : this.options.height;

    this.body.position.x = this._width * -0.5;

    if (this.options.minimizeOnClose) {
      Popup.minimized.add(this);
    }

    if (!this.options.minimizeOnSetup) {
      this.level.disablingAnimation("popup", true);
    }

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

            this.button(this.background, this.defaultClosure);

            this._container.addChildAt(this.background, 0);
          }

          // close on body click
          if (this.options.closeOnBodyClick) {
            this.button(this.body, this.defaultClosure);
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
            this.button(this.cross, this.defaultClosure);
          }

          // unicode logo
          if (this.options.logo) {
            this.logo = crisprUtil.makeText(this.options.logo, {
              fontSize: this.options.logoSize,
            });
            this.logo.position.set(this.center.x, 100);
            this.body.addChild(this.logo);
          }

          this._entityConfig.container.addChild(this._container);

          this._activateChildEntity(this.shaker);

          this.onSetup();

          if (this.options.minimizeOnSetup) {
            this.minimize({ animated: false });
          } else {
            this._activateChildEntity(
              new entity.ParallelEntity([
                anim.popup(this._container, 700),
                new tween.Tween({
                  duration: this.options.animationDuration,
                  obj: this._container,
                  property: "position",
                  from: this.options.from,
                  to: new PIXI.Point(
                    crisprUtil.width / 2,
                    crisprUtil.height / 2
                  ),
                  easing: easing.easeOutBack,
                  interpolate: tween.interpolation.point,
                }),
              ])
            );
          }
        }),
      ])
    );
  }

  _teardown() {
    Popup.minimized.delete(this);
    this.level.disablingAnimation("popup", false);
    this.shaker.removeAllShakes();
    this.body.removeChildren();
    this._container.removeChildren();
    this._entityConfig.container.removeChild(this._container);
    this._container = null;
    this.logo = null;
    this.body = null;
    this.bodyBackground = null;
    this.minimized = null;
    this._height = 0;
    this._width = 0;
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get center(): PIXI.Point {
    return new PIXI.Point(this.width / 2, this.height / 2);
  }

  get width(): number {
    return this._width;
  }

  set width(n) {
    this._width = n;

    if (this.options.withBackground && this.bodyBackground) {
      this.bodyBackground.width = this._width + 100;
    }

    this.body.position.x = this._width * -0.5 - 50;
  }

  get height(): number {
    return this._height;
  }

  set height(n) {
    this._height = n;

    if (this.options.withBackground && this.bodyBackground) {
      this.bodyBackground.height = this._height + 100;
    }

    this.body.position.y = this._height * -0.5 - 50;
  }

  addRow(container: PIXI.Container, height?: number): this {
    height = height ?? container.height;

    container.position.y += this.height;

    this.body.addChild(container);

    this._artificialHeight += height;

    this.height += height;

    return this;
  }

  defaultClosure = () => {
    if (this.options.minimizeOnClose) this.minimize();
    else this.close();
  };

  close() {
    this._activateChildEntity(
      new entity.ParallelEntity([
        anim.sink(this._container, 150, () => {
          this.options.onClose(this);
          this.emit("closed");
          this.level.emit("closedPopup", this);
          this._transition = entity.makeTransition();
        }),
        new tween.Tween({
          duration: this.options.animationDuration,
          obj: this._container,
          property: "position",
          from: new PIXI.Point(crisprUtil.width / 2, crisprUtil.height / 2),
          to: this.options.from,
          easing: easing.easeOutBack,
          interpolate: tween.interpolation.point,
        }),
      ])
    );
  }

  minimize(options?: { animated?: boolean }) {
    const animated = options?.animated ?? true;

    this.minimized = !this.minimized;

    this.level.disablingAnimations[this.minimized ? "delete" : "add"]("popup");

    const minimizedY = 170 * [...Popup.minimized].indexOf(this);

    const context: entity.Entity[] = [];

    if (this.minimized) {
      this._container.zIndex = 1;
      this.body.children.forEach((child) => (child.visible = false));
      this.background.visible = false;
      this.logo.visible = true;

      this.bodyBackground.visible = true;
      this.bodyBackground.buttonMode = true;
      this.bodyBackground.interactive = true;

      this._once(this.bodyBackground, "pointerup", () => {
        this.minimize();
      });

      if (animated) {
        context.push(
          new tween.Tween({
            duration: this.options.animationDuration,
            from: this.width,
            to: 50,
            easing: easing.easeOutBack,
            onUpdate: (value) => (this.width = value),
          }),
          new tween.Tween({
            duration: this.options.animationDuration,
            from: this.height,
            to: 50,
            easing: easing.easeOutBack,
            onUpdate: (value) => (this.height = value),
          }),
          new tween.Tween({
            obj: this._container,
            property: "position",
            duration: this.options.animationDuration,
            from: this._container.position.clone(),
            to: new PIXI.Point(crisprUtil.width - 100, 325 + minimizedY),
            interpolate: tween.interpolation.point,
            easing: easing.easeOutBack,
            onTeardown: () => {
              this.emit("minimized");
              this.level.emit("minimizedPopup", this);
            },
          })
        );

        if (this.logo) {
          context.push(
            new tween.Tween({
              obj: this.logo,
              property: "position",
              duration: this.options.animationDuration,
              from: this.logo.position.clone(),
              to: new PIXI.Point(75, 25),
              easing: easing.easeOutBack,
              interpolate: tween.interpolation.point,
            }),
            new tween.Tween({
              from: this.options.logoSize,
              to: this.options.logoSize * 0.75,
              easing: easing.easeOutBack,
              onUpdate: (value) => (this.logo.style.fontSize = value),
              duration: this.options.animationDuration,
            })
          );
        }
      } else {
        this.width = 50;
        this.height = 50;
        this._container.position.set(crisprUtil.width - 100, 325 + minimizedY);

        if (this.logo) {
          this.logo.position.set(75, 25);
          this.logo.style.fontSize = this.options.logoSize * 0.75;
        }

        this.emit("minimized");
        this.level.emit("minimizedPopup", this);
      }
    } else {
      this._container.zIndex = 10;
      this.bodyBackground.buttonMode = false;
      this.bodyBackground.interactive = false;

      context.push(
        new tween.Tween({
          duration: this.options.animationDuration,
          from: 50,
          to: this.options.width,
          easing: easing.easeOutBack,
          onUpdate: (value) => (this.width = value - 100),
        }),
        new tween.Tween({
          duration: this.options.animationDuration,
          from: 50,
          to: this._artificialHeight,
          easing: easing.easeOutBack,
          onUpdate: (value) => (this.height = value),
        }),
        new tween.Tween({
          obj: this._container,
          property: "position",
          duration: this.options.animationDuration,
          from: new PIXI.Point(crisprUtil.width - 100, 325 + minimizedY),
          to: new PIXI.Point(crisprUtil.width / 2, crisprUtil.height / 2),
          interpolate: tween.interpolation.point,
          easing: easing.easeOutBack,
          onTeardown: () => {
            this.body.children.forEach((child) => (child.visible = true));
            this.background.visible = true;
          },
        })
      );

      if (this.logo) {
        context.push(
          new tween.Tween({
            obj: this.logo,
            property: "position",
            duration: this.options.animationDuration,
            from: this.logo.position.clone(),
            easing: easing.easeOutBack,
            to: new PIXI.Point(this.options.width / 2, 100),
            interpolate: tween.interpolation.point,
          }),
          new tween.Tween({
            from: this.logo.style.fontSize,
            to: this.options.logoSize,
            easing: easing.easeOutBack,
            onUpdate: (value) => (this.logo.style.fontSize = value),
            duration: this.options.animationDuration,
          })
        );
      }
    }

    this._activateChildEntity(new entity.ParallelEntity(context));
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
    this.level.disablingAnimation("popup", false);
  }
}

export abstract class ChecksPopup extends Popup {
  protected addCheckRows(): this {
    const results = this.level.checkAndReturnsResults();

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
      onClose: (popup) => popup.level.exit(),
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
    const results = this.level.checkAndReturnsResults();

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
          waitForAllSteps: true,
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
      minimizeOnClose: true,
      withBackground: true,
      closeOnBackgroundClick: true,
      adjustHeight: true,
      keepOnReset: true,
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
