import * as PIXI from "pixi.js";

import * as entity from "booyah/src/entity";

import * as crisprUtil from "../crisprUtil";
import * as anim from "../animations";

/**
 * Emits:
 * - reached()
 */
export type Ring = PIXI.Sprite & { base?: PIXI.Point };

/**
 * Emits:
 * - ringReached( ring: Ring, index: number )
 */
export class Gauge extends entity.CompositeEntity {
  private _container = new PIXI.Container();
  private _rings = new PIXI.Container();
  private _text: PIXI.Text;
  private _bar: PIXI.Sprite;
  private _background: PIXI.Sprite;
  private _barBaseWidth: number;
  private _triggered = false;
  private _value: number = 0;

  constructor(private _ringCount: number, private _maxValue: number) {
    super();
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
      this._value > 999
        ? Math.floor(value / 1000) + "k"
        : Math.floor(this._value) + " pts";
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
    anim.sequenced({
      delay: options.delay ?? 200,
      timeBetween: options.timeBetween ?? 150,
      sequence: this._rings.children as Ring[],
      callback: () => options.callback?.(),
      onStep: (resolve, ring, index) => {
        this._activateChildEntity(
          anim.bubble(ring, 1.2, 300, {
            onTop: () => {
              options?.forEach?.(ring, index);
              resolve();
            },
          })
        );
      },
    });
  }

  _setup() {
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
        this.emit("ringReached", ring, this._rings.children.indexOf(ring));
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

    anim.sequenced({
      delay: 200,
      timeBetween: 150,
      sequence: this._rings.children as Ring[],
      onStep: (resolve, ring) => {
        this._activateChildEntity(anim.popup(ring, 200, resolve));
      },
    });
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
