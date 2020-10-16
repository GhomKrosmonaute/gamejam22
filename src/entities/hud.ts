import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";

import * as popup from "./popup";

import * as crisprUtil from "../crisprUtil";
import * as anim from "../animations";

import * as level from "../scenes/level";

/**
 * Emits:
 * - reached()
 */
export type Ring = PIXI.Sprite & { base?: PIXI.Point };

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

  /**
   * Set value of gauge bar (value/maxValue)
   * @param {number} value - The new value of gauge bar
   */
  setValue(value: number) {
    this._value = value;
    this._bar.width = this.getBarWidth();
    this._bar.position.set(this.getBarPosition(), 0);
    this._text.text =
      new Intl.NumberFormat("en", { maximumSignificantDigits: 2 }).format(
        Math.floor(this._value)
      ) + " pts";
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

  getBarPosition(): number {
    return crisprUtil.proportion(this._value, 0, this._maxValue, 200, 0, true);
  }

  get reachedScorePosition(): number {
    return this.getBarPosition() + this.getBarWidth();
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
    this._container.position.set(-30, -25);

    // add popup
    this._statePopup = new popup.StatePopup();

    this._container.interactive = true;
    this._container.buttonMode = true;
    this._on(this._container, "pointerup", () => {
      if (this._statePopup.isSetup) return;
      this._activateChildEntity(this._statePopup, entity.extendConfig({}));
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

      this._barBaseWidth = this._bar.width;
    }

    // place rings
    for (let i = 0; i < this._ringCount; i++) {
      const ring: Ring = new PIXI.Sprite(
        this._entityConfig.app.loader.resources[
          "images/hud_gauge_ring.png"
        ].texture
      );

      const position = new crisprUtil.BetterPoint(
        crisprUtil.proportion(i, -1, this._ringCount, 0, 450, true),
        ring.height * 0.5
      );

      ring.anchor.set(0.5);
      ring.scale.set(0);
      ring.position.copyFrom(position);
      ring.base = new PIXI.Point();
      ring.base.copyFrom(position);

      this._once(ring, "reached", () => {
        this.level.emit(
          "ringReached",
          ring,
          this._rings.children.indexOf(ring)
        );
      });

      this._rings.addChild(ring);
    }

    this._text = crisprUtil.makeText("", { fill: 0x000000, fontSize: 40 });
    this._text.position.set(110, 110);

    this._container.addChild(this._background);
    this._container.addChild(this._bar);
    this._container.addChild(this._rings);
    this._container.addChild(this._text);

    this._rings.position.x = 200;

    this._entityConfig.container.addChild(this._container);

    this._activateChildEntity(
      anim.sequenced({
        delay: 200,
        timeBetween: 150,
        items: this._rings.children as Ring[],
        onStep: (ring) => anim.popup(ring, 200),
      })
    );

    this.setValue(0);
  }

  _update() {
    if (this._value < this._maxValue) {
      const reachedScorePosition = this.reachedScorePosition;
      this._rings.children.forEach((ring: Ring, i) => {
        if (
          reachedScorePosition >=
          ring.base.x + 200 + (ring.width / 2) * (i / 2)
        ) {
          ring.emit("reached");
        }
      });
    }
  }

  _teardown() {
    this._entityConfig.container.removeChild(this._container);
  }
}

export class GoButton extends entity.CompositeEntity {
  public shaker: anim.ShakesManager;
  public container: PIXI.Container;
  public sprite: PIXI.Sprite;
  public text: PIXI.Text;

  get level(): level.Level {
    return this._entityConfig.level;
  }

  protected _setup() {
    this.container = new PIXI.Container();
    this.shaker = new anim.ShakesManager(this.container);
    this._activateChildEntity(this.shaker);

    this.sprite = new PIXI.Sprite(
      this._entityConfig.app.loader.resources[
        "images/hud_go_button.png"
      ].texture
    );
    this.sprite.position.set(
      this._entityConfig.app.view.width * 0.785,
      this._entityConfig.app.view.height * 0.887
    );
    this.sprite.interactive = true;
    this.sprite.buttonMode = true;
    this._on(this.sprite, "pointerup", this._onGo);
    this.container.addChild(this.sprite);

    this.text = crisprUtil.makeText("GO", {
      fill: 0x000000,
    });
    this.text.position.set(this.sprite.width / 2, this.sprite.height / 2);
    this.sprite.addChild(this.text);

    this._entityConfig.container.addChild(this.sprite);
  }

  protected _update() {
    const disabled = this.level.isDisablingAnimationInProgress;
    this.sprite.buttonMode = !disabled;
    this.sprite.interactive = !disabled;
    this.text.style.fill = !disabled ? "#000000" : "#4e535d";
  }

  protected _teardown() {}

  public setText(text: string) {
    this.text.style.fontSize = text.length > 6 ? 50 : 70;
    this.text.text = text;
  }

  private _onGo(): void {
    if (this.level.isDisablingAnimationInProgress) return;

    if (this.level.options.variant === "long") {
      if (this.level.path.items.length > 0) {
        return this.level.attemptCrunch();
      }
    } else if (this.level.path.items.length > 0) return;

    if (
      this.level.options.variant === "turnBased" ||
      this.level.options.variant === "long"
    ) {
      if (this.level.grid.containsHoles()) {
        this.level.regenerate();
      } else {
        // TODO: add confirm dialog "Are you sure?"
        this.level.disablingAnimations.add("goButton._onGo");

        this._activateChildEntity(
          new entity.EntitySequence([
            new entity.FunctionCallEntity(() => {
              this.level.grid.regenerate(
                Math.ceil(this.level.grid.nucleotides.length / 2),
                (n) => n.state === "present" && n.type !== "scissors"
              );
            }),
            new entity.WaitingEntity(1200),
            new entity.FunctionCallEntity(() => {
              this.level.endTurn();
              this.level.refresh();
              this.level.disablingAnimations.delete("goButton._onGo");
            }),
          ])
        );
      }
    } else {
      // As if the sequence dropped all the way down
      this.level.sequenceManager.dropSequences();
      this.level.onInfection();
    }
  }
}
