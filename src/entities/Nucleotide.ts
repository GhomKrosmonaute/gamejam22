import * as PIXI from "pixi.js";
import * as _ from "underscore";

import * as entity from "booyah/src/entity";
import * as util from "booyah/src/util";
import * as tween from "booyah/src/tween";
import * as easing from "booyah/src/easing";

import * as utils from "../utils";
import * as game from "../game";

export type State = "missing" | "present" | "infected";

/** Represent a nucleotide */
export default class Nucleotide extends entity.ParallelEntity {
  public type: utils.NucleotideType = "normal";
  public colorName: utils.ColorName = utils.getRandomColorName();
  public isHovered = false;
  public filterFlags: { [key: string]: boolean } = {};

  private _container: PIXI.Container;
  private _state: State;
  private mainSprite: PIXI.AnimatedSprite | PIXI.Sprite = null;
  private secondarySprite: PIXI.Sprite = null;
  private _radius: number;
  private floating: { x: boolean; y: boolean } = { x: false, y: false };
  private floatingShift = new PIXI.Point();
  private floatingSpeed = new PIXI.Point();
  private floatingAmplitude = new PIXI.Point();
  private animation: entity.Entity = null;

  constructor(
    public readonly fullRadius: number,
    public position = new PIXI.Point(),
    public rotation = 0
  ) {
    super();

    this._radius = fullRadius;
  }

  _setup() {
    this._state = "missing";

    this._container = new PIXI.Container();
    this._container.rotation = this.rotation;
    this._container.position.copyFrom(this.position);
    this._refreshScale();

    this.entityConfig.container.addChild(this._container);
  }

  _update(frameInfo: entity.FrameInfo) {
    for (const vector in this.floating) {
      const v = vector as "x" | "y";
      if (this.floating[v]) {
        const cos = Math.cos(
          this.floatingShift[v] +
            frameInfo.timeSinceStart * this.floatingSpeed[v]
        );
        const add = cos * this.floatingAmplitude[v];
        this._container[v] = this.position[v] + add * 200;
      }
    }
  }

  _teardown() {
    this.entityConfig.container.removeChild(this._container);
  }

  // TODO: move to a private function system that just sets highlight mode or not
  setFilter(name: string, value: boolean) {
    if (!this.mainSprite) return;

    this.filterFlags[name] = value;
    this.mainSprite.filters = Object.entries(this.filterFlags)
      .filter((e) => e[1])
      .map((e) => game.filters[e[0]]);
  }

  get infected(): boolean {
    return this._state === "infected";
  }

  setFloating(
    vector: "x" | "y",
    speed = 0.0005,
    amplitude = 0.06,
    shift = Math.random() * 10
  ) {
    this.floating[vector] = true;
    this.floatingShift[vector] = shift;
    this.floatingSpeed[vector] = speed;
    this.floatingAmplitude[vector] = amplitude;
  }

  get width(): number {
    return 2 * this.radius;
  }

  get height(): number {
    return Math.sqrt(3) * this.radius;
  }

  get dist(): PIXI.Point {
    return new PIXI.Point(this.width * (3 / 4), this.height);
  }

  get state(): State {
    return this._state;
  }
  set state(newState: State) {
    // Remove previous graphics
    if (this.mainSprite) {
      this._container.removeChild(this.mainSprite);
      this.mainSprite = null;
    }
    if (this.secondarySprite) {
      this._container.removeChild(this.secondarySprite);
      this.secondarySprite = null;
    }

    if (newState === "missing") {
      // TODO: do animation

      this.mainSprite = new PIXI.Sprite(
        this.entityConfig.app.loader.resources["images/hole.png"].texture
      );
      this.mainSprite.anchor.set(0.5, 0.5);
      this._container.addChild(this.mainSprite);
    } else if (newState === "infected") {
      // TODO: do animation

      this.mainSprite = new PIXI.Sprite(
        this.entityConfig.app.loader.resources[
          `images/infection_${this.colorName}.png`
        ].texture
      );
      this.mainSprite.anchor.set(0.5, 0.5);

      this._container.addChild(this.mainSprite);
    } else if (this._state === "missing") {
      // Create animated sprite
      this.mainSprite = this._createAnimatedSprite();
      this._container.addChild(this.mainSprite);
      this._refreshScale();

      // Trigger "generation" animation
      const radiusTween = new tween.Tween({
        obj: this,
        property: "radius",
        from: 0,
        to: this.fullRadius,
        easing: easing.easeOutBounce,
      });
      this.animation = radiusTween;
      this.addEntity(this.animation);
    }

    this._state = newState;
  }

  private _createAnimatedSprite(): PIXI.AnimatedSprite {
    let animatedSprite: PIXI.AnimatedSprite;
    if (this.type === "normal") {
      animatedSprite = util.makeAnimatedSprite(
        this.entityConfig.app.loader.resources[
          "images/nucleotide_" + this.colorName + ".json"
        ]
      );
      animatedSprite.animationSpeed = 25 / 60;
      // Start on a random frame
      animatedSprite.gotoAndPlay(_.random(animatedSprite.totalFrames));
    } else if (this.type === "scissors") {
      animatedSprite = util.makeAnimatedSprite(
        this.entityConfig.app.loader.resources["images/scissors.json"]
      );
      animatedSprite.animationSpeed = 25 / 60;
      // Start on a random frame
      animatedSprite.gotoAndPlay(_.random(animatedSprite.totalFrames));
    } else {
      throw new Error("Unhandled type");
    }

    animatedSprite.anchor.set(0.5, 0.5);

    return animatedSprite;
  }

  static getNucleotideDimensionsByRadius(radius: number) {
    const width = 2 * radius;
    const height = Math.sqrt(3) * radius;
    const dist = new PIXI.Point(width * (3 / 4), height);
    return { width, height, dist };
  }

  toString(): string {
    return this.colorName;
  }

  get radius(): number {
    return this._radius;
  }
  set radius(radius: number) {
    this._radius = radius;

    this._refreshScale();
  }

  private _refreshScale(): void {
    // Native sprite size is 136 x 129 px
    const scale = (0.85 * this.width) / 136;
    this._container.scale.set(scale);
  }
}
