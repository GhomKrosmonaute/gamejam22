import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as popup from "./popup";
import * as path from "./path";

import * as crispr from "../crispr";
import * as anim from "../animations";

import * as level from "../scenes/level";

/**
 * Emits:
 * - reached()
 */
export type Ring = PIXI.Sprite & { base?: PIXI.Point; index?: number };

export class Gauge extends entity.CompositeEntity {
  private _particles = new PIXI.ParticleContainer(
    3,
    {
      vertices: true,
      position: true,
    },
    5
  );
  private _container = new PIXI.Container();
  private _rings = new PIXI.Container();
  private _text: PIXI.Text;
  private _bar: PIXI.Sprite;
  private _wave: PIXI.TilingSprite;
  private _background: PIXI.Sprite;
  private _barBaseWidth: number;
  private _triggered = false;
  private _lastText: string = "";
  private _statePopup: popup.StatePopup;

  constructor(private _ringCount: number) {
    super();
  }

  get level(): level.Level {
    return this._entityConfig.level;
  }

  _setup() {
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
      this._background = crispr.sprite(this, "images/hud_gauge_background.png");

      this._bar = crispr.sprite(this, "images/hud_gauge_bar.png");

      this._bar.position.set(195, 57);
      this._barBaseWidth = this._bar.width;
    }

    // init wave
    {
      this._wave = new PIXI.TilingSprite(
        this._entityConfig.app.loader.resources["images/hud_wave.png"].texture,
        50,
        this._bar.height
      );
      this._wave.anchor.set(0.5);
      this._wave.position.y = this._bar.y + this._bar.height / 2;
    }

    // particles
    {
      for (let i = 0; i < 4; i++) {
        const particle = crispr.sprite(this, "images/particle.png");
        particle.anchor.set(0.5);
        particle.position.y = this._background.height / 2 + (i - 1) * 10;
        this._particles.addChild(particle);
      }
    }

