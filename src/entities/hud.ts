import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";

import * as popup from "./popup";

import * as crisprUtil from "../crisprUtil";
import * as anim from "../animations";

import * as level from "../scenes/level";

/**
 * Emits:
 * - reached()
 */
export type Ring = PIXI.Sprite & { base?: PIXI.Point; index?: number };

export class Gauge extends entity.CompositeEntity {
  private _container = new PIXI.Container();
  private _rings = new PIXI.Container();
  private _text: PIXI.Text;
  private _bar: PIXI.Sprite;
  private _background: PIXI.Sprite;
  private _barBaseWidth: number;
  private _triggered = false;
  private _value: number = 0;
  private _statePopup: popup.StatePopup;

  constructor(private _ringCount: number, private _maxValue: number) {
    super();
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get bar(): PIXI.Sprite {
    return this._bar;
  }

  get container(): PIXI.Container {
    return this._container;
  }

  /**
   * Set value of gauge bar (value/maxValue)
   * @param {number} value - The new value of gauge bar
   */
  setValue(value: number) {
    // todo: maybe use down for animation
    const down = this._value > value;

    this._value = value;
    this._bar.width = this.getBarWidth();
    this._text.text = Math.floor(this._value) + " pts";
    if (!this._triggered) {
      this._triggered = true;
      this._activateChildEntity(
        anim.bubble(this._text, 1.4, 100, {
          onTop: () => {
            this._triggered = false;
          },
        })
      );
    }
  }

  setTint(tint: number) {
    this._bar.tint = tint;
  }

  getBarWidth(): number {
    return crisprUtil.proportion(
      this._value,
      0,
      this._maxValue,
      0,
      this._barBaseWidth,
      true
    );
  }

  get baseXOfBar(): number {
    return this._bar.x;
  }

  get reachedScorePosition(): number {
    return this.baseXOfBar + this.getBarWidth();
  }

  bubbleRings(options?: {
    delay?: number;
    timeBetween?: number;
    forEach?: (ring: Ring, index: number) => any;
    callback?: () => any;
  }) {
    this._activateChildEntity(
      anim.sequenced({
        waitForAllSteps: true,
        delay: options.delay ?? 200,
        timeBetween: options.timeBetween ?? 150,
        items: this._rings.children as Ring[],
        callback: () => options.callback?.(),
        onStep: (ring, index) => {
          return anim.bubble(ring, 1.2, 300, {
            onTop: () => {
              options?.forEach?.(ring, index);
            },
          });
        },
      })
    );
  }

  _setup() {
    // todo: set clean position
    this._container.position.set(100, 50);

    // add popup
    this._statePopup = new popup.StatePopup();

    this._container.interactive = true;
    this._container.buttonMode = true;
    this._on(this._container, "pointerup", () => {
      if (
        !this._statePopup.isSetup &&
        !this.level.isDisablingAnimationInProgress
      ) {
        this._activateChildEntity(this._statePopup, entity.extendConfig({}));
      }
    });

    // assign sprites
    {
      this._background = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[
          "images/hud_gauge_background.png"
        ].texture
      );

      this._bar = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[
          "images/hud_gauge_bar.png"
        ].texture
      );

      this._bar.position.set(195, 57);
      this._barBaseWidth = this._bar.width;
    }

    // place rings
    for (let i = 0; i < this._ringCount; i++) {
      const ring: Ring = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[
          "images/hud_gauge_ring_disabled.png"
        ].texture
      );

      const position = new PIXI.Point(
        crisprUtil.proportion(
          i,
          -1,
          this._ringCount,
          0,
          this._barBaseWidth,
          true
        ),
        ring.height * 0.5
      );

      ring.index = i;
      ring.anchor.set(0.5);
      ring.scale.set(0);
      ring.position.copyFrom(position);
      ring.base = new PIXI.Point();
      ring.base.copyFrom(position);

      const that = this;

