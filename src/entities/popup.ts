import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";
import * as util from "booyah/src/util";

import * as anim from "../animations";
import * as crispr from "../crispr";

import * as level from "../scenes/level";
import * as metrics from "../metrics";

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
  id: string;
  logo: string;
  logoScale: number;
  logoPosition: PIXI.IPointData;
  coolDown: number;
  from: PIXI.Point;
  minimizeOnSetup: boolean;
  minimizeOnClose: boolean;
  withBackground: boolean;
  withClosureCross: boolean;
  closeOnBodyClick: boolean;
  closeOnBackgroundClick: boolean;
  adjustHeight: boolean;
  height: number;
  width: number;
  animationDuration: number;
  withBlackBackground: boolean;
  onClose: (popup: Popup) => void;
}

export const defaultPopupOptions: PopupOptions = {
  id: null,
  coolDown: null,
  logo: "",
  logoScale: 0.7,
  logoPosition: new PIXI.Point(),
  from: new PIXI.Point(crispr.width / 2, crispr.height / 2),
  minimizeOnSetup: false,
  minimizeOnClose: false,
  withBackground: false,
  withClosureCross: true,
  withBlackBackground: false,
  closeOnBackgroundClick: false,
  closeOnBodyClick: false,
  width: crispr.width * 0.8, // 864
  height: crispr.height * 0.7, // 1344
  adjustHeight: true,
  animationDuration: 600,
  onClose: () => null,
};

/**
 * Emits:
 * - closed
 * - opened
 * - minimized
 * - backgroundLoaded( background: PIXI.Sprite )
 */
export abstract class Popup extends entity.CompositeEntity {
  static minimized: Set<Popup> = new Set();

  static cleanUpMinimized() {
    for (const popup of [...Popup.minimized]) {
      popup._teardown();
    }
    Popup.minimized.clear();
  }

  protected abstract onSetup(): any;

  public container: PIXI.Container;

  private _setupAt: number;
  private _width: number;

  private _height: number;

  private _artificialHeight: number;
  public cross?: PIXI.Graphics;
  public body: PIXI.Container;
  public background?: PIXI.Graphics;
  public bodyBackground?: PIXI.Sprite;
  public minimizedBackground?: PIXI.Sprite;

  public entityConfigBackgroundContainer: PIXI.Container;

  public logo?: PIXI.Sprite;

  public minimized: boolean;

  constructor(public readonly options: Partial<PopupOptions>) {
    super();

    this.options = util.fillInOptions(options, defaultPopupOptions);
  }