    // place rings
    for (let i = 0; i < this._ringCount; i++) {
      const ring: Ring = crispr.sprite(
        this,
        "images/hud_gauge_ring_disabled.png"
      );

      const position = new PIXI.Point(
        crispr.proportion(i, -1, this._ringCount, 0, this._barBaseWidth, true),
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
          activatedRing.scale.set(1);
          activatedRing.position.copyFrom(this.base);
          activatedRing.base = new PIXI.Point();
          activatedRing.base.copyFrom(this.base);

          that._rings.removeChild(this);
          that._rings.addChildAt(activatedRing, this.index);

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

    this._text = crispr.makeText("", {
      fill: this.level.options.scoreOptions.color,
      fontSize: 50,
      fontStyle: "italic bold",
      fontFamily: "Alien League",
    });

    this._text.position.set(100, 75);

    this._container.addChild(this._background);
    this._container.addChild(this._bar);
    this._container.addChild(this._wave);
    this._container.addChild(this._particles);
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

    this.setTint(this.level.options.scoreOptions.color);
  }

  _update(frameInfo: entity.FrameInfo) {
    if (
      this.level.options.scoreOptions.get(this.level) <
      this.level.options.scoreOptions.max
    ) {
      const reachedScorePosition = this.reachedScoreXPosition;
      this._rings.children.forEach((ring: Ring) => {
        if (reachedScorePosition >= this.baseXOfBar + ring.base.x) {
          ring.emit("reached");
        }
      });
    }

    const barWidth = this.barWidth;

    if (barWidth > 100) {
      if (this._wave) {
        this._wave.visible = true;
        this._wave.tilePosition.y = Math.cos(frameInfo.playTime / 70) * 10;
      }

      this._particles.visible = true;

      const vector = Math.cos(frameInfo.playTime / 120);
      const invertVector = Math.sin(frameInfo.playTime / 80);
      const vectorFast = Math.cos(frameInfo.playTime / 50);

      this._particles.children.forEach((particle, index) => {
        const even = index % 2 === 0;
        particle.scale.set(0.15 + vectorFast * 0.05);
        particle.position.x = Math.min(
          (index - 1) * 10 +
            barWidth +
            this._bar.position.x +
            (even ? vector : invertVector) * 15,
          this._background.position.x + this._background.width - 125
        );
      });
    } else {
      this._particles.visible = false;
      if (this._wave) this._wave.visible = false;
    }
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
  }

  get bar(): PIXI.Sprite {
    return this._bar;
  }

  get container(): PIXI.Container {
    return this._container;
  }

  refreshValue() {
    const score = this.level.options.scoreOptions.get(this.level);
    this._bar.width = this.barWidth;
    this._text.text = this.level.options.scoreOptions.show(score, this.level);

    const devise = this.level.options.scoreOptions.devise;

    if (devise !== undefined) {
      const resolved =
        typeof devise === "function" ? devise(score, this.level) : devise;
      if (typeof resolved === "string") {
        this._text.text += " " + resolved;
      } else {
        this._text.removeChildren();
        this._text.addChild(resolved);
      }
    }

    if (this._wave)
      this._wave.x = Math.min(
        this.reachedScoreXPosition,
        this._background.position.x + this._background.width - 125
      );

    if (!this._triggered && this._lastText !== this._text.text) {
      this._lastText = this._text.text;
      this._triggered = true;
      this._activateChildEntity(
        anim.bubble(this._text, 1.4, 100, {
          onTop: () => {
            this._triggered = false;
          },
        })
      );
    }

    if (score >= this.level.options.scoreOptions.max && !this.level.finished) {
      this.level.finished = true;
      this.level.options.scoreOptions.set(
        crispr.scrap(this.level.options.scoreOptions.max, this.level),
        this.level
      );
      this.level.finished = true;
      this.level.activate(
        new entity.EntitySequence([
          new entity.WaitingEntity(2000),
          new popup.TerminatedLevelPopup(),
        ])
      );
    }
  }

  setTint(tint: number) {
    this._bar.tint = tint;
    this._particles.children.forEach((child) => {
      if (child instanceof PIXI.Sprite) child.tint = tint;
    });
    this._wave.tint = tint;
    this._text.style.fill = tint;
  }

  get barWidth(): number {
    return crispr.proportion(
      this.level.options.scoreOptions.get(this.level),
      0,
      crispr.scrap(this.level.options.scoreOptions.max, this.level),
      0,
      this._barBaseWidth,
      true
    );
  }

  get baseXOfBar(): number {
    return this._bar.x;
  }

  get reachedScoreXPosition(): number {
    return this.baseXOfBar + this.barWidth;
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
        onStep: (ring) => {
          return anim.bubble(ring, 1.2, 300, {
            onTop: () => {
              options?.forEach?.(ring, ring.index);
            },
          });
        },
      })
    );
  }
}

export class ActionButton extends entity.CompositeEntity {
  public shaker: anim.ShakesManager;
  public container: PIXI.Container;
  public sprite: PIXI.Sprite;
  public disabledSprite: PIXI.Sprite;
  public missingScissorsSprite: PIXI.Sprite;
  public text: PIXI.Text;

  get level(): level.Level {
    return this._entityConfig.level;
  }

  protected _setup() {
    this.container = new PIXI.Container();
    this.shaker = new anim.ShakesManager(this.container);
    this._activateChildEntity(this.shaker);

    this.missingScissorsSprite = crispr.sprite(
      this,
      "images/hud_missing_scissors.png"
    );

    this.missingScissorsSprite.anchor.set(0.5);
    this.missingScissorsSprite.scale.set(0.6);
    this.missingScissorsSprite.visible = false;
    this.missingScissorsSprite.position.set(
      this._entityConfig.app.view.width - 367,
      this._entityConfig.app.view.height - 150
    );

    this.disabledSprite = crispr.sprite(
      this,
      "images/hud_action_button_disabled.png"
    );

    this.disabledSprite.anchor.set(0.5);
    this.disabledSprite.position.set(
      this._entityConfig.app.view.width - 150,
      this._entityConfig.app.view.height - 150
    );

    this.sprite = crispr.sprite(this, this.level.options.actionButtonSprite);

    this.sprite.anchor.set(0.5);
    this.sprite.position.copyFrom(this.disabledSprite.position);

    this._on(this.sprite, "pointertap", () => {
      if (this.level.bonusesManager?.selected) {
        this.level.bonusesManager.selected.abort();
      }
      this._activateChildEntity(this.press());
    });

    this.container.addChild(this.sprite);
    this.container.addChild(this.disabledSprite);

    // this.text = crispr.makeText("GO", {
    //   fill: 0x000000,
    // });
    // this.text.position.set(this.sprite.width / 2, this.sprite.height / 2);
    // this.sprite.addChild(this.text);

    this._entityConfig.container.addChild(this.missingScissorsSprite);
    this._entityConfig.container.addChild(this.container);
  }