      this._once(
        ring,
        "reached",
        function (this: Ring) {
          that._entityConfig.fxMachine.play("score_ring");

          const activatedRing: Ring = new PIXI.Sprite(
            that._entityConfig.app.loader.resources[
              "images/hud_gauge_ring.png"
            ].texture
          );

          activatedRing.index = this.index;
          activatedRing.anchor.set(0.5);
          activatedRing.scale.set(0);
          activatedRing.position.copyFrom(this.base);
          activatedRing.base = new PIXI.Point();
          activatedRing.base.copyFrom(this.base);

          that._rings.removeChild(this);
          that._rings.addChild(activatedRing);

          that.level.options.gaugeRings[activatedRing.index](
            that.level,
            activatedRing
          );
          that.level.emitLevelEvent("ringReached", activatedRing);
          that._activateChildEntity(
            anim.tweenShaking(activatedRing, 2000, 10, 0)
          );
        }.bind(ring)
      );

      this._rings.addChild(ring);
    }

    this._text = crisprUtil.makeText("", { fill: "#ffffff", fontSize: 40 });
    this._text.position.set(115, 75);

    this._container.addChild(this._background);
    this._container.addChild(this._bar);
    this._container.addChild(this._rings);
    this._container.addChild(this._text);

    this._rings.position.x = this.baseXOfBar;

    this._entityConfig.container.addChild(this._container);

    this._activateChildEntity(
      anim.sequenced({
        delay: 500,
        timeBetween: 150,
        items: this._rings.children as Ring[],
        waitForAllSteps: true,
        onStep: (ring) => anim.popup(ring, 200),
      })
    );

    // setup shockwave on max score is reached
    this._on(this.level, "maxScoreReached", () => {
      this.bubbleRings({
        timeBetween: 100,
        forEach: (ring: Ring) => {
          //todo: anim ?
        },
      });
    });

    this.level.onLevelEvent("scoreUpdated", this.setValue.bind(this));

    this.setValue(0);
  }

  _update() {
    if (this._value < this._maxValue) {
      const reachedScorePosition = this.reachedScorePosition;
      this._rings.children.forEach((ring: Ring) => {
        if (reachedScorePosition >= this.baseXOfBar + ring.base.x) {
          ring.emit("reached");
        }
      });
    }
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
  }
}

export class ActionButton extends entity.CompositeEntity {
  public shaker: anim.ShakesManager;
  public container: PIXI.Container;
  public sprite: PIXI.Sprite;
  public disabledSprite: PIXI.Sprite;
  public text: PIXI.Text;

  get level(): level.Level {
    return this._entityConfig.level;
  }

  protected _setup() {
    this.container = new PIXI.Container();
    this.shaker = new anim.ShakesManager(this.container);
    this._activateChildEntity(this.shaker);

    this.disabledSprite = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        "images/hud_action_button_disabled.png"
      ].texture
    );

    this.disabledSprite.anchor.set(0.5);
    this.disabledSprite.position.set(
      this._entityConfig.app.view.width - 150,
      this._entityConfig.app.view.height - 150
    );

    this.sprite = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        "images/hud_action_button.png"
      ].texture
    );

    this.sprite.anchor.set(0.5);
    this.sprite.position.copyFrom(this.disabledSprite.position);

    this._on(this.sprite, "pointerup", () => {
      const go = this.press();
      if (go) this._activateChildEntity(go);
    });
    this.container.addChild(this.sprite);

    // this.text = crisprUtil.makeText("GO", {
    //   fill: 0x000000,
    // });
    // this.text.position.set(this.sprite.width / 2, this.sprite.height / 2);
    // this.sprite.addChild(this.text);

    this._entityConfig.container.addChild(this.disabledSprite);
    this._entityConfig.container.addChild(this.sprite);
  }

  protected _update() {
    const disabled = this.level.isDisablingAnimationInProgress;
    this.sprite.buttonMode = !disabled;
    this.sprite.interactive = !disabled;
    this.sprite.visible = !disabled;
    this.disabledSprite.visible = disabled;
    // this.text.style.fill = !disabled ? "#000000" : "#4e535d";
  }

  protected _teardown() {}

  public setText(text: string) {
    // this.text.style.fontSize = text.length > 6 ? 50 : 70;
    // this.text.text = text;
  }

  private press(): entity.Entity {
    if (this.level.isDisablingAnimationInProgress) {
      return anim.tweenShaking(this.sprite, 300, 6);
    }

    if (this.level.options.variant === "zen") {
      if (this.level.path.items.length > 0) {
        return this.level.attemptCrunch();
      }
    } else if (this.level.path.items.length > 0) {
      return anim.tweenShaking(this.sprite, 300, 6);
    }

    const context: entity.Entity[] = [
      new entity.FunctionCallEntity(() => {
        this._entityConfig.fxMachine.play("skip");

        this.level.disablingAnimation("goButton.press", true);
      }),
    ];

    switch (this.level.options.variant) {
      case "turn":
        // ? has holes
        //    : => fill holes
        if (this.level.grid.containsHoles()) {
          context.push(this.level.fillHoles(), this.level.infect());
        } else {
          context.push(
            this.level.sequenceManager.dropSequences(1),
            this.level.infect()
          );
        }
        break;
      case "zen":
        context.push(
          this.level.sequenceManager.dropSequences(),
          this.level.removeHalfScore(),
          new entity.FunctionCallEntity(() => {
            this.level.zenMovesIndicator.removeOne();
          })
        );
        break;
      case "fall":
        // => down all sequences
        // => infect
        context.push(
          this.level.sequenceManager.dropSequences(),
          this.level.infect()
        );
        break;
    }

    context.push(
      new entity.FunctionCallEntity(() => {
        this.level.disablingAnimation("goButton.press", false);
        this.level.refresh();
        this.level.checkGameOverByInfection();
      })
    );

    return new entity.EntitySequence(context);
  }
}