  _setup() {
    this._setupAt = Date.now();
    this.minimized = false;
    this._artificialHeight = 0;

    this.container = new PIXI.Container();
    this.container.zIndex = 10;
    this.container.position.copyFrom(this.options.from);

    this.body = new PIXI.Container();

    this.container.addChild(this.body);

    this._width = this.options.width;
    this._height = this.options.adjustHeight ? 0 : this.options.height;

    this.body.position.x = this._width * -0.5;

    if (this.options.minimizeOnClose) {
      Popup.minimized.add(this);
    }

    this.level.disablingAnimation(this.id, true);

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
          // background of minimized
          if (this.options.minimizeOnClose) {
            this.minimizedBackground = crispr.sprite(
              this,
              "images/popup_background_rounded.png"
            );
            this.minimizedBackground.anchor.set(0.5);
            this.minimizedBackground.position.set(0, -50);
            this.minimizedBackground.scale.set(1.1);
            this.minimizedBackground.visible = false;
            this.minimizedBackground.buttonMode = true;
            this.minimizedBackground.interactive = true;
            this.container.addChildAt(this.minimizedBackground, 0);
          }

          this.entityConfigBackgroundContainer = new PIXI.Container();

          if (this.options.withBlackBackground) {
            if (this.level.variant === "fall") {
              const blackBackground = new PIXI.Graphics()
                .beginFill()
                .drawRect(0, 0, crispr.width, crispr.height)
                .endFill();

              this.entityConfigBackgroundContainer.addChild(blackBackground);
            }
          }

          this._entityConfig.container.addChild(
            this.entityConfigBackgroundContainer
          );

          // background of body
          if (this.options.withBackground) {
            const bodyBackgroundBis = crispr.sprite(
              this,
              "images/popup_background_bis.png"
            );

            this.entityConfigBackgroundContainer.addChild(bodyBackgroundBis);

            this.bodyBackground = crispr.sprite(
              this,
              "images/popup_background.png"
            );

            this.body.addChild(this.bodyBackground);

            this.bodyBackground.width = this.width;
            this.bodyBackground.position.y = -50;
          }

          // closure cross
          if (this.options.withClosureCross) {
            this.cross = makeCross(50);
            this.cross.visible = false;
            this.cross.position.set(this.width - 150, 75);
            this.button(this.cross, this.defaultClosure);
          }

          // logo
          if (this.options.logo) {
            if (this.options.logo === "default")
              this.options.logo = "images/icon.png";
            this.logo = new PIXI.Sprite(
              this._entityConfig.app.loader.resources[this.options.logo].texture
            );
            this.logo.anchor.set(0.5);
            this.logo.scale.set(this.options.logoScale);
            this.logo.position.set(
              this.center.x + this.options.logoPosition.x,
              50 +
                (this.logo.height * this.options.logoScale) / 2 +
                this.options.logoPosition.y
            );
            this.body.addChild(this.logo);
          }

          this._entityConfig.container.addChild(this.container);

          this.onSetup();

          if (this.options.minimizeOnSetup) {
            this.minimize({ animated: false });
          } else {
            this._activateChildEntity(
              new entity.EntitySequence([
                new entity.ParallelEntity([
                  new entity.EntitySequence([
                    new entity.WaitingEntity(0),
                    new entity.FunctionCallEntity(() => {
                      this._playSound();
                    }),
                  ]),
                  anim.popup(this.container, 700),
                  new tween.Tween({
                    duration: this.options.animationDuration,
                    obj: this.container,
                    property: "position",
                    from: this.options.from,
                    to: new PIXI.Point(crispr.width / 2, crispr.height / 2),
                    easing: easing.easeOutBack,
                    interpolate: tween.interpolation.point,
                  }),
                  new entity.EntitySequence([
                    new entity.WaitingEntity(
                      crispr.debug ? 0 : this.options.coolDown ?? 0
                    ),
                    new entity.FunctionCallEntity(() => {
                      // use transparent background as closure button
                      if (this.options.closeOnBackgroundClick) {
                        this.background = new PIXI.Graphics();
                        this.background
                          .beginFill(0x000000, 0.00001)
                          .drawRect(
                            crispr.width * -0.5,
                            crispr.height * -0.5,
                            crispr.width,
                            crispr.height
                          )
                          .endFill();

                        this.button(this.background, this.defaultClosure);

                        this.container.addChildAt(this.background, 0);
                      }

                      // close on body click
                      if (this.options.closeOnBodyClick) {
                        this.button(this.body, this.defaultClosure);
                      }

                      if (this.options.withClosureCross) {
                        this.cross.scale.set(0);
                        this.cross.visible = true;
                        this._activateChildEntity(
                          new tween.Tween({
                            from: 0,
                            to: 1,
                            duration: 300,
                            easing: easing.easeOutBack,
                            onUpdate: (value) => {
                              this.cross.scale.set(value);
                            },
                          })
                        );
                      }
                    }),
                  ]),
                ]),
                new entity.FunctionCallEntity(() => {
                  this.emit("opened");
                  // booyah.changeGameState("paused");
                }),
              ])
            );
          }
        }),
      ])
    );
  }

  _teardown() {
    if (!this.container) return;
    this.emit("closed");
    this.level.disablingAnimation(this.id, false);
    this.body.removeChildren();
    this.container.removeChildren();
    this._entityConfig.container.removeChild(this.container);
    this._entityConfig.container.removeChild(
      this.entityConfigBackgroundContainer
    );
    this._height = 0;
    this._width = 0;
  }

  get id(): string {
    return (
      this.options.id ||
      (Popup.minimized.has(this)
        ? "popup_" + [...Popup.minimized].indexOf(this)
        : "popup")
    );
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
    if (
      !crispr.debug &&
      this.options.coolDown &&
      Date.now() < this._setupAt + this.options.coolDown
    )
      return;

    if (this.options.minimizeOnClose) this.minimize();
    else this.close();
  };

  close() {
    // booyah.changeGameState("playing");
    this.level.disablingAnimation(this.id, false);

    this._activateChildEntity(
      new entity.ParallelEntity([
        anim.sink(this.container, 150, () => {
          this.options.onClose(this);
          this.emit("closed");
          this.level.emitLevelEvent("closedPopup", this);
          this._transition = entity.makeTransition();
          this._entityConfig.container.removeChild(
            this.entityConfigBackgroundContainer
          );
        }),
        new tween.Tween({
          duration: this.options.animationDuration,
          obj: this.container,
          property: "position",
          from: new PIXI.Point(crispr.width / 2, crispr.height / 2),
          to: this.options.from,
          easing: easing.easeOutBack,
          interpolate: tween.interpolation.point,
        }),
      ])
    );
  }

  minimize(options?: { animated?: boolean }) {
    // booyah.changeGameState("playing");

    const animated = options?.animated ?? true;

    this.minimized = !this.minimized;

    this.level.disablingAnimation(this.id, !this.minimized);

    const minimizedY = 190 * [...Popup.minimized].indexOf(this);

    const context: entity.Entity[] = [];

    if (this.minimized) {
      Popup.minimized.forEach((popup) => {
        popup.container.visible = true;
      });

      this.container.zIndex = 1;

      this.body.children.forEach((child) => (child.visible = false));

      this.background.visible = false;

      if (this.logo) this.logo.visible = true;

      this.entityConfigBackgroundContainer.visible = false;

      this._once(this.minimizedBackground, "pointerup", () => {
        this.minimize();
      });

      if (animated) {
        context.push(
          new tween.Tween({
            duration: this.options.animationDuration,
            from: this.width,
            to: 50,
            easing: easing.easeInOutQuad,
            onUpdate: (value) => (this.width = value),
          }),
          new tween.Tween({
            duration: this.options.animationDuration,
            from: this.height,
            to: 50,
            easing: easing.easeInOutQuad,
            onUpdate: (value) => (this.height = value),
          }),
          new tween.Tween({
            obj: this.container,
            property: "position",
            duration: this.options.animationDuration,
            from: this.container.position.clone(),
            to: new PIXI.Point(crispr.width - 100, 600 + minimizedY),
            interpolate: tween.interpolation.point,
            easing: easing.easeInOutQuad,
            onTeardown: () => {
              this.minimizedBackground.visible = true;

              this.emit("minimized");
              this.level.emitLevelEvent("minimizedPopup", this);
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
              easing: easing.easeInOutQuad,
              interpolate: tween.interpolation.point,
            }),
            new tween.Tween({
              from: this.options.logoScale,
              to: this.options.logoScale * 0.75,
              easing: easing.easeInOutQuad,
              onUpdate: (value) => this.logo.scale.set(value),
              duration: this.options.animationDuration,
            })
          );
        }
      } else {
        this.width = 50;
        this.height = 50;
        this.container.position.set(crispr.width - 100, 600 + minimizedY);

        if (this.logo) {
          this.logo.position.set(75, 25);
          this.logo.scale.set(this.options.logoScale * 0.75);
        }

        this.emit("minimized");
        this.level.emitLevelEvent("minimizedPopup", this);
      }
    } else {
      this.container.zIndex = 10;

      this.minimizedBackground.visible = false;
      this.bodyBackground.interactive = false;
      this.bodyBackground.buttonMode = false;
      this.entityConfigBackgroundContainer.visible = true;

      Popup.minimized.forEach((popup) => {
        if (popup.minimized) popup.container.visible = false;
      });

      context.push(
        new tween.Tween({
          duration: this.options.animationDuration,
          from: 50,
          to: this.options.width,
          easing: easing.easeInOutQuad,
          onUpdate: (value) => (this.width = value - 100),
        }),
        new tween.Tween({
          duration: this.options.animationDuration,
          from: 50,
          to: this._artificialHeight,
          easing: easing.easeInOutQuad,
          onUpdate: (value) => (this.height = value),
        }),
        new tween.Tween({
          obj: this.container,
          property: "position",
          duration: this.options.animationDuration,
          from: new PIXI.Point(crispr.width - 100, 600 + minimizedY),
          to: new PIXI.Point(crispr.width / 2, crispr.height / 2),
          interpolate: tween.interpolation.point,
          easing: easing.easeInOutQuad,
          onTeardown: () => {
            this.body.children.forEach((child) => (child.visible = true));
            this.background.visible = true;
            // booyah.changeGameState("paused");
            this.level.disablingAnimation(this.id, true);
            this.emit("opened");
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
            easing: easing.easeInOutQuad,
            to: new PIXI.Point(
              this.options.width / 2 + this.options.logoPosition.x,
              50 +
                (this.logo.height * this.options.logoScale) / 2 +
                this.options.logoPosition.y
            ),
            interpolate: tween.interpolation.point,
          }),
          new tween.Tween({
            from: this.logo.scale.x,
            to: this.options.logoScale,
            easing: easing.easeInOutQuad,
            onUpdate: (value) => this.logo.scale.set(value),
            duration: this.options.animationDuration,
          })
        );
      }
    }

    this._activateChildEntity(new entity.ParallelEntity(context));
  }

  button(button: PIXI.Container, callback: () => any) {
    if (
      !this.body?.children.includes(button) &&
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

  protected _playSound() {
    this._entityConfig.fxMachine.play("notification");
  }
}

export class FloatingPopup extends Popup {
  onSetup() {
    this.level.disablingAnimation(this.id, false);
  }
}

export abstract class ChecksPopup extends Popup {
  protected addCheckRows(): this {
    const results = this.level.checkAndReturnsResults();

    for (const text in results.checks) {
      const check = results.checks[text];

      const row = new PIXI.Container();

      const pixiText = crispr.makeText(text + ".", {
        fill: check ? crispr.yellow : "#ffffff",
        fontSize: 60,
        fontStyle: "italic bold",
      });

      pixiText.position.set(this.center.x, 50);

      row.addChild(pixiText);

      const icon = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[
          `images/reward_${check ? "check" : "cross"}.png`
        ].texture
      );

      icon.position.set(
        this.width - 140 + (check ? 0 : 30),
        5 + (check ? 0 : 30)
      );

      row.addChild(icon);

      this.addRow(row, 100);
    }

    return this;
  }
}