  protected _update() {
    const disabled = this.level.isDisablingAnimationInProgress;
    this.sprite.buttonMode = !disabled;
    this.sprite.interactive = !disabled;
    this.sprite.visible = !disabled;
    this.disabledSprite.visible = disabled;
    // this.text.style.fill = !disabled ? "#000000" : "#4e535d";
  }

  protected _teardown() {
    this._entityConfig.container.removeChild(this.missingScissorsSprite);
    this._entityConfig.container.removeChild(this.container);
  }

  public setText(text: path.PathState) {
    this.missingScissorsSprite.visible = text === "missing clips";
    // this.text.style.fontSize = text.length > 6 ? 50 : 70;
    // this.text.text = text;
  }

  public errorAnimation() {
    return new entity.ParallelEntity([
      anim.tweenShaking(this.sprite, 300, 6),
      anim.tweenShaking(this.disabledSprite, 300, 6),
    ]);
  }

  public clickAnimation() {
    const sprite: PIXI.Sprite = crispr.sprite(
      this,
      this.level.options.actionButtonSprite,
      (it) => {
        it.anchor.set(0.5);
        it.position.copyFrom(this.sprite.position);
        it.scale.set(this.sprite.scale.x);
      }
    );
    return new entity.EntitySequence([
      new tween.Tween({
        from: 0,
        to: 1,
        duration: 300,
        easing: easing.easeOutCirc,
        onSetup: () => this.container.addChild(sprite),
        onUpdate: (value) => {
          sprite.scale.set(value + 1);
          sprite.alpha = 1 - value;
        },
        onTeardown: () => this.container.removeChild(sprite),
      }),
    ]);
  }

  private press(): entity.Entity {
    if (this.level.isDisablingAnimationInProgress) {
      return this.errorAnimation();
    }

    if (this.level.options.variant === "zen") {
      if (this.level.path.items.length > 0) {
        return this.level.attemptCrunch();
      }
    } else if (this.level.path.items.length > 0) {
      return this.errorAnimation();
    }

    // Skip case ↓

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
            if (this.level.options.remainingMoves)
              this.level.remainingMovesIndicator.removeOne();
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
      })
    );

    return new entity.ParallelEntity([
      this.clickAnimation(),
      new entity.EntitySequence(context),
    ]);
  }
}

export class RemainingMovesIndicator extends entity.CompositeEntity {
  protected init = false;
  private _count: number;
  private text: PIXI.Text;
  private animation: entity.Entity;
  private position = new PIXI.Point(50, crispr.height - 100);

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
    this.text = crispr.makeText("", {
      align: "right",
      fontSize: 80,
      stroke: "#000000",
      strokeThickness: 5,
      fill: crispr.yellow,
      fontStyle: "bold italic",
      fontFamily: "Alien League",
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
              from: 0xffda6b,
              to: 0xff0000,
              duration: 300,
              onUpdate: (value) => (this.text.tint = value),
              onTeardown: this.updateText.bind(this),
              interpolate: tween.interpolation.color,
            }),
            new tween.Tween({
              from: 0xff0000,
              to: 0xffda6b,
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
    this.text.text = `${this._count} moves remaining`;
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