export class ZenMovesIndicator extends entity.CompositeEntity {
  protected init = false;
  private _count: number;
  private text: PIXI.Text;
  private animation: entity.Entity;
  private position = new PIXI.Point(50, crisprUtil.height - 100);

  get level(): level.Level {
    return this._entityConfig.level;
  }

  get count(): number {
    return this._count;
  }

  set count(n: number) {
    this._count = n;
    this.updateText();
  }

  protected _setup() {
    this._count = 0;
    this.text = crisprUtil.makeText("", {
      align: "right",
      fontSize: 100,
      stroke: 0xffffff,
      strokeThickness: 10,
    });
    this.resetText();
    this.updateText();
    this._entityConfig.container.addChild(this.text);

    this._activateChildEntity(
      anim.sequenced({
        timeBetween: 100,
        items: this.level.options.zenMoves,
        onStep: () => {
          this.addOne();
        },
        callback: () => {
          this.init = true;
        },
      })
    );
  }

  protected _teardown() {
    this._entityConfig.container.removeChild(this.text);
    this.init = false;
    this.text = null;
  }

  addOne() {
    if (!this.isSetup) return;

    this._count++;
    this.animate(
      anim.bubble(this.text, 1.2, 150, { onTop: this.updateText.bind(this) })
    );
  }

  removeOne() {
    if (!this.isSetup) return;

    this._count--;
    if (this._count === 0) {
      this.level.emitLevelEvent("outOfZenMoves");
    } else {
      this.animate(
        new entity.ParallelEntity([
          anim.tweenShaking(this.text, 600, 10, 0),
          new entity.EntitySequence([
            new tween.Tween({
              from: 0xffffff,
              to: 0xff0000,
              duration: 300,
              onUpdate: (value) => (this.text.tint = value),
              onTeardown: this.updateText.bind(this),
              interpolate: tween.interpolation.color,
            }),
            new tween.Tween({
              from: 0xff0000,
              to: 0xffffff,
              duration: 300,
              onUpdate: (value) => (this.text.tint = value),
              interpolate: tween.interpolation.color,
            }),
          ]),
        ])
      );
    }
  }

  private updateText() {
    this.text.text = `Rest ${this._count} moves`;
  }

  private resetText() {
    this.text.scale.set(1);
    this.text.tint = 0xffffff;
    this.text.position.copyFrom(this.position);
    this.text.anchor.x = 0;
  }

  private animate(e: entity.Entity) {
    if (this.animation && this.animation.isSetup) {
      this._deactivateChildEntity(this.animation);
      this.resetText();
    }

    this.animation = e;

    this._activateChildEntity(this.animation);
  }
}