export abstract class EndOfLevelPopup extends ChecksPopup {
  protected title?: PIXI.Text;
  protected titleConfig: Partial<PIXI.TextStyle> = {
    fontSize: 150,
    fill: crispr.yellow,
    fontStyle: "italic bold",
    fontFamily: "Alien League",
  };

  constructor() {
    super({
      adjustHeight: true,
      withBackground: true,
      withClosureCross: false,
      closeOnBackgroundClick: true,
      onClose: (popup) => popup.level.exit(true),
    });

    this._once(this, "opened", () => {
      this.level.emitLevelEvent("end");
    });
  }

  setTitle(title: string, config: Partial<PIXI.TextStyle> = {}) {
    if (this.title) this.container.removeChild(this.title);

    const dotted = title
      .replace(/\./g, "")
      .split(" ")
      .map((word) => word.split("").join("."))
      .join(" ")
      .toUpperCase();

    this.title = crispr.makeText(dotted, {
      ...this.titleConfig,
      ...config,
    });

    this.title.position.y = -600;
    this.container.addChild(this.title);
  }
}

export class FailedLevelPopup extends EndOfLevelPopup {
  constructor() {
    super();
    this.options.onClose = (popup) => popup.level.exit();
  }

  onSetup() {
    Popup.cleanUpMinimized();
    // add title
    this.setTitle("Failed");
    this.addCheckRows();

    const results = this.level.checkAndReturnsResults();
    metrics.logEvent("level_end", {
      level_name: this.level.name,
      success: false,
      results,
    });
  }
}

export class TerminatedLevelPopup extends EndOfLevelPopup {
  onSetup() {
    Popup.cleanUpMinimized();

    this.level.finished = true;

    const results = this.level.checkAndReturnsResults();

    // add star-based children
    if (results.starCount === 3) {
      this.setTitle("Awesome");
    } else if (results.starCount === 2) {
      this.setTitle("Great");
    } else if (results.starCount === 1) {
      this.setTitle("Well done");
    } else {
      this.setTitle("Too bad");
      // todo: retry button
    }

    this.level.screenShake(50, 1.1, 400);

    // add stars
    {
      const stars = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[
          `images/reward_stars_${results.starCount}.png`
        ].texture
      );

      stars.position.x = 20;

      this.addRow(stars, 350);

      this._activateChildEntity(anim.popup(stars, 400));
    }

    // add score
    if (!this.level.options.disableScore) {
      const score = crispr.makeText(
        `Score: ${this.level.score} pts (${crispr.proportion(
          this.level.score,
          0,
          crispr.scrap(this.level.options.score.max, this.level),
          0,
          100,
          true
        )}%)`.toUpperCase(),
        {
          ...this.titleConfig,
          fontSize: 85,
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
              crispr.proportion(
                value,
                0,
                crispr.scrap(this.level.options.score.max, this.level),
                0,
                100,
                true
              )
            )}%)`).toUpperCase(),
        })
      );
    }

    this.addCheckRows();

    metrics.logEvent("level_end", {
      level_name: this.level.name,
      success: true,
      results,
    });
  }

  protected _playSound() {
    // Play sound depending on number of stars
    const results = this.level.checkAndReturnsResults();
    this._entityConfig.fxMachine.play(`star_${results.starCount}`);
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
      imageHeight?: number;
      imageAnimationSpeed?: number;
      popupOptions?: Partial<PopupOptions>;
    }
  ) {
    super({
      minimizeOnClose: true,
      withBackground: true,
      withBlackBackground: true,
      closeOnBackgroundClick: true,
      adjustHeight: true,
      ...(_options.popupOptions ?? {}),
    });
  }

  onSetup() {
    //if(this._options.image === this.options.logo)

    this.text = crispr.makeText(this._options.title, {
      fontSize: 150,
      fill: 0xffffff,
      wordWrapWidth: this.width * 0.9,
      wordWrap: true,
    });

    this.content = crispr.makeText(this._options.content, {
      fill: 0xffffff,
      wordWrapWidth: this.width * 0.9,
      wordWrap: true,
    });

    if (this._options.image) {
      if (this._options.image.endsWith(".json")) {
        this.image = util.makeAnimatedSprite(
          this._entityConfig.app.loader.resources[this._options.image]
        );
        this.image.sprite.animationSpeed =
          this._options.imageAnimationSpeed ?? 20 / 60;
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

      if (this._options.imageHeight) {
        const ratio = sprite.width / sprite.height;
        sprite.height = this._options.imageHeight;
        sprite.width = sprite.height * ratio;
      } else {
        const ratio = sprite.height / sprite.width;
        sprite.width = this.width / 3;
        sprite.height = sprite.width * ratio;
      }

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
      withBlackBackground: false,
      adjustHeight: true,
      from: new PIXI.Point(200, 100),
    });
  }

  onSetup() {
    const text = crispr.makeText(this.level.name, {
      fontSize: 150,
      fill: 0xffffff,
    });

    text.position.x = this.center.x;
    text.position.y = 100;

    const score = crispr.makeText(
      `Progress: ${Math.floor(
        this.level.options.score.get(this.level)
      )} / ${crispr.scrap(this.level.options.score.max, this.level)}`,
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
